import { CAUSE_STATUSES, formatMRU, slugify, type CauseStatus } from '@lawhi/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi, errorMessage, mediaUrl, type CauseInput, type CauseRow } from '../lib/api';

export const CAUSE_STATUS_LABELS: Record<CauseStatus, string> = {
  upcoming: 'À venir',
  ongoing: 'En cours',
  completed: 'Réalisé',
};

const EMPTY: CauseInput = {
  titleFr: '',
  titleAr: '',
  titleEn: '',
  descriptionFr: '',
  descriptionAr: '',
  descriptionEn: '',
  status: 'ongoing',
  eventDate: null,
  goalAmount: null,
  collectedAmount: 0,
  featured: false,
  active: true,
  sortOrder: 0,
};

function toInput(cause: CauseRow): CauseInput {
  const { id: _id, slug: _slug, imageUrl: _image, eventDate, ...rest } = cause;
  return { ...rest, eventDate: eventDate ? eventDate.slice(0, 10) : null };
}

function numberOrNull(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

function CauseForm({
  initial,
  withSlug,
  submitLabel,
  pending,
  onSubmit,
}: {
  initial: CauseInput;
  withSlug: boolean;
  submitLabel: string;
  pending: boolean;
  onSubmit: (input: CauseInput, slug: string) => void;
}) {
  const [form, setForm] = useState(initial);
  const [slug, setSlug] = useState<string | null>(null);
  const set = <K extends keyof CauseInput>(key: K, value: CauseInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const effectiveSlug = slug ?? slugify(form.titleFr);
  const textsMissing = (
    ['titleFr', 'titleAr', 'titleEn', 'descriptionFr', 'descriptionAr', 'descriptionEn'] as const
  ).some((k) => form[k].trim().length < 2);
  const invalid = textsMissing || (withSlug && !/^[a-z0-9-]{2,60}$/.test(effectiveSlug));

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid) onSubmit(form, effectiveSlug);
      }}
    >
      <div className="grid2">
        <label>
          Titre (français)
          <input value={form.titleFr} onChange={(e) => set('titleFr', e.target.value)} />
        </label>
        <label>
          العنوان (arabe)
          <input dir="rtl" value={form.titleAr} onChange={(e) => set('titleAr', e.target.value)} />
        </label>
        <label>
          Title (anglais)
          <input value={form.titleEn} onChange={(e) => set('titleEn', e.target.value)} />
        </label>
        {withSlug ? (
          <label>
            Identifiant (slug)
            <input value={effectiveSlug} onChange={(e) => setSlug(e.target.value)} />
          </label>
        ) : null}
      </div>
      <div className="grid2">
        <label>
          Description (français)
          <textarea
            rows={3}
            value={form.descriptionFr}
            onChange={(e) => set('descriptionFr', e.target.value)}
          />
        </label>
        <label>
          الوصف (arabe)
          <textarea
            dir="rtl"
            rows={3}
            value={form.descriptionAr}
            onChange={(e) => set('descriptionAr', e.target.value)}
          />
        </label>
        <label>
          Description (anglais)
          <textarea
            rows={3}
            value={form.descriptionEn}
            onChange={(e) => set('descriptionEn', e.target.value)}
          />
        </label>
      </div>
      <div className="grid2">
        <label>
          Statut
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value as CauseStatus)}
          >
            {CAUSE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CAUSE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date (facultative)
          <input
            type="date"
            value={form.eventDate ?? ''}
            onChange={(e) => set('eventDate', e.target.value || null)}
          />
        </label>
        <label>
          Objectif (MRU, facultatif)
          <input
            inputMode="numeric"
            value={form.goalAmount ?? ''}
            onChange={(e) => set('goalAmount', numberOrNull(e.target.value))}
            placeholder="sans objectif"
          />
        </label>
        <label>
          Déjà collecté (MRU)
          <input
            inputMode="numeric"
            value={form.collectedAmount}
            onChange={(e) => set('collectedAmount', numberOrNull(e.target.value) ?? 0)}
          />
        </label>
        <label>
          Ordre d’affichage
          <input
            inputMode="numeric"
            value={form.sortOrder}
            onChange={(e) => set('sortOrder', Math.min(1000, numberOrNull(e.target.value) ?? 0))}
          />
        </label>
      </div>
      <label className="inline">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set('active', e.target.checked)}
        />{' '}
        Visible dans l’app
      </label>
      <label className="inline">
        <input
          type="checkbox"
          checked={form.featured}
          onChange={(e) => set('featured', e.target.checked)}
        />{' '}
        Mis en avant
      </label>
      {invalid ? (
        <p className="muted small">Titres et descriptions requis dans les trois langues.</p>
      ) : null}
      <button type="submit" disabled={invalid || pending}>
        {submitLabel}
      </button>
    </form>
  );
}

