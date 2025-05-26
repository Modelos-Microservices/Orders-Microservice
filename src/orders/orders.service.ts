import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/common/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { StatusOrderDto } from './dto/status-order.dto';
import { NATS_SERVICE, PRODUCT_SERVICE } from 'src/conf/services';
import { firstValueFrom } from 'rxjs';
import { OrderWithProducts } from './interfaces/order-with-products.interface';
import { PaidOrderDto } from './dto/paid-order.dto';
import { OrderStatusList } from './enum/order.enum';
import { OrderStatus } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { DeleteOrderItemDto } from './dto/delete-order-item.dto';


@Injectable()
export class OrdersService {

  constructor(private readonly prisma: PrismaService, @Inject(NATS_SERVICE) private readonly client: ClientProxy) { }

  async create(createOrderDto: CreateOrderDto) {
    //hacemos la comporbación de los productos
    const ids: number[] = createOrderDto.items.map((item) => { return item.productId })
    const { user_id } = createOrderDto
    try {
      const products: any[] = await firstValueFrom(this.client.send({ cmd: 'validate_products' }, ids))
      const total_amount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find((product) => product.id === orderItem.productId).price;
        return price * orderItem.quantity + acc
      }, 0)

      const totalItems = createOrderDto.items.reduce((acc, orderitem) => {
        return acc + orderitem.quantity
      }, 0)

