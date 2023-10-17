import {Controller, Get, Param, Query} from '@nestjs/common';
import { AppService } from './app.service';

@Controller("/v2")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/soloInfo")
  async getSoloInfo(@Query("championId") championId: string, @Query("position") position: string): Promise<any> {
    return await this.appService.getSoloInfo(championId, position);
  }

}
