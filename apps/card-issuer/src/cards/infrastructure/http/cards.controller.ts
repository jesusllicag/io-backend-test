import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
} from '@nestjs/common';
import {
  CardIssueDto,
  CardIssueSchema,
} from '@contracts/schemas/card-issue.schema';
import { ZodValidationPipe } from './zod-validation.pipe';
import { IssueCardUseCase } from '../../application/issue-card.use-case';

@Controller('cards')
export class CardsController {
  constructor(private readonly issueCardUseCase: IssueCardUseCase) {}

  @Post('issue')
  @HttpCode(HttpStatus.ACCEPTED)
  @UsePipes(new ZodValidationPipe(CardIssueSchema))
  async issue(@Body() body: CardIssueDto) {
    return this.issueCardUseCase.execute(body);
  }
}
