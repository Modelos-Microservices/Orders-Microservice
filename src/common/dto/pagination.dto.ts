import { Type } from "class-transformer"
import { IsNumber, IsOptional, IsPositive } from "class-validator"

export class PaginationDto {
    @IsOptional()
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    page: number = 1
    @IsOptional()
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    limit: number = 10

}