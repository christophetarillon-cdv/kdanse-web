'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface BordereauItem {
  donor: string;
  chequeNumber?: string;
  chequeBank?: string;
  chequeCity?: string;
  chequeName?: string;
  amount: number;
  date: Date | null;
}

interface BordereauDetail {
  reference: string;
  createdAt: Date | null;
  count: number;
  amount: number;
  items: BordereauItem[];
}

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const formatDate = (d: Date | null) => (d ? d.toLocaleDateString('fr-FR') : '—');

const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: unknown }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export default function BordereauDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [bordereau, setBordereau] = useState<BordereauDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('admin')) {
      router.push('/dashboard');
      return;
    }
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'bordereaux', params.id));
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const data = snap.data();
        setBordereau({
          reference: data.reference ?? '',
          createdAt: toDate(data.createdAt),
          count: Number(data.count ?? 0),
          amount: Number(data.amount ?? 0),
          items: ((data.items ?? []) as Record<string, unknown>[]).map((item) => ({
            donor: String(item.donor ?? 'Inconnu'),
            chequeNumber: item.chequeNumber as string | undefined,
            chequeBank: item.chequeBank as string | undefined,
            chequeCity: item.chequeCity as string | undefined,
            chequeName: item.chequeName as string | undefined,
            amount: Number(item.amount ?? 0),
            date: toDate(item.date),
          })),
        });
      } catch (error) {
        console.error('Error loading bordereau:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading, user, router, params.id]);

  if (authLoading || loading) return <div className="p-8 text-gray-900">Chargement...</div>;

  if (notFound || !bordereau) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-gray-900 font-medium">Bordereau introuvable.</p>
        <Link href="/admin/mises-en-banque" className="text-gold-deep underline">
          ← Retour aux mises en banque
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-8 space-y-6 print:p-0">
      <div className="flex flex-wrap justify-between items-start gap-4 print:hidden">
        <Link
          href="/admin/mises-en-banque"
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition"
        >
          ← Mises en banque
        </Link>
        <button
          onClick={() => window.print()}
          className="bg-ink hover:bg-ink-soft text-white px-4 py-2 rounded font-semibold transition"
        >
          🖨️ Imprimer
        </button>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Bordereau {bordereau.reference}</h1>
        <p className="text-gray-900 font-medium">
          Remise du {formatDate(bordereau.createdAt)} · {bordereau.count} chèque(s) · {eur(bordereau.amount)}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr className="text-left font-semibold text-gray-900">
              <th className="px-4 py-3">Reçu le</th>
              <th className="px-4 py-3">Donneur d&apos;ordre</th>
              <th className="px-4 py-3">N° chèque</th>
              <th className="px-4 py-3">Banque</th>
              <th className="px-4 py-3">Ville</th>
              <th className="px-4 py-3">Nom sur le chèque</th>
              <th className="px-4 py-3 text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bordereau.items.map((item, index) => (
              <tr key={index} className="text-gray-900">
                <td className="px-4 py-3">{formatDate(item.date)}</td>
                <td className="px-4 py-3 font-semibold">{item.donor}</td>
                <td className="px-4 py-3">{item.chequeNumber || '—'}</td>
                <td className="px-4 py-3">{item.chequeBank || '—'}</td>
                <td className="px-4 py-3">{item.chequeCity || '—'}</td>
                <td className="px-4 py-3">{item.chequeName || '—'}</td>
                <td className="px-4 py-3 text-right font-semibold">{eur(item.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2">
            <tr className="font-bold text-gray-900">
              <td className="px-4 py-3" colSpan={6}>Total</td>
              <td className="px-4 py-3 text-right">{eur(bordereau.amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
