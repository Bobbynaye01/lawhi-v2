import { formatMRU, normalizeMauritanianPhone } from '@lawhi/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi, errorMessage } from '../lib/api';

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('fr-FR') : 'jamais';
}

/** The balance card and the Bankily number every donor sees on the Sadaqa screen. */
export function SummaryPage() {
  const queryClient = useQueryClient();
  const summary = useQuery({ queryKey: ['summary'], queryFn: adminApi.summary });
  const [total, setTotal] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: adminApi.updateSummary,
    onSuccess: (data) => {
      queryClient.setQueryData(['summary'], data);
      setTotal(null);
      setPhone(null);
    },
  });

  const totalText = total ?? (summary.data ? String(summary.data.totalAmount) : '');
  const phoneText = phone ?? summary.data?.bankilyPhone ?? '';
  const totalValue = totalText.trim() ? Number(totalText) : null;
  const phoneValue = normalizeMauritanianPhone(phoneText);

  return (
    <>
      <h1>Solde & Bankily</h1>
      <p className="muted">
        Ces informations s’affichent en haut de l’écran Sadgue, pour tous les utilisateurs.
      </p>
      {summary.isError ? <p className="error">{errorMessage(summary.error)}</p> : null}
      <div className="grid2">
        <section className="card">
          <h2>Total des dons</h2>
          <label>
            Montant total actuel (MRU)
            <input
              inputMode="numeric"
              value={totalText}
              onChange={(e) => setTotal(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <p className="muted small">
            {totalValue !== null ? formatMRU(totalValue) : 'Saisissez un montant'} · mis à jour le{' '}
            {formatDate(summary.data?.updatedAt ?? null)}
          </p>
          <button
            disabled={totalValue === null || save.isPending}
            onClick={() => totalValue !== null && save.mutate({ totalAmount: totalValue })}
          >
            Mettre à jour le total
          </button>
        </section>
        <section className="card">
          <h2>Numéro Bankily</h2>
          <label>
            Numéro qui reçoit les dons
            <input
              inputMode="tel"
              value={phoneText}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="22 33 44 55"
            />
          </label>
          <p className={phoneText && !phoneValue ? 'error small' : 'muted small'}>
            {phoneText && !phoneValue
              ? '8 chiffres commençant par 2, 3 ou 4.'
              : summary.data?.bankilyPhone
                ? `Affiché actuellement : ${summary.data.bankilyPhone}`
                : 'Aucun numéro affiché pour l’instant.'}
          </p>
          <button
            disabled={!phoneValue || save.isPending}
            onClick={() => phoneValue && save.mutate({ bankilyPhone: phoneValue })}
          >
            Enregistrer le numéro
          </button>
        </section>
      </div>
      {save.isError ? <p className="error">{errorMessage(save.error)}</p> : null}
      {save.isSuccess ? <p className="muted">Enregistré ✓</p> : null}
    </>
  );
}
