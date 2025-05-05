import { OrderStatus } from "@prisma/client";

export interface OrderWithProducts{
        OrderItem: {
            productName: any;
            productId: number;
            quantity: number;
            price: number;
        }[];
        id: string;
        total_amount: number;
        totalItems: number;
        status: OrderStatus;
        paid: boolean;
        paidAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
}