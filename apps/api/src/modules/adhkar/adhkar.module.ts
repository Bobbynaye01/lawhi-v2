import {
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PrismaService } from '../../database/prisma.service';

const kindQuerySchema = z.object({ kind: z.enum(['adhkar', 'dua']).optional() });
const categoryIdSchema = z.string().regex(/^[a-z0-9-]{2,40}$/);

@Injectable()
export class AdhkarService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories(kind?: 'adhkar' | 'dua') {
    return this.prisma.dhikrCategory.findMany({
      where: kind ? { kind } : {},
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async getCategory(id: string) {
    const category = await this.prisma.dhikrCategory.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!category) throw new NotFoundException({ error: 'category_not_found' });
    return category;
  }
}

@Public()
@Controller('adhkar')
export class AdhkarController {
  constructor(private readonly adhkar: AdhkarService) {}

  @Get('categories')
  categories(@Query(new ZodValidationPipe(kindQuerySchema)) query: { kind?: 'adhkar' | 'dua' }) {
    return this.adhkar.listCategories(query.kind);
  }

  @Get('categories/:id')
  category(@Param('id', new ZodValidationPipe(categoryIdSchema)) id: string) {
    return this.adhkar.getCategory(id);
  }
}

@Module({ controllers: [AdhkarController], providers: [AdhkarService] })
export class AdhkarModule {}
