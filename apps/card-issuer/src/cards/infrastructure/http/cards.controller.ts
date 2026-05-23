import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CardIssueSchema } from '@contracts/schemas/card-issue.schema';
import { ZodValidationPipe } from './zod-validation.pipe';
import { IssueCardUseCase } from '../../application/issue-card.use-case';

@Controller('cards')
export class CardsController {
  constructor(
    private readonly issueCardUseCase: IssueCardUseCase,
    @InjectPinoLogger(CardsController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Post('issue')
  @HttpCode(HttpStatus.ACCEPTED)
  @UsePipes(new ZodValidationPipe(CardIssueSchema))
  async issue(@Body() body: unknown) {
    this.logger.info('Received card issue request');
    const result = await this.issueCardUseCase.execute(body as any);
    return result;
  }
}