function CauseCard({ cause }: { cause: CauseRow }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['causes'] });
  const save = useMutation({
    mutationFn: (input: CauseInput) => adminApi.updateCause(cause.id, input),
    onSuccess: () => {
      setEditing(false);
      refresh();
    },
  });
  const image = useMutation({
    mutationFn: (file: File | null) =>
      file ? adminApi.uploadCauseImage(cause.id, file) : adminApi.removeCauseImage(cause.id),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => adminApi.deleteCause(cause.id),
    onSuccess: (result) => {
      if (result.archived) {
        window.alert(
          'Ce projet a déjà des dons enregistrés : il a été masqué plutôt que supprimé.',
        );
      }
      refresh();
    },
  });
  const error = save.error ?? image.error ?? remove.error;

  return (
    <section className="card">
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {cause.imageUrl ? (
          <img
            src={mediaUrl(cause.imageUrl)}
            alt=""
            style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }}
          />
        ) : null}
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ margin: 0 }}>{cause.titleFr}</h2>
          <div className="muted small">
            {CAUSE_STATUS_LABELS[cause.status]}
            {cause.eventDate ? ` · ${new Date(cause.eventDate).toLocaleDateString('fr-FR')}` : ''}
            {cause.goalAmount
              ? ` · ${formatMRU(cause.collectedAmount)} / ${formatMRU(cause.goalAmount)}`
              : ''}
            {cause.active ? '' : ' · masqué'}
            {cause.featured ? ' · mis en avant' : ''}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setEditing((e) => !e)}>{editing ? 'Fermer' : 'Modifier'}</button>
        <label className="inline">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={image.isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) image.mutate(file);
              e.target.value = '';
            }}
          />
        </label>
        {cause.imageUrl ? (
          <button className="link" disabled={image.isPending} onClick={() => image.mutate(null)}>
            Retirer l’image
          </button>
        ) : null}
        <button
          className="danger"
          disabled={remove.isPending}
          onClick={() => {
            if (window.confirm(`Supprimer « ${cause.titleFr} » ?`)) remove.mutate();
          }}
        >
          Supprimer
        </button>
      </div>
      {editing ? (
        <CauseForm
          initial={toInput(cause)}
          withSlug={false}
          submitLabel="Enregistrer"
          pending={save.isPending}
          onSubmit={(input) => save.mutate(input)}
        />
      ) : null}
      {error ? <p className="error small">{errorMessage(error)}</p> : null}
    </section>
  );
}

function NewCause() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const create = useMutation({
    mutationFn: ({ input, slug }: { input: CauseInput; slug: string }) =>
      adminApi.createCause({ ...input, slug }),
    onSuccess: () => {
      setOpen(false);
      setFormKey((k) => k + 1);
      void queryClient.invalidateQueries({ queryKey: ['causes'] });
    },
  });
  if (!open) return <button onClick={() => setOpen(true)}>Nouveau projet</button>;
  return (
    <>
      <h2>Nouveau projet</h2>
      <CauseForm
        key={formKey}
        initial={EMPTY}
        withSlug
        submitLabel="Créer le projet"
        pending={create.isPending}
        onSubmit={(input, slug) => create.mutate({ input, slug })}
      />
      {create.isError ? <p className="error">{errorMessage(create.error)}</p> : null}
      <button className="link" onClick={() => setOpen(false)}>
        Annuler
      </button>
    </>
  );
}

export function CausesPage() {
  const causes = useQuery({ queryKey: ['causes'], queryFn: adminApi.causes });
  return (
    <>
      <h1>Projets & événements</h1>
      <p className="muted">
        Affichés sur l’écran Sadgue. Une image facultative (JPG, PNG ou WebP, 2 Mo maximum) peut
        illustrer chaque projet.
      </p>
      <NewCause />
      {causes.isError ? <p className="error">{errorMessage(causes.error)}</p> : null}
      {causes.data?.map((c) => (
        <CauseCard key={c.id} cause={c} />
      ))}
    </>
  );
}
