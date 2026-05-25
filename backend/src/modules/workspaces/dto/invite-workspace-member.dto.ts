import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class InviteWorkspaceMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(60)
  role: string;

  @IsOptional()
  @IsString()
  department?: string;
}
