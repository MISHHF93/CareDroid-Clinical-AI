import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';

export class CustomerPortalDto {
  @ApiProperty({ required: false, example: 'http://localhost:3000/settings' })
  @IsOptional()
  @IsUrl()
  returnUrl?: string;
}
