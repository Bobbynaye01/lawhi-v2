import type { DonationStatus } from '@lawhi/shared';

export const STATUS_LABELS: Record<DonationStatus, string> = {
  pending: 'En attente',
  submitted: 'À vérifier',
  confirmed: 'Confirmé',
  rejected: 'Refusé',
  cancelled: 'Annulé',
};

export function StatusBadge({ status }: { status: DonationStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>;
}
