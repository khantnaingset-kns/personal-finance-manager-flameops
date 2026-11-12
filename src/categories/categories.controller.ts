import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { AddAmountDto } from './dto/add-amount.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ErrorResponseDto } from './dto/error-response.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a spending category',
    description:
      'Creates a category with a zero total. Names are trimmed and must be unique, ignoring case.',
  })
  @ApiCreatedResponse({
    description: 'The newly created category.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid name or unexpected request fields.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'A category with this name already exists.',
    type: ErrorResponseDto,
  })
  create(@Body() dto: CreateCategoryDto): CategoryResponseDto {
    return this.categoriesService.create(dto);
  }

  @Post(':id/amounts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add spending to a category',
    description:
      'Adds a positive amount to the existing total and returns the updated category. ' +
      'Each successful request adds the amount again, including repeated requests.',
  })
  @ApiParam({
    name: 'id',
    description: 'The category UUID returned when it was created.',
    format: 'uuid',
    example: 'd46c9ef0-8e3b-4c9c-b8e4-aa7a77de8297',
  })
  @ApiOkResponse({
    description: 'The category with its updated spending total.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid UUID, invalid amount, unexpected fields, or the category total would exceed 1,000,000,000.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No category exists with this UUID.',
    type: ErrorResponseDto,
  })
  addAmount(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AddAmountDto,
  ): CategoryResponseDto {
    return this.categoriesService.addAmount(id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List categories and their spending totals',
    description:
      'Returns categories in creation order, including categories with zero spending. Returns an empty array initially.',
  })
  @ApiOkResponse({
    description: 'All categories and their current totals.',
    type: CategoryResponseDto,
    isArray: true,
  })
  findAll(): CategoryResponseDto[] {
    return this.categoriesService.findAll();
  }
}
