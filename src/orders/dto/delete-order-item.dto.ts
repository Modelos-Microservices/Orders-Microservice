import { IsDefined, IsNumber, IsPositive, IsUUID } from "class-validator";


export class DeleteOrderItemDto {
    @IsNumber()
    @IsPositive()
    productId: number;
    @IsUUID()
    @IsDefined()
    user_id: string
}