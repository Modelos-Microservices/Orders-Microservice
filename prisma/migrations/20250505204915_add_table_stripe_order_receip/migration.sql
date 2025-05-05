-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PAID';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "stripeChargeID" TEXT;

-- CreateTable
CREATE TABLE "OrderReceip" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "receipUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderReceip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderReceip_orderId_key" ON "OrderReceip"("orderId");

-- AddForeignKey
ALTER TABLE "OrderReceip" ADD CONSTRAINT "OrderReceip_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
