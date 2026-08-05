import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReassessPatientDto {
  @IsOptional() new_dps_score?: number | null;
  @IsNotEmpty() @IsString() notes!: string;
  @IsOptional() findings?: unknown;
  @IsNotEmpty() @IsString() clinician!: string;
}

export class DismissReassessmentDto {
  @IsIn(['transferred', 'discharged', 'clinical_decision', 'already_assessed'])
  reason!: string;

  @IsNotEmpty() @IsString() clinician!: string;
}
