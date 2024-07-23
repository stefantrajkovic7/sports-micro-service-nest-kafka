import { Injectable, OnModuleInit } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Kafka } from 'kafkajs';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Data Sending')
@Injectable()
export class DataSendingService implements OnModuleInit {
  private kafka = new Kafka({
    clientId: 'sports-microservice',
    brokers: ['localhost:9092'],
  });

  private producer = this.kafka.producer();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lifecycle hook that is called once the module has been initialized.
   * Connects the Kafka producer and starts the interval to send data.
   */
  async onModuleInit() {
    await this.producer.connect();
    setInterval(() => this.sendData(), 10000);
  }

  /**
   * Fetches leagues and their teams from the database and sends the data to a Kafka topic.
   */
  @ApiOperation({ summary: 'Send data to Kafka topic every 10 seconds' })
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
