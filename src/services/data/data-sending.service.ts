import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DataSendingService implements OnModuleInit {
  private kafka = new Kafka({
    clientId: 'sports-microservice',
    brokers: ['localhost:9092'],
  });

  private producer = this.kafka.producer();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.producer.connect();
    setInterval(() => this.sendData(), 10000);
  }

  async sendData() {
    const leagues = await this.prisma.league.findMany({
      include: { teams: true },
    });

    for (const league of leagues) {
      await this.producer.send({
        topic: 'data-sending',
        messages: [{ value: JSON.stringify(league) }],
      });
    }
  }
}
