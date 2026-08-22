import { IsDefined, IsIn } from 'class-validator';
import { CARE_TASK_STATUSES } from '../care-operations.service';

export class TransitionCareTaskDto {
  @IsDefined()
  @IsIn([...CARE_TASK_STATUSES])
  status: (typeof CARE_TASK_STATUSES)[number];
}
