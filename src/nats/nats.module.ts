import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from 'src/conf';
import { NATS_SERVICE } from 'src/conf/services';


@Module({
    imports: [
        ClientsModule.register([{ name: NATS_SERVICE, transport: Transport.NATS, options: { servers: envs.nasts_servers } }]),
    ],
    exports: [
        ClientsModule.register([{ name: NATS_SERVICE, transport: Transport.NATS, options: { servers: envs.nasts_servers } }]),
    ]
})
export class NatsModule { }
