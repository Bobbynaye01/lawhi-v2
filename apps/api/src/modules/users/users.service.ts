import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Riwaya } from '@lawhi/shared';
import { PrismaService } from '../../database/prisma.service';
import { SUPABASE_ADMIN } from '../storage/supabase-admin';
import type { CreateBookmarkInput, UpdateSettingsInput } from './users.schemas';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient | null,
  ) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
        settings: true,
      },
    });
    return user;
  }

  updateProfile(userId: string, displayName: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { displayName },
      select: { id: true, email: true, displayName: true, role: true },
    });
  }

  updateSettings(userId: string, input: UpdateSettingsInput) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...input },
      update: input,
    });
  }

  readingPositions(userId: string) {
    return this.prisma.readingPosition.findMany({ where: { userId } });
  }

  async saveReadingPosition(userId: string, riwaya: Riwaya, surah: number, verse: number) {
    await this.assertVerseExists(riwaya, surah, verse);
    return this.prisma.readingPosition.upsert({
      where: { userId_riwaya: { userId, riwaya } },
      create: { userId, riwaya, surah, verse },
      update: { surah, verse },
    });
  }

  bookmarks(userId: string) {
    return this.prisma.bookmark.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async addBookmark(userId: string, input: CreateBookmarkInput) {
    await this.assertVerseExists(input.riwaya, input.surah, input.verse);
    return this.prisma.bookmark.upsert({
      where: {
        userId_riwaya_surah_verse: {
          userId,
          riwaya: input.riwaya,
          surah: input.surah,
          verse: input.verse,
        },
      },
      create: { userId, ...input },
      update: { note: input.note ?? null },
    });
  }

  async removeBookmark(userId: string, id: string) {
    const { count } = await this.prisma.bookmark.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException({ error: 'bookmark_not_found' });
  }

  /**
   * Deletes the account: personal data is erased, open donations are cancelled,
   * confirmed donations are kept for accounting but anonymized, and the Supabase
   * Auth identity is deleted when the service is configured.
   */
  async deleteAccount(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      const open = await tx.donation.findMany({
        where: { userId, status: { in: ['pending', 'submitted'] } },
        select: { id: true, status: true },
      });
      for (const donation of open) {
        await tx.donation.update({ where: { id: donation.id }, data: { status: 'cancelled' } });
        await tx.donationEvent.create({
          data: {
            donationId: donation.id,
            fromStatus: donation.status,
            toStatus: 'cancelled',
            actorId: userId,
            note: 'account_deleted',
          },
        });
      }
      await tx.donation.updateMany({
        where: { userId },
        data: { donorName: null, donorPhone: null },
      });
      await tx.bookmark.deleteMany({ where: { userId } });
      await tx.readingPosition.deleteMany({ where: { userId } });
      await tx.userSettings.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: { status: 'deactivated', deactivatedAt: new Date(), email: null, displayName: null },
      });
    });

    let authDeleted = false;
    if (this.supabase) {
      const { error } = await this.supabase.auth.admin.deleteUser(userId);
      if (error) this.logger.error(`Supabase deleteUser failed for ${userId}: ${error.message}`);
      else authDeleted = true;
    }
    return { deactivated: true, authDeleted };
  }

  private async assertVerseExists(riwaya: Riwaya, surah: number, verse: number) {
    const exists = await this.prisma.verse.findUnique({
      where: { riwaya_surah_verse: { riwaya, surah, verse } },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException({ error: 'verse_not_found' });
  }
}
