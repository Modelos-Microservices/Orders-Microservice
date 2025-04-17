import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
