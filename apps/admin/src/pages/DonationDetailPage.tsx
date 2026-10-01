import { formatMRU, isFinalStatus } from '@lawhi/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { STATUS_LABELS, StatusBadge } from '../components/StatusBadge';
import { adminApi, errorMessage } from '../lib/api';

export function DonationDetailPage({ currentUserId }: { currentUserId: string }) {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const donation = useQuery({ queryKey: ['donation', id], queryFn: () => adminApi.donation(id) });
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['donation', id] });
    void queryClient.invalidateQueries({ queryKey: ['donations'] });
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
  };
  const confirm = useMutation({
    mutationFn: () => adminApi.confirm(id, note.trim() || undefined),
    onSuccess: refresh,
  });
  const reject = useMutation({
    mutationFn: () => adminApi.reject(id, reason.trim()),
    onSuccess: refresh,
  });

  if (donation.isPending) return <p>Chargement…</p>;
  if (donation.isError) return <p className="error">{errorMessage(donation.error)}</p>;
  const d = donation.data;
  const ownDonation = d.user.id === currentUserId;

  const showProof = async () => {
    setProofError(null);
    try {
      setProofUrl(await adminApi.proofUrl(id));
    } catch (e) {
      setProofError(errorMessage(e));
    }
  };

  return (
    <>
      <p>
        <Link to="/donations">← Dons</Link>
      </p>
      <h1>
        Don {d.code} <StatusBadge status={d.status} />
      </h1>
      <div className="grid2">
        <section className="card">
          <h2>Déclaration du donateur</h2>
          <dl>
            <dt>Montant déclaré</dt>
            <dd className="big">{formatMRU(d.amount)}</dd>
            <dt>Projet</dt>
            <dd>{d.cause.titleFr}</dd>
            <dt>Moyen de paiement</dt>
            <dd>
              {d.paymentMethod.name} → {d.paymentMethod.phoneNumber ?? 'numéro non configuré'}
            </dd>
            <dt>Référence</dt>
            <dd>{d.reference ?? '—'}</dd>
            <dt>Nom</dt>
            <dd>{d.donorName ?? '—'}</dd>
            <dt>Téléphone</dt>
            <dd>{d.donorPhone ?? '—'}</dd>
            <dt>Compte</dt>
            <dd>{d.user.email ?? '(compte supprimé)'}</dd>
            <dt>Créé le</dt>
            <dd>{new Date(d.createdAt).toLocaleString('fr-FR')}</dd>
          </dl>
          {d.hasProof ? (
            <>
              <button onClick={() => void showProof()}>Voir la preuve</button>
              {proofError ? <p className="error">{proofError}</p> : null}
              {proofUrl ? (
                <p>
                  <a href={proofUrl} target="_blank" rel="noreferrer noopener">
                    Ouvrir la preuve dans un nouvel onglet
                  </a>
                  <span className="muted small"> (lien temporaire)</span>
                </p>
              ) : null}
            </>
          ) : (
            <p className="muted">Aucune preuve jointe.</p>
          )}
        </section>

        <section className="card">
          <h2>Décision</h2>
          {isFinalStatus(d.status) ? (
            <p>
              Décision finale : <StatusBadge status={d.status} />
              {d.reviewedBy?.email ? ` par ${d.reviewedBy.email}` : ''}
              {d.rejectionReason ? ` — ${d.rejectionReason}` : ''}
            </p>
          ) : ownDonation ? (
            <p className="warning">
              Vous êtes l’auteur de ce don : un autre administrateur doit le vérifier.
            </p>
          ) : (
            <>
              <p className="muted">
                Vérifiez sur le relevé de l’opérateur qu’un transfert de{' '}
                <strong>{formatMRU(d.amount)}</strong> a bien été reçu
                {d.reference ? ` avec la référence ${d.reference}` : ''}.
              </p>
              <label>
                Note (facultatif)
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
              </label>
              <button className="ok" disabled={confirm.isPending} onClick={() => confirm.mutate()}>
                Confirmer la réception
              </button>
              <hr />
              <label>
                Motif du refus (obligatoire)
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  placeholder="Ex. référence introuvable"
                />
              </label>
              <button
                className="danger"
                disabled={reason.trim().length < 3 || reject.isPending}
                onClick={() => reject.mutate()}
              >
                Refuser
              </button>
              {confirm.isError || reject.isError ? (
                <p className="error">{errorMessage(confirm.error ?? reject.error)}</p>
              ) : null}
            </>
          )}
        </section>
      </div>

      <h2>Historique</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Changement</th>
            <th>Par</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {d.events.map((e, i) => (
            <tr key={i}>
              <td>{new Date(e.createdAt).toLocaleString('fr-FR')}</td>
              <td>
                {e.fromStatus ? `${STATUS_LABELS[e.fromStatus]} → ` : ''}
                {STATUS_LABELS[e.toStatus]}
              </td>
              <td>{e.actor?.email ?? '—'}</td>
              <td>{e.note ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
