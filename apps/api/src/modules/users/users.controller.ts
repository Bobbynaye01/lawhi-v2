import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import type { Riwaya } from '@lawhi/shared';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import {
  createBookmarkSchema,
  readingPositionSchema,
  riwayaParamSchema,
  updateProfileSchema,
  updateSettingsSchema,
  uuidSchema,
  type CreateBookmarkInput,
  type UpdateSettingsInput,
} from './users.schemas';
import { UsersService } from './users.service';

/** Endpoints for the signed-in user only — never takes a user id from the client. */
@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  @Patch()
  update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: { displayName: string | null },
  ) {
    return this.users.updateProfile(user.id, body.displayName);
  }

  @Delete()
  remove(@CurrentUser() user: AuthUser) {
    return this.users.deleteAccount(user.id);
  }

  @Put('settings')
  settings(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateSettingsSchema)) body: UpdateSettingsInput,
  ) {
    return this.users.updateSettings(user.id, body);
  }

  @Get('reading-positions')
  readingPositions(@CurrentUser() user: AuthUser) {
    return this.users.readingPositions(user.id);
  }

  @Put('reading-positions/:riwaya')
  saveReadingPosition(
    @CurrentUser() user: AuthUser,
    @Param('riwaya', new ZodValidationPipe(riwayaParamSchema)) riwaya: Riwaya,
    @Body(new ZodValidationPipe(readingPositionSchema)) body: { surah: number; verse: number },
  ) {
    return this.users.saveReadingPosition(user.id, riwaya, body.surah, body.verse);
  }

  @Get('bookmarks')
  bookmarks(@CurrentUser() user: AuthUser) {
    return this.users.bookmarks(user.id);
  }

  @Post('bookmarks')
  addBookmark(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createBookmarkSchema)) body: CreateBookmarkInput,
  ) {
    return this.users.addBookmark(user.id, body);
  }

  @Delete('bookmarks/:id')
  @HttpCode(204)
  async removeBookmark(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
  ) {
    await this.users.removeBookmark(user.id, id);
  }
}
