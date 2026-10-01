import { Controller, Get, Param, Query } from '@nestjs/common';
import type { Riwaya } from '@lawhi/shared';
import { Public } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  divisionParamSchemas,
  riwayaQuerySchema,
  searchQuerySchema,
  surahParamSchema,
} from './quran.schemas';
import { QuranService } from './quran.service';

type RiwayaQuery = { riwaya: Riwaya };

@Public()
@Controller('quran')
export class QuranController {
  constructor(private readonly quran: QuranService) {}

  @Get('surahs')
  surahs() {
    return this.quran.listSurahs();
  }

  @Get('surahs/:id')
  surah(
    @Param('id', new ZodValidationPipe(surahParamSchema)) id: number,
    @Query(new ZodValidationPipe(riwayaQuerySchema)) query: RiwayaQuery,
  ) {
    return this.quran.getSurah(id, query.riwaya);
  }

  @Get('juz/:n')
  juz(
    @Param('n', new ZodValidationPipe(divisionParamSchemas.juz)) n: number,
    @Query(new ZodValidationPipe(riwayaQuerySchema)) query: RiwayaQuery,
  ) {
    return this.quran.getDivision('juz', n, query.riwaya);
  }

  @Get('hizb/:n')
  hizb(
    @Param('n', new ZodValidationPipe(divisionParamSchemas.hizb)) n: number,
    @Query(new ZodValidationPipe(riwayaQuerySchema)) query: RiwayaQuery,
  ) {
    return this.quran.getDivision('hizb', n, query.riwaya);
  }

  @Get('rub/:n')
  rub(
    @Param('n', new ZodValidationPipe(divisionParamSchemas.rub)) n: number,
    @Query(new ZodValidationPipe(riwayaQuerySchema)) query: RiwayaQuery,
  ) {
    return this.quran.getDivision('rub', n, query.riwaya);
  }

  @Get('pages/:n')
  page(
    @Param('n', new ZodValidationPipe(divisionParamSchemas.page)) n: number,
    @Query(new ZodValidationPipe(riwayaQuerySchema)) query: RiwayaQuery,
  ) {
    return this.quran.getDivision('page', n, query.riwaya);
  }

  @Get('search')
  search(@Query(new ZodValidationPipe(searchQuerySchema)) query: { q: string; riwaya: Riwaya; limit: number }) {
    return this.quran.search(query.q, query.riwaya, query.limit);
  }

  @Get('reciters')
  reciters(@Query(new ZodValidationPipe(riwayaQuerySchema)) query: RiwayaQuery) {
    return this.quran.listReciters(query.riwaya);
  }
}
