import { formatMRU } from '@lawhi/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi, errorMessage, type CauseRow } from '../lib/api';

function CauseEditor({ cause }: { cause: CauseRow }) {
  const queryClient = useQueryClient();
  const [goal, setGoal] = useState(cause.goalAmount ? String(cause.goalAmount) : '');
  const save = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.updateCause>[1]) =>
      adminApi.updateCause(cause.id, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['causes'] }),
  });
  const goalValue = goal.trim() ? Number(goal) : null;
  const goalInvalid = goalValue !== null && (!Number.isInteger(goalValue) || goalValue <= 0);

  return (
    <tr>
      <td>
        <strong>{cause.titleFr}</strong>
        <div className="muted small" dir="rtl">
          {cause.titleAr}
        </div>
      </td>
      <td>
        <input
          aria-label={`Objectif ${cause.titleFr}`}
          value={goal}
          onChange={(e) => setGoal(e.target.value.replace(/\D/g, ''))}
          placeholder="sans objectif"
        />
        <div className="muted small">
          {goalValue ? formatMRU(goalValue) : 'Aucun objectif affiché'}
        </div>
      </td>
      <td>
        <button
          disabled={goalInvalid || save.isPending}
          onClick={() => save.mutate({ goalAmount: goalValue })}
        >
          Enregistrer
        </button>
      </td>
      <td>
        <label className="inline">
          <input
            type="checkbox"
            checked={cause.active}
            onChange={(e) => save.mutate({ active: e.target.checked })}
          />{' '}
          Ouvert aux dons
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={cause.featured}
            onChange={(e) => save.mutate({ featured: e.target.checked })}
          />{' '}
          Mis en avant
        </label>
        {save.isError ? <div className="error small">{errorMessage(save.error)}</div> : null}
      </td>
    </tr>
  );
}

function PresetsEditor() {
  const queryClient = useQueryClient();
  const config = useQuery({ queryKey: ['public-config'], queryFn: adminApi.publicConfig });
  const [text, setText] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: adminApi.setPresets,
    onSuccess: () => {
      setText(null);
      void queryClient.invalidateQueries({ queryKey: ['public-config'] });
    },
  });
  const current = text ?? config.data?.donations.presets.join(', ') ?? '';
  const parsed = current
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number);
  const invalid =
    parsed.length === 0 || parsed.length > 8 || parsed.some((n) => !Number.isInteger(n) || n <= 0);

  return (
    <section className="card">
      <h2>Montants proposés aux donateurs (MRU)</h2>
      <input
        aria-label="Montants proposés"
        value={current}
        onChange={(e) => setText(e.target.value)}
      />
      <p className="muted small">
        {invalid
          ? 'Entre 1 et 8 montants entiers, séparés par des virgules.'
          : parsed.map(formatMRU).join(' · ')}
      </p>
      <button disabled={invalid || save.isPending} onClick={() => save.mutate(parsed)}>
        Enregistrer
      </button>
      {save.isError ? <p className="error">{errorMessage(save.error)}</p> : null}
    </section>
  );
}

export function CausesPage() {
  const causes = useQuery({ queryKey: ['causes'], queryFn: adminApi.causes });
  return (
    <>
      <h1>Projets & montants</h1>
      <p className="muted">
        La progression affichée aux donateurs ne compte que les dons confirmés.
      </p>
      {causes.isError ? <p className="error">{errorMessage(causes.error)}</p> : null}
      {causes.data ? (
        <table>
          <thead>
            <tr>
              <th>Projet</th>
              <th>Objectif (MRU)</th>
              <th></th>
              <th>Visibilité</th>
            </tr>
          </thead>
          <tbody>
            {causes.data.map((c) => (
              <CauseEditor key={`${c.id}-${c.goalAmount}`} cause={c} />
            ))}
          </tbody>
        </table>
      ) : null}
      <PresetsEditor />
    </>
  );
}
