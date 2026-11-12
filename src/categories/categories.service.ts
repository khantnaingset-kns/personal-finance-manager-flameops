import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MAX_CATEGORY_TOTAL } from './categories.constants';
import type { AddAmountDto } from './dto/add-amount.dto';
import type { CategoryResponseDto } from './dto/category-response.dto';
import type { CreateCategoryDto } from './dto/create-category.dto';

interface StoredCategory {
  id: string;
  name: string;
  totalCents: number;
}

@Injectable()
export class CategoriesService {
  private readonly categories = new Map<string, StoredCategory>();

  create(dto: CreateCategoryDto): CategoryResponseDto {
    const name = dto.name.trim();
    const normalizedName = name.toLowerCase();

    for (const category of this.categories.values()) {
      if (category.name.toLowerCase() === normalizedName) {
        throw new ConflictException(
          'A category with this name already exists.',
        );
      }
    }

    const category: StoredCategory = {
      id: randomUUID(),
      name,
      totalCents: 0,
    };

    this.categories.set(category.id, category);
    return this.toResponse(category);
  }

  addAmount(id: string, dto: AddAmountDto): CategoryResponseDto {
    const category = this.categories.get(id);

    if (!category) {
      throw new NotFoundException(`Category "${id}" was not found.`);
    }

    // DTO validation limits input to two decimal places. Round only during the
    // conversion to cents to remove binary floating-point representation noise.
    const amountCents = Math.round(dto.amount * 100);
    const nextTotalCents = category.totalCents + amountCents;

    if (nextTotalCents > MAX_CATEGORY_TOTAL * 100) {
      throw new BadRequestException(
        `A category total cannot exceed ${MAX_CATEGORY_TOTAL}.`,
      );
    }

    category.totalCents = nextTotalCents;
    return this.toResponse(category);
  }

  findAll(): CategoryResponseDto[] {
    return Array.from(this.categories.values(), (category) =>
      this.toResponse(category),
    );
  }

  private toResponse(category: StoredCategory): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      totalAmount: category.totalCents / 100,
    };
  }
}
