import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { StatusOrderDto } from './dto/status-order.dto';
import { PaidOrderDto } from './dto/paid-order.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { consumerOpts } from 'nats';
import { DeleteOrderItemDto } from './dto/delete-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';


@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {
  }

  private readonly Logger = new Logger('OrdersController')

  @MessagePattern({ cmd: 'createOrder' })
  async create(@Payload() createOrderDto: CreateOrderDto) {

    const order =  await this.ordersService.create(createOrderDto);
    const paymentSession = await this.ordersService.createPaymentSession(order);
    return {order, paymentSession}
  }

  @MessagePattern({ cmd: 'findAllOrders' })
  findAll(@Payload() pagination: OrderPaginationDto) {
    return this.ordersService.findAll(pagination);
  }

  @MessagePattern({ cmd: 'findOneOrder' })
  findOne(@Payload() id: string) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern({ cmd: 'changeOrderStatus' })
  update(@Payload() StatusOrderDto: StatusOrderDto) {
    return this.ordersService.changeOrderStatus(StatusOrderDto);
  }

  @MessagePattern({cmd: 'getAllReceipts'})
  findAllReceipts(@Payload() pagination: PaginationDto){
    return this.ordersService.getAllReceipts(pagination)
  }

  @EventPattern('payment.succeeded')
  paidOrder(@Payload() paidOrderDto: PaidOrderDto) {
    this.Logger.log(paidOrderDto)
    return this.ordersService.paidOrder(paidOrderDto)
  }

  @MessagePattern({cmd: 'addOneProduct'})
  AddOneProduct(@Payload() createOrderItemDto: CreateOrderItemDto){
    return this.ordersService.addProduct(createOrderItemDto)
  }


  @MessagePattern({cmd: 'payOrder'})
  PayOrder(@Payload() user_id: string){
    return this.ordersService.PayOrder(user_id)
  }

  @MessagePattern({cmd: 'deleteOrderItem'})
  deleteOrderItem(@Payload() deleteOrderItemDto: DeleteOrderItemDto){
    return this.ordersService.removeProduct(deleteOrderItemDto)
  }

  @MessagePattern({cmd: 'updateOrderItem'})
  updateOrderItem(@Payload() updateOrderItemDto: UpdateOrderItemDto){
    return this.ordersService.updateProduct(updateOrderItemDto)
  }

  @MessagePattern({cmd: 'getUserCart'})
  getUserCart(@Payload() id: string){
    return this.ordersService.getUserCart(id)
  }

}
