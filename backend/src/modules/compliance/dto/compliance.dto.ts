import { IsBoolean, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  confirmEmail: string;
}

export enum ConsentType {
  MARKETING = 'marketing',
  DATA_PROCESSING = 'data_processing',
  THIRD_PARTY_SHARING = 'third_party_sharing',
}

export class UpdateConsentDto {
  @ApiProperty({ example: ConsentType.MARKETING, enum: ConsentType })
  @IsEnum(ConsentType)
  consentType: ConsentType;

  @ApiProperty({ example: true })
  @IsBoolean()
  granted: boolean;
}
