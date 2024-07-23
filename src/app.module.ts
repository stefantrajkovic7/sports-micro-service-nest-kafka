import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaModule } from './services/kafka/kafka.module';
import { RedisModule } from './services/redis/redis.module';
import { PrismaService } from './services/prisma/prisma.service';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { DataSendingService } from './services/data/data-sending.service';
import { DataFetchingService } from './services/data/data-fetching.service';
import { ProcessController } from './controllers/process.controller';
import { RepositoriesModule } from './repositories/repositories.module';

@Module({
  imports: [
    KafkaModule,
    RedisModule,
    HttpModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    RepositoriesModule,
  ],
  controllers: [ProcessController],
  providers: [
    PrismaService, 
    DataSendingService, 
    DataFetchingService
  ],
})
export class AppModule {}
