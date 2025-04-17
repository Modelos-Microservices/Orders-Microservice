import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaService } from 'src/common/prisma.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PRODUCT_SERVICE } from 'src/conf/services';
import { envs } from 'src/conf';
import { NatsModule } from 'src/nats/nats.module';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService],
  imports: [NatsModule],
})
export class OrdersModule {}
