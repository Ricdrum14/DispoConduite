import { PartialType } from '@nestjs/mapped-types';
import { CreateSearchProfileDto } from './create-search-profile.dto';

export class UpdateSearchProfileDto extends PartialType(CreateSearchProfileDto) {}
