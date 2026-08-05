import { IsNotEmpty, IsString } from 'class-validator';

export class TrackDecisionDto {
  @IsNotEmpty() @IsString() patientId!: string;
  @IsNotEmpty() @IsString() clinicianId!: string;
}
