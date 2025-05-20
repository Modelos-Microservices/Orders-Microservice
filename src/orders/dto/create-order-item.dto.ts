import { IsDefined, IsNumber, IsPositive, IsUUID } from "class-validator";


export class CreateOrderItemDto {
    @IsNumber()
    @IsPositive()
    productId: number;
    @IsNumber()
    @IsPositive()
    quantity: number;
    @IsUUID()
    @IsDefined()
    user_id: string
}