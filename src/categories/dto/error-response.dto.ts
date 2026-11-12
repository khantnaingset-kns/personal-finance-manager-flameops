import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    description: 'One error message or a list of request validation errors.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: ['amount must not be less than 0.01'],
  })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;
}
