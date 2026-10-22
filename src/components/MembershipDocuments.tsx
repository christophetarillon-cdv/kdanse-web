'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { db } from '@/lib/firebase';

interface DocumentItem {
  id: string;
  type: 'invoice' | 'attestation';
  number: string;
  issuedAt: Date | null;
  amount: number;
  membershipIds: string[];
}

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export default function MembershipDocuments({ membershipId, userId }: { membershipId: string; userId: string }) {
  const [items, setItems] = useState<DocumentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'documents'), where('userId', '==', userId)));
        setItems(
          snap.docs
            .map((d) => ({
              id: d.id,
              type: d.data().type,
              number: d.data().number ?? d.id,
              issuedAt: d.data().issuedAt?.toDate?.() ?? null,
              amount: Number(d.data().amount ?? 0),
              membershipIds: (d.data().membershipIds ?? []) as string[],
            }))
            .filter((d) => d.membershipIds.includes(membershipId))
            .sort((a, b) => (b.issuedAt?.getTime() ?? 0) - (a.issuedAt?.getTime() ?? 0))
        );
      } catch (err) {
        console.error('Error loading documents:', err);
        setError('Documents indisponibles');
      }
    };
    load();
  }, [membershipId, userId]);

  const open = async (documentId: string) => {
    const win = window.open('', '_blank');
    try {
      const callable = httpsCallable<{ documentId: string }, { url: string }>(getFunctions(app, 'europe-west3'), 'getDocumentUrl');
      const result = await callable({ documentId });
      if (win) win.location.href = result.data.url;
    } catch (err) {
      console.error('Error opening document:', err);
      if (win) win.close();
      alert('Impossible d’ouvrir le document');
    }
  };

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (items === null) return null;
  if (items.length === 0) return <p className="text-sm text-gray-700">Aucun document pour le moment</p>;

  return (
    <ul className="space-y-2">
      {items.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-900">
          <span>
            {d.type === 'invoice' ? 'Facture' : 'Attestation de paiement'} {d.number}
            {d.issuedAt ? ` · ${d.issuedAt.toLocaleDateString('fr-FR')}` : ''} · {eur(d.amount)}
          </span>
          <button onClick={() => open(d.id)} className="text-gold-deep underline font-semibold">
            Télécharger le PDF
          </button>
        </li>
      ))}
    </ul>
  );
}
