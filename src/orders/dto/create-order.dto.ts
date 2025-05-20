import { ArrayMinSize, IsArray, IsDefined, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { OrderItemDto } from "./order-item.dto";

export class CreateOrderDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true})
    @Type( () => OrderItemDto)
    items: OrderItemDto[]

    @IsUUID()
    @IsDefined()
    user_id :string
    

}


/*

 @IsNumber()
    @IsPositive()
    @IsNotEmpty()
    total_amount: number;

    @IsNumber()
    @IsPositive()
    totalItems: number;

    @IsEnum(OrderStatusList, {
        message: `Posible status values are ${OrderStatusList}`
    })
    @IsOptional()
    status: OrderStatus = OrderStatus.PENDING;

    @IsBoolean()
    @IsOptional()
    paid: boolean = false;

*/ 
