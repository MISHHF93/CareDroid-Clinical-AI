import { IsEnum, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier } from '../entities/subscription.entity';

export class CreateCheckoutDto {
  @ApiProperty({ enum: SubscriptionTier, example: SubscriptionTier.PROFESSIONAL })
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @ApiProperty({ required: false, example: 'http://localhost:3000/subscription/success' })
  @IsOptional()
  @IsUrl()
  successUrl?: string;

  @ApiProperty({ required: false, example: 'http://localhost:3000/subscription/cancel' })
  @IsOptional()
  @IsUrl()
  cancelUrl?: string;
}
