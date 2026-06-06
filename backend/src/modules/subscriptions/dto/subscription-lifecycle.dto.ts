import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier } from '../entities/subscription.entity';

export class SubscriptionPlanTransitionDto {
  @ApiProperty({ enum: SubscriptionTier, example: SubscriptionTier.PROFESSIONAL })
  @IsEnum(SubscriptionTier)
  targetTier: SubscriptionTier;

  @ApiProperty({ required: false, example: 'self-service upgrade from customer portal' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ResolveSubscriptionEntitlementDto {
  @ApiProperty({ enum: SubscriptionTier, example: SubscriptionTier.PROFESSIONAL })
  @IsEnum(SubscriptionTier)
  requiredTier: SubscriptionTier;

  @ApiProperty({ required: false, example: 'simulation-suite' })
  @IsOptional()
  @IsString()
  featureId?: string;
}
