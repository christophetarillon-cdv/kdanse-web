'use client';

import { PaymentDetailsDraft } from '@/types';

type Method = PaymentDetailsDraft['method'];

interface PaymentDetailsFormProps {
  draft: PaymentDetailsDraft;
  onChange: (draft: PaymentDetailsDraft) => void;
  methods: { value: Method; label: string }[];
  dateLabel: string;
}

const inputClass = 'w-full border rounded px-3 py-2 text-sm text-gray-900';

export default function PaymentDetailsForm({ draft, onChange, methods, dateLabel }: PaymentDetailsFormProps) {
  const set = (patch: Partial<PaymentDetailsDraft>) => onChange({ ...draft, ...patch });

  return (
    <div className="bg-gray-50 p-4 rounded space-y-3">
      <label className="block text-sm font-medium text-gray-900">
        Montant (€)
        <input
          type="number"
          step="0.01"
          min="0"
          value={draft.amount}
          onChange={(e) => set({ amount: parseFloat(e.target.value) || 0 })}
          className={`${inputClass} mt-1`}
        />
      </label>

      <label className="block text-sm font-medium text-gray-900">
        {dateLabel}
        <input
          type="date"
          value={draft.date}
          onChange={(e) => set({ date: e.target.value })}
          className={`${inputClass} mt-1`}
        />
      </label>

      <label className="block text-sm font-medium text-gray-900">
        Mode de règlement
        <select
          value={draft.method}
          onChange={(e) => set({ method: e.target.value as Method })}
          className={`${inputClass} mt-1`}
        >
          {methods.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      {draft.method === 'cheque' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={draft.chequeNumber || ''}
            onChange={(e) => set({ chequeNumber: e.target.value })}
            placeholder="N° chèque"
            className={inputClass}
          />
          <input
            type="text"
            value={draft.chequeBank || ''}
            onChange={(e) => set({ chequeBank: e.target.value })}
            placeholder="Banque"
            className={inputClass}
          />
          <input
            type="text"
            value={draft.chequeCity || ''}
            onChange={(e) => set({ chequeCity: e.target.value })}
            placeholder="Ville"
            className={inputClass}
          />
          <input
            type="text"
            value={draft.chequeName || ''}
            onChange={(e) => set({ chequeName: e.target.value })}
            placeholder="Nom (optionnel)"
            className={inputClass}
          />
        </div>
      )}

      {draft.method === 'cheque_vacances' && (
        <label className="block text-sm font-medium text-gray-900">
          Nombre de chèques vacances
          <input
            type="number"
            min="0"
            value={draft.chequeVacancesCount || ''}
            onChange={(e) => set({ chequeVacancesCount: parseInt(e.target.value, 10) || 0 })}
            className={`${inputClass} mt-1`}
          />
        </label>
      )}
    </div>
  );
}
