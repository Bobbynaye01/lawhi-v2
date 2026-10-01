import { Controller, Get, Module, Query } from '@nestjs/common';
import { distanceToKaabaKm, KAABA, qiblaBearing } from '@lawhi/shared';
import { z } from 'zod';
import { Public } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

const qiblaQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

/** Bearing for clients without the shared package (the mobile app computes it locally). */
@Public()
@Controller('qibla')
export class QiblaController {
  @Get()
  qibla(@Query(new ZodValidationPipe(qiblaQuerySchema)) query: { lat: number; lon: number }) {
    return {
      kaaba: KAABA,
      bearing: qiblaBearing(query.lat, query.lon),
      distanceKm: Math.round(distanceToKaabaKm(query.lat, query.lon)),
    };
  }
}

@Module({ controllers: [QiblaController] })
export class QiblaModule {}
