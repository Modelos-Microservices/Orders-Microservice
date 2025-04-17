import { PaginationDto } from "src/common/dto/pagination.dto";
import { OrderStatusList } from "../enum/order.enum";
import { IsEnum, IsOptional } from "class-validator";
import { OrderStatus } from "generated/prisma";


export class OrderPaginationDto extends PaginationDto {
    @IsEnum(OrderStatusList, {
        message: `Posible status values are ${OrderStatusList}`
    })
    @IsOptional()
    status: OrderStatus;
}