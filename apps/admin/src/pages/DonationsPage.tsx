import { DONATION_STATUSES, formatMRU, type DonationStatus } from '@lawhi/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { STATUS_LABELS, StatusBadge } from '../components/StatusBadge';
import { adminApi, errorMessage } from '../lib/api';

export function DonationsPage() {
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as DonationStatus | null) ?? undefined;
  const q = params.get('q') ?? undefined;
  const page = Number(params.get('page') ?? '1');
  const [search, setSearch] = useState(q ?? '');

  const list = useQuery({
    queryKey: ['donations', status, q, page],
    queryFn: () => adminApi.donations({ status, q, page }),
    placeholderData: keepPreviousData,
  });

  const update = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    setParams(merged);
  };

  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <>
      <h1>Dons</h1>
      <div className="filters">
        <label>
          Statut
          <select
            value={status ?? ''}
            onChange={(e) => update({ status: e.target.value || undefined, page: undefined })}
          >
            <option value="">Tous</option>
            {DONATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: search.trim() || undefined, page: undefined });
          }}
        >
          <label>
            Recherche (code, référence, nom, téléphone)
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="LW-…, BK-…, 22…"
            />
          </label>
          <button type="submit">Rechercher</button>
        </form>
      </div>

      {list.isError ? <p className="error">{errorMessage(list.error)}</p> : null}
      {list.data ? (
        <>
          <p className="muted">{list.data.total} don(s)</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Code</th>
                <th>Montant</th>
                <th>Projet</th>
                <th>Moyen</th>
                <th>Donateur</th>
                <th>Référence</th>
                <th>Preuve</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((d) => (
                <tr key={d.id}>
                  <td>{new Date(d.createdAt).toLocaleString('fr-FR')}</td>
                  <td>
                    <Link to={`/donations/${d.id}`}>{d.code}</Link>
                  </td>
                  <td className="num">{formatMRU(d.amount)}</td>
                  <td>{d.cause.titleFr}</td>
                  <td>{d.paymentMethod.name}</td>
                  <td>
                    {d.donorName ?? '—'}
                    <br />
                    <span className="muted small">{d.donorPhone ?? d.user.email ?? ''}</span>
                  </td>
                  <td>{d.reference ?? '—'}</td>
                  <td>{d.hasProof ? 'Oui' : '—'}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                </tr>
              ))}
              {list.data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="muted">
                    Aucun don.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="pager">
            <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
              Précédent
            </button>
            <span>
              Page {page} / {pages}
            </span>
            <button disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>
              Suivant
            </button>
          </div>
        </>
      ) : list.isPending ? (
        <p>Chargement…</p>
      ) : null}
    </>
  );
}
