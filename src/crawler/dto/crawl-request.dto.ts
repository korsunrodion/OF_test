import { IsArray, IsIn, IsOptional, IsUrl, ArrayNotEmpty, ArrayMaxSize } from 'class-validator';

export class CrawlRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUrl({}, { each: true })
  urls: string[];

  @IsOptional()
  @IsIn(['low', 'normal', 'high'])
  priority?: string;
}
