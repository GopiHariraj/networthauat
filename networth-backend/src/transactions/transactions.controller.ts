import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionDto,
  ParseSmsDto,
} from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) { }

  @Post()
  create(@Body() dto: CreateTransactionDto, @Request() req: any) {
    return this.transactionsService.create(req.user.id, dto);
  }

  @Post('sms')
  parseSMS(@Body() dto: ParseSmsDto, @Request() req: any) {
    return this.transactionsService.parseAndCreate(req.user.id, dto.text);
  }

  @Post('receipt')
  async analyzeReceipt(@Body() body: { image: string }, @Request() req: any) {
    return this.transactionsService.analyzeReceipt(req.user.id, body.image);
  }

  @Post('statement')
  @UseInterceptors(FileInterceptor('file'))
  async parseStatement(
    @UploadedFile() file: Express.Multer.File,
    @Body('accountId') accountId: string,
    @Request() req: any,
  ) {
    return this.transactionsService.parseStatement(req.user.id, file, accountId);
  }

  @Get()
  findAll(@Request() req: any, @Query('accountId') accountId?: string) {
    if (accountId) {
      return this.transactionsService.findByAccount(req.user.id, accountId);
    }
    return this.transactionsService.findAll(req.user.id);
  }

  @Get('dashboard')
  getDashboard(
    @Request() req: any,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.transactionsService.getDashboardData(req.user.id, {
      period,
      startDate,
      endDate,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto, @Request() req: any) {
    return this.transactionsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.transactionsService.remove(req.user.id, id);
  }
}
