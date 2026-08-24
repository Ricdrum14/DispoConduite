import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { CourseType, TimeSlot } from '../../../generated/prisma/client/enums';

export class CreateSearchProfileDto {
  @IsString()
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsArray()
  @IsInt({ each: true })
  days: number[];

  @IsArray()
  @IsEnum(TimeSlot, { each: true })
  time_slots: TimeSlot[];

  @IsOptional()
  @IsEnum(CourseType)
  course_type?: CourseType;

  @IsOptional()
  @IsString()
  moniteur_id?: string;

  @IsOptional()
  @IsInt()
  duration_minutes?: number;
}
