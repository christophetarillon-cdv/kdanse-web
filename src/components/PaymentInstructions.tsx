'use client';

import { useEffect, useState } from 'react';
import { getPaymentSettings } from '@/services/paymentPlanService';
import { PaymentSettings } from '@/types';

type Method = 'helloasso' | 'virement' | 'cheque';

export default function PaymentInstructions({ method }: { method: Method }) {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);

  useEffect(() => {
    if (method === 'helloasso') return;
    getPaymentSettings()
      .then(setSettings)
      .catch((err) => console.error('Error loading payment settings:', err));
  }, [method]);

  const box = 'p-4 bg-gold-50 border border-gold-200 rounded-lg text-sm text-ink space-y-2';

  if (method === 'helloasso') {
    return (
      <div className={box}>
        <p className="font-semibold">Paiement sécurisé par HelloAsso</p>
        <p>
          HelloAsso peut vous proposer un don facultatif. Ce don n&apos;est pas obligatoire : vous pouvez le modifier ou
          le décocher. Le montant payé ne dépasse jamais le tarif du stage.
        </p>
        <p>Votre inscription est confirmée dès que le paiement est reçu.</p>
      </div>
    );
  }

  if (method === 'virement') {
    return (
      <div className={box}>
        <p className="font-semibold">Virement bancaire</p>
        <p>Merci d&apos;effectuer le virement sur le compte suivant, en indiquant le nom du danseur en libellé :</p>
        <div className="bg-white rounded p-3 space-y-1">
          <p>
            <strong>Titulaire :</strong> {settings?.bankAccount?.accountName || '—'}
          </p>
          <p>
            <strong>IBAN :</strong> {settings?.bankAccount?.iban || '—'}
          </p>
          <p>
            <strong>BIC :</strong> {settings?.bankAccount?.bic || '—'}
          </p>
        </div>
        <p>Votre inscription sera confirmée une fois le virement reçu.</p>
      </div>
    );
  }

  return (
    <div className={box}>
      <p className="font-semibold">Chèque</p>
      <p>Merci d&apos;établir votre chèque à l&apos;ordre de :</p>
      <div className="bg-white rounded p-3 space-y-1">
        <p>
          <strong>{settings?.chequePayee || '—'}</strong>
        </p>
      </div>
      <p>Et de l&apos;envoyer à l&apos;adresse suivante, en indiquant le nom du danseur au dos du chèque :</p>
      <div className="bg-white rounded p-3">
        <p>{settings?.postalAddress?.street || '—'}</p>
        <p>
          {[settings?.postalAddress?.postalCode, settings?.postalAddress?.city].filter(Boolean).join(' ') || '—'}
        </p>
        <p>{settings?.postalAddress?.country || ''}</p>
      </div>
      <p>Votre inscription sera confirmée une fois le chèque reçu.</p>
    </div>
  );
}
