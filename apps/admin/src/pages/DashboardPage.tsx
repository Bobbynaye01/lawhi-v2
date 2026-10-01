import { formatMRU } from '@lawhi/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { STATUS_LABELS } from '../components/StatusBadge';
import { adminApi, errorMessage } from '../lib/api';

export function DashboardPage() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: adminApi.stats });
  const methods = useQuery({ queryKey: ['payment-methods'], queryFn: adminApi.paymentMethods });

  if (stats.isPending) return <p>Chargement…</p>;
  if (stats.isError) return <p className="error">{errorMessage(stats.error)}</p>;

  const toReview = stats.data.byStatus.filter(
    (s) => s.status === 'pending' || s.status === 'submitted',
  );
  const confirmed = stats.data.byStatus.find((s) => s.status === 'confirmed');
  const enabledMethods = methods.data?.filter((m) => m.enabled).length ?? 0;

  return (
    <>
      <h1>Tableau de bord</h1>
      {methods.data && enabledMethods === 0 ? (
        <p className="warning" role="alert">
          Aucun moyen de paiement n’est activé : les fidèles ne peuvent pas encore donner.{' '}
          <Link to="/payment-methods">Configurer les numéros officiels</Link>
        </p>
      ) : null}
      <div className="tiles">
        <div className="tile">
          <span className="muted">Confirmé (total)</span>
          <strong>{formatMRU(confirmed?.amount ?? 0)}</strong>
          <span className="muted small">{confirmed?.count ?? 0} dons</span>
        </div>
        {toReview.map((s) => (
          <Link key={s.status} className="tile" to={`/donations?status=${s.status}`}>
            <span className="muted">{STATUS_LABELS[s.status]}</span>
            <strong>{s.count}</strong>
            <span className="muted small">{formatMRU(s.amount)} déclarés</span>
          </Link>
        ))}
      </div>

      <h2>Confirmé par projet</h2>
      <table>
        <thead>
          <tr>
            <th>Projet</th>
            <th>Dons</th>
            <th>Montant</th>
            <th>Objectif</th>
          </tr>
        </thead>
        <tbody>
          {stats.data.confirmedByCause.map((c) => (
            <tr key={c.causeId}>
              <td>{c.title}</td>
              <td>{c.count}</td>
              <td>{formatMRU(c.amount)}</td>
              <td>
                {c.goalAmount
                  ? `${formatMRU(c.goalAmount)} (${Math.round((c.amount / c.goalAmount) * 100)} %)`
                  : '—'}
              </td>
            </tr>
          ))}
          {stats.data.confirmedByCause.length === 0 ? (
            <tr>
              <td colSpan={4} className="muted">
                Aucun don confirmé pour l’instant.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <h2>Confirmé par moyen de paiement</h2>
      <table>
        <thead>
          <tr>
            <th>Moyen</th>
            <th>Dons</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          {stats.data.confirmedByMethod.map((m) => (
            <tr key={m.paymentMethodId}>
              <td>{m.name}</td>
              <td>{m.count}</td>
              <td>{formatMRU(m.amount)}</td>
            </tr>
          ))}
          {stats.data.confirmedByMethod.length === 0 ? (
            <tr>
              <td colSpan={3} className="muted">
                —
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </>
  );
}
