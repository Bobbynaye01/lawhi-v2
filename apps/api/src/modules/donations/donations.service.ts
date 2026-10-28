import { randomInt, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { canTransition, CURRENCY, type DonationStatus, type DonationSummary } from '@lawhi/shared';
import { z } from 'zod';
import type { createDonationSchema } from '@lawhi/shared';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PROOF_STORAGE, type ProofStorage } from '../storage/proof-storage';
import type { AdminDonationsQuery } from './donations.schemas';
import { detectProofType, MAX_PROOF_BYTES } from './proof-file';

type CreateDonation = z.output<typeof createDonationSchema>;

/** AppConfig key of the admin-entered running total of donations. */
export const DONATION_TOTAL_KEY = 'donations.total';
export const donationTotalSchema = z.object({
  amount: z.number().int().min(0),
  updatedAt: z.iso.datetime(),
});

/** Unambiguous alphabet (no 0/O, 1/I/L) for codes read over the phone. */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generateCode(): string {
  let code = 'LW-';
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

const donorView = {
  id: true,
  code: true,
  amount: true,
  currency: true,
  donorName: true,
  donorPhone: true,
  reference: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  proofPath: true,
  cause: { select: { id: true, slug: true, titleAr: true, titleFr: true, titleEn: true } },
  paymentMethod: { select: { id: true, name: true, operator: true, phoneNumber: true } },
} satisfies Prisma.DonationSelect;

@Injectable()
export class DonationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROOF_STORAGE) private readonly storage: ProofStorage | null,
  ) {}

  // ─── Public ────────────────────────────────────────────────────────────────

  /** Active causes with progress computed from confirmed donations only. */
  async listCauses() {
    const causes = await this.prisma.donationCause.findMany({
      where: { active: true },
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
    });
    const totals = await this.prisma.donation.groupBy({
      by: ['causeId'],
      where: { status: 'confirmed', causeId: { in: causes.map((c) => c.id) } },
      _sum: { amount: true },
      _count: true,
    });
    const byCause = new Map(totals.map((t) => [t.causeId, t]));
    return causes.map((cause) => ({
      ...cause,
      confirmedAmount: byCause.get(cause.id)?._sum.amount ?? 0,
      confirmedCount: byCause.get(cause.id)?._count ?? 0,
    }));
  }

  /** What every donor sees at the top of the Sadaqa screen. */
  async summary(): Promise<DonationSummary> {
    const [row, bankily] = await Promise.all([
      this.prisma.appConfig.findUnique({ where: { key: DONATION_TOTAL_KEY } }),
      this.prisma.paymentMethod.findUnique({
        where: { operator: 'bankily' },
        select: { phoneNumber: true, enabled: true },
      }),
    ]);
    const total = donationTotalSchema.safeParse(row?.value);
    return {
      totalAmount: total.success ? total.data.amount : 0,
      currency: CURRENCY,
      updatedAt: total.success ? total.data.updatedAt : null,
      bankilyPhone: bankily?.enabled ? bankily.phoneNumber : null,
    };
  }

  /** Only methods an admin has enabled with a real number. */
  listPaymentMethods() {
    return this.prisma.paymentMethod.findMany({
      where: { enabled: true, phoneNumber: { not: null } },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, operator: true, phoneNumber: true, instructions: true },
    });
  }

  // ─── Donor ─────────────────────────────────────────────────────────────────

  async create(userId: string, input: CreateDonation) {
    const [cause, method] = await Promise.all([
      this.prisma.donationCause.findFirst({ where: { id: input.causeId, active: true } }),
      this.prisma.paymentMethod.findFirst({
        where: { id: input.paymentMethodId, enabled: true, phoneNumber: { not: null } },
      }),
    ]);
    if (!cause) throw new UnprocessableEntityException({ error: 'cause_unavailable' });
    if (!method) throw new UnprocessableEntityException({ error: 'payment_method_unavailable' });

    const status: DonationStatus = input.reference ? 'submitted' : 'pending';

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const donation = await tx.donation.create({
            data: {
              code: generateCode(),
              amount: input.amount,
              currency: 'MRU',
              donorName: input.donorName ?? null,
              donorPhone: input.donorPhone ?? null,
              reference: input.reference ?? null,
              status,
              userId,
              causeId: cause.id,
              paymentMethodId: method.id,
            },
            select: donorView,
          });
          await tx.donationEvent.create({
            data: {
              donationId: donation.id,
              fromStatus: null,
              toStatus: 'pending',
              actorId: userId,
            },
          });
          if (status === 'submitted') {
            await tx.donationEvent.create({
              data: {
                donationId: donation.id,
                fromStatus: 'pending',
                toStatus: 'submitted',
                actorId: userId,
              },
            });
          }
          return donation;
        });
      } catch (error) {
        const codeCollision =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!codeCollision) throw error;
      }
    }
    throw new ConflictException({ error: 'code_generation_failed' });
  }

  async listMine(userId: string) {
    const donations = await this.prisma.donation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: donorView,
    });
    return donations.map(({ proofPath, ...donation }) => ({
      ...donation,
      hasProof: proofPath !== null,
    }));
  }

  async getMine(userId: string, id: string) {
    const donation = await this.prisma.donation.findFirst({
      where: { id, userId },
      select: donorView,
    });
    if (!donation) throw new NotFoundException({ error: 'donation_not_found' });
    const { proofPath, ...rest } = donation;
    return { ...rest, hasProof: proofPath !== null };
  }

  async submitReference(userId: string, id: string, reference: string) {
    const donation = await this.ownOpenDonation(userId, id);
    return this.applyTransition(donation.id, donation.status, 'submitted', userId, { reference });
  }

  async attachProof(
    userId: string,
    id: string,
    file: { buffer: Buffer; size: number } | undefined,
  ) {
    if (!this.storage)
      throw new ServiceUnavailableException({ error: 'proof_storage_unavailable' });
    if (!file || file.size === 0) throw new BadRequestException({ error: 'proof_missing' });
    if (file.size > MAX_PROOF_BYTES) throw new BadRequestException({ error: 'proof_too_large' });
    const detected = detectProofType(file.buffer);
    if (!detected) throw new BadRequestException({ error: 'proof_type_not_allowed' });

    const donation = await this.ownOpenDonation(userId, id);
    const path = `${userId}/${donation.id}/${randomUUID()}.${detected.ext}`;
    await this.storage.save(path, file.buffer, detected.type);
    return this.applyTransition(donation.id, donation.status, 'submitted', userId, {
      proofPath: path,
    });
  }

  async cancel(userId: string, id: string) {
    const donation = await this.ownOpenDonation(userId, id);
    return this.applyTransition(donation.id, donation.status, 'cancelled', userId, {});
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async adminList(query: AdminDonationsQuery) {
    const where: Prisma.DonationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.causeId ? { causeId: query.causeId } : {}),
      ...(query.paymentMethodId ? { paymentMethodId: query.paymentMethodId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { code: { contains: query.q, mode: 'insensitive' } },
              { reference: { contains: query.q, mode: 'insensitive' } },
              { donorName: { contains: query.q, mode: 'insensitive' } },
              { donorPhone: { contains: query.q } },
            ],
          }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.donation.count({ where }),
      this.prisma.donation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: { ...donorView, user: { select: { id: true, email: true } } },
      }),
    ]);
    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      items: items.map(({ proofPath, ...item }) => ({ ...item, hasProof: proofPath !== null })),
    };
  }

  async adminGet(id: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
      select: {
        ...donorView,
        user: { select: { id: true, email: true } },
        reviewedBy: { select: { id: true, email: true } },
        events: {
          orderBy: { createdAt: 'asc' },
          select: {
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
            actor: { select: { email: true } },
          },
        },
      },
    });
    if (!donation) throw new NotFoundException({ error: 'donation_not_found' });
    const { proofPath, ...rest } = donation;
    return { ...rest, hasProof: proofPath !== null };
  }

  async adminProof(id: string) {
    if (!this.storage)
      throw new ServiceUnavailableException({ error: 'proof_storage_unavailable' });
    const donation = await this.prisma.donation.findUnique({
      where: { id },
      select: { proofPath: true },
    });
    if (!donation?.proofPath) throw new NotFoundException({ error: 'proof_not_found' });
    const url = await this.storage.signedUrl(donation.proofPath, 300);
    if (url) return { kind: 'url' as const, url };
    const file = await this.storage.read(donation.proofPath);
    if (!file) throw new NotFoundException({ error: 'proof_not_found' });
    return { kind: 'file' as const, ...file };
  }

  async review(adminId: string, id: string, decision: 'confirmed' | 'rejected', note?: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
      select: { id: true, status: true, userId: true },
    });
    if (!donation) throw new NotFoundException({ error: 'donation_not_found' });
    if (donation.userId === adminId) {
      throw new ForbiddenException({ error: 'cannot_review_own_donation' });
    }
    return this.applyTransition(
      donation.id,
      donation.status,
      decision,
      adminId,
      {
        reviewedById: adminId,
        reviewedAt: new Date(),
        ...(decision === 'rejected' ? { rejectionReason: note ?? null } : {}),
      },
      note,
    );
  }

  async stats() {
    const [byStatus, byCause, byMethod, causes, methods] = await Promise.all([
      this.prisma.donation.groupBy({ by: ['status'], _sum: { amount: true }, _count: true }),
      this.prisma.donation.groupBy({
        by: ['causeId'],
        where: { status: 'confirmed' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.donation.groupBy({
        by: ['paymentMethodId'],
        where: { status: 'confirmed' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.donationCause.findMany({
        select: { id: true, titleFr: true, titleAr: true, goalAmount: true },
      }),
      this.prisma.paymentMethod.findMany({ select: { id: true, name: true } }),
    ]);
    const causeName = new Map(causes.map((c) => [c.id, c]));
    const methodName = new Map(methods.map((m) => [m.id, m.name]));
    return {
      currency: 'MRU',
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
        amount: s._sum.amount ?? 0,
      })),
      confirmedByCause: byCause.map((c) => ({
        causeId: c.causeId,
        title: causeName.get(c.causeId)?.titleFr ?? null,
        goalAmount: causeName.get(c.causeId)?.goalAmount ?? null,
        count: c._count,
        amount: c._sum.amount ?? 0,
      })),
      confirmedByMethod: byMethod.map((m) => ({
        paymentMethodId: m.paymentMethodId,
        name: methodName.get(m.paymentMethodId) ?? null,
        count: m._count,
        amount: m._sum.amount ?? 0,
      })),
    };
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  private async ownOpenDonation(userId: string, id: string) {
    const donation = await this.prisma.donation.findFirst({
      where: { id, userId },
      select: { id: true, status: true },
    });
    if (!donation) throw new NotFoundException({ error: 'donation_not_found' });
    return donation;
  }

  /**
   * Changes the status only if the donation is still in `from` (optimistic
   * concurrency: two admins cannot both decide) and the transition is allowed.
   */
  private async applyTransition(
    id: string,
    from: DonationStatus,
    to: DonationStatus,
    actorId: string,
    data: Prisma.DonationUncheckedUpdateManyInput,
    note?: string,
  ) {
    const sameStatusUpdate = from === to && to === 'submitted';
    if (!sameStatusUpdate && !canTransition(from, to)) {
      throw new ConflictException({ error: 'invalid_status_transition', from, to });
    }
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.donation.updateMany({
        where: { id, status: from },
        data: { ...data, status: to },
      });
      if (count === 0) throw new ConflictException({ error: 'donation_changed_concurrently' });
      if (!sameStatusUpdate) {
        await tx.donationEvent.create({
          data: { donationId: id, fromStatus: from, toStatus: to, actorId, note: note ?? null },
        });
      }
      const updated = await tx.donation.findUniqueOrThrow({ where: { id }, select: donorView });
      const { proofPath, ...rest } = updated;
      return { ...rest, hasProof: proofPath !== null };
    });
  }
}
