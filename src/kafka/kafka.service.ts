import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit {
  private readonly kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['localhost:9092'],
  });

  async onModuleInit() {
    // Initialize Kafka consumers/producers here
  }

  getKafka() {
    return this.kafka;
  }
}