      const order = await this.prisma.order.create({
        data: {
          total_amount: total_amount,
          totalItems: totalItems,
          user_id: user_id,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => {
                return ({
                  price: products.find(product => product.id === orderItem.productId).price * orderItem.quantity,
                  productId: orderItem.productId,
                  quantity: orderItem.quantity
                })
              })
            }
          }
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            }
          }
        }
      })
      return { ...order, OrderItem: order.OrderItem.map((orderItem) => { return ({ ...orderItem, productName: products.find(product => product.id === orderItem.productId).name }) }) }
    } catch (error) {
      throw new RpcException(error)
    }


  }

  async findAll(pagination: OrderPaginationDto): Promise<Object> {
    const { page, limit } = pagination
    const totalOrders = await this.prisma.order.count({ where: { status: pagination.status } })

    if (totalOrders === 0 && pagination.status) {
      throw new RpcException({ status: 404, message: `There is no orders with status:${pagination.status}` })
    }

    const lastPage = Math.ceil(totalOrders / limit)

    return {
      meta: {
        actualPage: page,
        totalOrders: totalOrders,
        lastPage: lastPage
      },
      data: await this.prisma.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { status: pagination.status }
      })
    }
  }

  async getAllReceipts(pagination: PaginationDto) {
    const { page, limit } = pagination
    const totalRecipts = await this.prisma.orderReceip.count()
    if (totalRecipts === 0) {
      throw new RpcException({ status: 404, message: `There is no receipts available` })
    }

    const lastPage = Math.ceil(totalRecipts / limit)

    return {
      meta: {
        actualPage: page,
        totalOrders: totalRecipts,
        lastPage: lastPage
      },
      data: await this.prisma.orderReceip.findMany({
        skip: (page - 1) * limit,
        take: limit,
      })
    }
  }


  async findOndeOrder(id:string){
    const order = await this.prisma.order.findUnique({ where: { id } })
    if (!order) {
      throw new RpcException({ status: HttpStatus.NOT_FOUND, message: `Order with id:${id} not found` })
    }
    return order
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } })
    if (!order) {
      throw new RpcException({ status: HttpStatus.NOT_FOUND, message: `Order with id:${id} not found` })
    }
    const orderItems = await this.prisma.orderItem.findMany({ where: { orderId: order.id } })
    const ids = orderItems.map(item => { return item.productId })
    const products: any[] = await firstValueFrom(this.client.send({ cmd: 'validate_products' }, ids))
    const finalOrderItems = orderItems.map(orderItem => { return ({ ...orderItem, productName: products.find(product => product.id === orderItem.productId).name }) })
    return { order, finalOrderItems }
  }

  async changeOrderStatus(statusOrderDto: StatusOrderDto) {
    const { id, status } = statusOrderDto
    const order = await this.findOne(statusOrderDto.id)
    if (order.order.status === status) {
      return order
    }
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status: status }
    })
    return updatedOrder
  }

  async createPaymentSession(order: OrderWithProducts) {
    const paymentSession = await firstValueFrom(this.client.send({ cmd: 'create.payment.session' },
      {
        orderId: order.id,
        currency: 'usd',//cop
        items: order.OrderItem.map(item => { return ({ name: item.productName, price: item.price, quantity: item.quantity }) })
        //items: [{name: 'Prudcto', price:100, quantity:2}]
      }))
    return paymentSession
  }

  async paidOrder(paidOrderDto: PaidOrderDto) {
    //la idea de esto es cambiar el estado de la order que se acaba de pagar a Paid, crear un nuevo resgistro
    //en la tabla de recibos y relacionarla con la tabla de orderres

    //actualizar order
    const order = await this.prisma.order.findUnique({ where: { id: paidOrderDto.orderId } })
    if (!order) {
      throw new RpcException({ status: HttpStatus.NOT_FOUND, message: `Product with id:${paidOrderDto.orderId} not found` })
    }
    const updatedOrder = await this.prisma.order.update({
      where: { id: paidOrderDto.orderId },
      data: {
        status: OrderStatus.PAID,
        paid: true,
        paidAt: new Date(),
        stripeChargeID: paidOrderDto.stripePaymentId,

        //Creación del recivo
        OrderReceip: {
          create: {
            id: paidOrderDto.stripePaymentId,
            receipUrl: paidOrderDto.recipeUrl
          }
        }

      }
    })

    return updatedOrder

  }


  /*Nuevos metodos para operar con las ordenes */

  public async addProduct(createOrderItemDto: CreateOrderItemDto) {
    const { productId, quantity, user_id } = createOrderItemDto

    let total_amount: number = 0
    let product_price: number = 0
    let product: any
    //1. comprobamos la existencia de ese producto y obtenemos el precio 
    try {
      product = await firstValueFrom(this.client.send({ cmd: 'get_one_product' }, { id: productId }))
      total_amount = product.price * quantity
      product_price = product.price
    } catch (error) {
      console.log(error)
      throw new RpcException({ status: 404, message: 'Product Not found Please Verify the Id' })
    }

    if (quantity > product.stock) {
      throw new RpcException({ status: 404, message: 'We are sorry there is not enough units of this product' })
    }

    //2. Comprobamos si el usuario tiene una order con estado PENDING
    const order = await this.prisma.order.findFirst({
      where: {
        user_id: user_id,
        status: 'PENDING'
      },
      include: {
        OrderItem: true, // <-- esto trae los items relacionados
      },
    });


    //2.1 En caso de que existe la modificamos 
    if (order) {

      //Comprobamos si el producto que se quiere agreagar ya esta en la orden dada
      const item = order.OrderItem.find(i => i.productId === productId);

      if (item) {
        throw new RpcException({
          status: 404,
          message: 'This product is alredy in the order.',
        });
      }

      const updatedOrder = await this.prisma.$transaction([
        // Insertamos el nuevo OrderItem
        this.prisma.orderItem.create({
          data: {
            productId,
            quantity,
            price: product_price,
            orderId: order.id, // aquí relacionamos el OrderItem con la orden existente
          },
        }),

        // Actualizamos la orden con nuevos totales
        this.prisma.order.update({
          where: { id: order.id },
          data: {
            total_amount: order.total_amount + total_amount,
            totalItems: order.totalItems + quantity,
          },
        }),
      ]);

      return updatedOrder

    } else {
      //2.2 En caso de que no exista la creamos
      const newOrder = await this.prisma.order.create({
        data: {
          total_amount: total_amount,
          totalItems: quantity,
          user_id: user_id,
          OrderItem: {
            createMany: {
              data:
              {
                price: product_price,
                productId: productId,
                quantity: quantity
              }

            }
          }
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            }
          }
        }
      })

      return newOrder
    }
  }


  public async PayOrder(user_id: string) {

    //1.Primeramente vamos comprobar si el usuario tiene una order que este disponible para ser pagada
    const order = await this.prisma.order.findFirst({
      where: {
        user_id,
        status: 'PENDING',
      },
      include: {
        OrderItem: true, // <-- esto trae los items relacionados
      },
    });


    if (!order) {
      throw new RpcException({ status: 404, message: 'This User does not have a order to by paid' })
    }

    //2. obtenemos todos los order items de esa orde

    //2.1 obtenemos los ids de los productos 

    const ids = order.OrderItem.map(orderItem => orderItem.productId)
    const products: any[] = await firstValueFrom(this.client.send({ cmd: 'validate_products' }, ids))


    const data = { ...order, OrderItem: order.OrderItem.map((orderItem) => { return ({ ...orderItem, productName: products.find(product => product.id === orderItem.productId).name }) }) }

    const payment = await this.createPaymentSession(data)

    return { order, payment }


  }

  public async removeProduct(deleteOrderItemDto: DeleteOrderItemDto) {

    const { user_id, productId } = deleteOrderItemDto
    // 1. Buscar orden PENDING del usuario
    const order = await this.prisma.order.findFirst({
      where: {
        user_id,
        status: 'PENDING',
      },
      include: {
        OrderItem: true, // para acceder directamente a los productos
      },
    });

    if (!order) {
      throw new RpcException({
        status: 404,
        message: 'This user does not have a pending order.',
      });
    }

    // 2. Buscar si el producto está en la orden
    const item = order.OrderItem.find(i => i.productId === productId);

    if (!item) {
      throw new RpcException({
        status: 404,
        message: 'This product is not in the order.',
      });
    }

    // 3. Eliminar el producto (OrderItem) y actualizar la orden
    await this.prisma.$transaction([
      this.prisma.orderItem.delete({
        where: {
          id: item.id,
        },
      }),

      this.prisma.order.update({
        where: { id: order.id },
        data: {
          total_amount: order.total_amount - item.price * item.quantity,
          totalItems: order.totalItems - item.quantity,
        },
      }),
    ]);

    return {
      message: 'Product removed from order',
      removedProductId: productId,
    };
  }

  public async getUserCart(user_id: string) {
    //1. Obtenemos el Carrito del usuario en este caso una orden de este usuario en pendiente
    const order = await this.prisma.order.findFirst({
      where: {
        user_id: user_id,
        status: 'PENDING'
      },
      include: {
        OrderItem: true, // <-- esto trae los items relacionados
      },
    });

    if(!order){
      return null
    }

    const ids = order.OrderItem.map(orderItem => orderItem.productId);
    const products: any[] = await firstValueFrom(
      this.client.send({ cmd: 'validate_products' }, ids)
    );

    const data = {
      ...order,
      OrderItem: order.OrderItem.map(orderItem => ({
        ...orderItem,
        productName: products.find(product => product.id === orderItem.productId)?.name,
        productImg: products.find(product => product.id === orderItem.productId)?.imageUrl,
      })),
    };

    return data


  }


  public async updateProduct(updateOrderItemDto: UpdateOrderItemDto) {
    const { user_id, productId, newQuantity } = updateOrderItemDto
    // 1. Buscar la orden PENDING
    const order = await this.prisma.order.findFirst({
      where: {
        user_id,
        status: 'PENDING',
      },
      include: {
        OrderItem: true,
      },
    });

    if (!order) {
      throw new RpcException({
        status: 404,
        message: 'User has no pending order.',
      });
    }

    const product: any = await firstValueFrom(this.client.send({ cmd: 'get_one_product' }, { id: productId }))

    if (newQuantity > product.stock) {
      throw new RpcException({ status: 404, message: `We are sorry. There is not enough units of this product we currently have ${product.stock}` })
    }
    // 2. Buscar el producto en los OrderItems
    const item = order.OrderItem.find(i => i.productId === productId);

    if (!item) {
      throw new RpcException({
        status: 404,
        message: 'Product not found in order.',
      });
    }

    if (newQuantity <= 0) {
      throw new RpcException({
        status: 400,
        message: 'Quantity must be greater than 0.',
      });
    }

    // 3. Calcular diferencias
    const quantityDiff = newQuantity - item.quantity;
    const amountDiff = item.price * quantityDiff;

    // 4. Actualizar el OrderItem y la orden en una transacción
    await this.prisma.$transaction([
      this.prisma.orderItem.update({
        where: { id: item.id },
        data: {
          quantity: newQuantity,
        },
      }),

      this.prisma.order.update({
        where: { id: order.id },
        data: {
          totalItems: order.totalItems + quantityDiff,
          total_amount: order.total_amount + amountDiff,
        },
      }),
    ]);

    const updatedOrder = await this.prisma.order.findFirst({
      where: {
        id: order.id,
      },
      include: {
        OrderItem: true,
      },
    });

    if (!updatedOrder) { throw new RpcException('No way') }

    // Validamos productos desde microservicio
    const ids = updatedOrder.OrderItem.map(orderItem => orderItem.productId);
    const products: any[] = await firstValueFrom(
      this.client.send({ cmd: 'validate_products' }, ids)
    );

    // Enriquecemos con nombres de producto
    const data = {
      ...updatedOrder,
      OrderItem: updatedOrder.OrderItem.map(orderItem => ({
        ...orderItem,
        productName: products.find(product => product.id === orderItem.productId)?.name,
      })),
    };

    return data
  }
}
