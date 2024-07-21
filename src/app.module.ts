import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaModule } from './kafka/kafka.module';
import { RedisModule } from './redis/redis.module';
import { PrismaService } from './prisma.service';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { DataSendingService } from './data-sending.service';
import { DataFetchingService } from './data-fetching.service';

@Module({
  imports: [
    KafkaModule,
    RedisModule,
    HttpModule,
    ScheduleModule.forRoot()
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    PrismaService, 
    DataSendingService, 
    DataFetchingService
  ],
})
export class AppModule {}
