import { IsString, Length } from 'class-validator';

export class NavigatorQueryDto {
  @IsString() @Length(2, 500) query!: string;
}
