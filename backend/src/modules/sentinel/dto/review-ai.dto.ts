import { IsIn } from 'class-validator';

export class ReviewAiDto {
  @IsIn(['accepted', 'rejected', 'modified'])
  status: 'accepted' | 'rejected' | 'modified';
}
