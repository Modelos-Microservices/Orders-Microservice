import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/common/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { StatusOrderDto } from './dto/status-order.dto';
import { NATS_SERVICE, PRODUCT_SERVICE } from 'src/conf/services';
import { firstValueFrom } from 'rxjs';


@Injectable()
export class OrdersService {

  constructor(private readonly prisma: PrismaService, @Inject(NATS_SERVICE) private readonly products_service: ClientProxy) { }

  async create(createOrderDto: CreateOrderDto) {
    //hacemos la comporbación de los productos
    const ids: number [] = createOrderDto.items.map((item) => {return item.productId})
    try {
      const products: any[] = await firstValueFrom(this.products_service.send({cmd: 'validate_products'}, ids))
      const total_amount = createOrderDto.items.reduce( (acc, orderItem) => {
        const price = products.find((product) => product.id === orderItem.productId).price;
        return price * orderItem.quantity + acc
      },0)

      const totalItems = createOrderDto.items.reduce((acc, orderitem)=> {
        return acc + orderitem.quantity
      }, 0)

      const order = await this.prisma.order.create({
        data:{
          total_amount: total_amount,
          totalItems: totalItems,
          OrderItem:{
            createMany:{
              data: createOrderDto.items.map( (orderItem) => {return ({
                price:  products.find(product => product.id === orderItem.productId).price * orderItem.quantity,
                productId: orderItem.productId,
                quantity: orderItem.quantity
              })})
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
      return {...order, OrderItem: order.OrderItem.map( (orderItem) => {return ({...orderItem, productName: products.find(product => product.id === orderItem.productId).name})})}
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

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } })
    if (!order) {
      throw new RpcException({ status: HttpStatus.NOT_FOUND, message: `Product with id:${id} not found` })
    }
    const orderItems = await this.prisma.orderItem.findMany({where: {orderId: order.id}})
    const ids = orderItems.map(item => {return item.productId})
    const products: any[] = await firstValueFrom(this.products_service.send({cmd: 'validate_products' }, ids))
    const finalOrderItems = orderItems.map(orderItem => {return ({...orderItem, productName: products.find(product => product.id === orderItem.productId).name})})
    return {order, finalOrderItems}
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

}
