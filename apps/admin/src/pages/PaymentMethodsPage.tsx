import { normalizeMauritanianPhone } from '@lawhi/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi, errorMessage, type PaymentMethodRow } from '../lib/api';

function MethodRow({ method }: { method: PaymentMethodRow }) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState(method.phoneNumber ?? '');
  const [instructions, setInstructions] = useState(method.instructions ?? '');
  const save = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.updatePaymentMethod>[1]) =>
      adminApi.updatePaymentMethod(method.id, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['payment-methods'] }),
  });
  const normalized = phone.trim() ? normalizeMauritanianPhone(phone) : null;
  const phoneInvalid = phone.trim().length > 0 && !normalized;

  return (
    <tr>
      <td>
        <strong>{method.name}</strong>
      </td>
      <td>
        <input
          aria-label={`Numéro ${method.name}`}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="8 chiffres"
        />
        {phoneInvalid ? <div className="error small">Numéro mauritanien invalide</div> : null}
      </td>
      <td>
        <textarea
          aria-label={`Instructions ${method.name}`}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
        />
      </td>
      <td>
        <button
          disabled={phoneInvalid || save.isPending}
          onClick={() =>
            save.mutate({ phoneNumber: normalized, instructions: instructions.trim() || null })
          }
        >
          Enregistrer
        </button>
      </td>
      <td>
        <label className="inline">
          <input
            type="checkbox"
            checked={method.enabled}
            disabled={save.isPending || (!method.enabled && !method.phoneNumber)}
            onChange={(e) => save.mutate({ enabled: e.target.checked })}
          />
          {method.enabled ? 'Actif' : 'Inactif'}
        </label>
        {!method.phoneNumber ? <div className="muted small">Numéro requis</div> : null}
        {save.isError ? <div className="error small">{errorMessage(save.error)}</div> : null}
      </td>
    </tr>
  );
}

export function PaymentMethodsPage() {
  const methods = useQuery({ queryKey: ['payment-methods'], queryFn: adminApi.paymentMethods });
  return (
    <>
      <h1>Moyens de paiement</h1>
      <p className="muted">
        Saisissez le numéro officiel de chaque opérateur. Un moyen n’est proposé aux donateurs
        qu’une fois activé, et il ne peut être activé qu’avec un numéro. N’utilisez jamais le même
        numéro pour tous les opérateurs sans l’avoir vérifié.
      </p>
      {methods.isError ? <p className="error">{errorMessage(methods.error)}</p> : null}
      {methods.data ? (
        <table>
          <thead>
            <tr>
              <th>Opérateur</th>
              <th>Numéro</th>
              <th>Instructions affichées</th>
              <th></th>
              <th>État</th>
            </tr>
          </thead>
          <tbody>
            {methods.data.map((m) => (
              <MethodRow key={`${m.id}-${m.phoneNumber}-${m.instructions}`} method={m} />
            ))}
          </tbody>
        </table>
      ) : null}
    </>
  );
}
