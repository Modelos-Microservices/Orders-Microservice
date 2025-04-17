import { OrderStatus } from "generated/prisma";
import { OrderStatusList } from "../enum/order.enum";
import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";

export class StatusOrderDto {
    @IsEnum(OrderStatusList, {
        message: `Posible status values are ${OrderStatusList}`
    })
    status: OrderStatus;

    @IsUUID()
    @IsNotEmpty()
    id: string
}