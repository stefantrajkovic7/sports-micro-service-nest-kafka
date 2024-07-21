import { Controller, Post } from '@nestjs/common';
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
    }
  }
}
