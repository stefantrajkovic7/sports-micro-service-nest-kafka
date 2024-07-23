import { Controller, Get, Post } from '@nestjs/common';
import { DataFetchingService } from './data-fetching.service';
import { DataSendingService } from './data-sending.service';

@Controller('process')
export class ProcessController {
  private isProcessing = false;

  constructor(
    private readonly dataFetchingService: DataFetchingService,
    private readonly dataSendingService: DataSendingService,
  ) {}

  @Post('toggle')
  toggleProcess() {
    this.isProcessing = !this.isProcessing;
    if (this.isProcessing) {
      this.dataFetchingService.fetchData();
      this.dataSendingService.sendData();
      return { message: 'Process started' };
    } else {
      return { message: 'Process stopped' };
    }
  }

  @Get('status')
  getStatus() {
    return { isProcessing: this.isProcessing };
  }
}
