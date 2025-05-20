import { IsDefined, IsNumber, IsPositive, IsUUID } from "class-validator";


export class UpdateOrderItemDto {
    @IsNumber()
    @IsPositive()
    productId: number;
    @IsNumber()
    @IsPositive()
    newQuantity: number;
    @IsUUID()
    @IsDefined()
    user_id: string
}