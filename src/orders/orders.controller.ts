import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { StatusOrderDto } from './dto/status-order.dto';


@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {
  }

  @MessagePattern({ cmd: 'createOrder' })
  create(@Payload() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
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


}
