import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';
import { MAX_CATEGORY_TOTAL } from '../categories.constants';

export class AddAmountDto {
  @ApiProperty({
    description: 'A positive JSON number with at most two decimal places.',
    example: 12.5,
    minimum: 0.01,
    maximum: MAX_CATEGORY_TOTAL,
    multipleOf: 0.01,
  })
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(MAX_CATEGORY_TOTAL)
  amount!: number;
}
