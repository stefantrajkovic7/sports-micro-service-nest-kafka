import { Controller, Get, Post } from '@nestjs/common';
import { DataFetchingService } from '../services/data/data-fetching.service';
import { DataSendingService } from '../services/data/data-sending.service';

@Controller('process')
export class ProcessController {
  private isProcessing = false;

  constructor(
    private readonly dataFetchingService: DataFetchingService,
    private readonly dataSendingService: DataSendingService,
  ) {}

  /**
   * Toggles the data processing state.
   * If the processing is started, it will initiate data fetching and sending.
   * If the processing is stopped, it will simply return a message indicating so.
   * @returns A message indicating whether the process has started or stopped.
   */
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

  /**
   * Retrieves the current status of the data processing.
   * @returns An object containing the current processing state.
   */
  @Get('status')
  getStatus() {
    return { isProcessing: this.isProcessing };
  }
}
