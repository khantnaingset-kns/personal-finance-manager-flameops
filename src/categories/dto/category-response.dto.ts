import { ApiProperty } from '@nestjs/swagger';
import { MAX_CATEGORY_TOTAL } from '../categories.constants';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'A generated UUID identifying the category.',
    format: 'uuid',
    example: 'd46c9ef0-8e3b-4c9c-b8e4-aa7a77de8297',
  })
  id!: string;

  @ApiProperty({ example: 'Food' })
  name!: string;

  @ApiProperty({
    description:
      'Accumulated spending in the same currency unit as the input amounts.',
    example: 12.5,
    minimum: 0,
    maximum: MAX_CATEGORY_TOTAL,
    multipleOf: 0.01,
  })
  totalAmount!: number;
}
