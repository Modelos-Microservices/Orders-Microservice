import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envs } from './conf';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';


async function bootstrap() {
  const logger = new Logger('Orders')

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: envs.nasts_servers
      }
    });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  await app.listen()
  logger.log(`runing on port ${envs.port}`)
}
bootstrap();
