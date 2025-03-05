// backend/src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Connection } from 'typeorm';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly connection: Connection,
  ) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @Get('db-status')
  async getDatabaseStatus() {
    try {
      const isConnected = this.connection.isConnected;
      return {
        status: isConnected ? 'Connected' : 'Not connected',
        database: process.env.DATABASE_NAME,
        host: process.env.DATABASE_HOST
      };
    } catch (error) {
      return {
        status: 'Error',
        message: error.message
      };
    }
  }
}