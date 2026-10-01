import { Controller, Get, Injectable, Module, NotFoundException, Param } from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PrismaService } from '../../database/prisma.service';

const slugSchema = z.string().regex(/^[a-z0-9_-]{2,60}$/);

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  listBooks() {
    return this.prisma.book.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { chapters: true } } },
    });
  }

  async getBook(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, title: true, sortOrder: true, _count: { select: { entries: true } } },
        },
      },
    });
    if (!book) throw new NotFoundException({ error: 'book_not_found' });
    return book;
  }

  async getChapter(bookId: string, chapterId: string) {
    const chapter = await this.prisma.bookChapter.findFirst({
      where: { id: chapterId, bookId },
      include: { entries: { orderBy: { number: 'asc' } } },
    });
    if (!chapter) throw new NotFoundException({ error: 'chapter_not_found' });
    return chapter;
  }
}

@Public()
@Controller('library')
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get('books')
  books() {
    return this.library.listBooks();
  }

  @Get('books/:id')
  book(@Param('id', new ZodValidationPipe(slugSchema)) id: string) {
    return this.library.getBook(id);
  }

  @Get('books/:id/chapters/:chapterId')
  chapter(
    @Param('id', new ZodValidationPipe(slugSchema)) id: string,
    @Param('chapterId', new ZodValidationPipe(slugSchema)) chapterId: string,
  ) {
    return this.library.getChapter(id, chapterId);
  }
}

@Module({ controllers: [LibraryController], providers: [LibraryService] })
export class LibraryModule {}
