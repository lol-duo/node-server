import {Controller, Get, Param, Query} from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class HelloController {
  constructor(private readonly appService: AppService) {}

  @Get("/hello")
  getHello(): string {
    return this.appService.getHello();
  }

}
