'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPaymentSettings, savePaymentSettings } from '@/services/paymentPlanService';
import { PaymentSettings } from '@/types';

export default function AdminBankSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings>({
    id: 'settings',
    bankAccount: {
      iban: '',
      bic: '',
      accountName: '',
    },
    postalAddress: {
      street: '',
      city: '',
      postalCode: '',
      country: 'France',
    },
    updatedAt: new Date(),
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user?.roles?.includes('admin')) {
        router.push('/dashboard');
        return;
      }
      fetchSettings();
    }
  }, [authLoading, user, router]);

  const fetchSettings = async () => {
    try {
      const data = await getPaymentSettings();
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { id, updatedAt, ...dataToSave } = settings;
      await savePaymentSettings(dataToSave);
      alert('Paramètres sauvegardés!');
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="space-y-8 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">🏦 Paramètres bancaires</h1>
          <p className="text-gray-600">Configurez les coordonnées pour les virements et adresse pour les chèques</p>
        </div>
        <Link
          href="/admin/payment-plans"
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition whitespace-nowrap"
        >
          ← Plans de paiement
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
        {/* Compte bancaire */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">💳 Compte bancaire (pour virements)</h2>

          <div>
            <label className="block text-sm font-medium mb-2">IBAN</label>
            <input
              type="text"
              value={settings.bankAccount?.iban || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bankAccount: {
                    ...settings.bankAccount!,
                    iban: e.target.value,
                  },
                })
              }
              placeholder="FR1420041010050500013M02606"
              className="w-full border rounded px-4 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">Format: 27 caractères</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">BIC</label>
            <input
              type="text"
              value={settings.bankAccount?.bic || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bankAccount: {
                    ...settings.bankAccount!,
                    bic: e.target.value,
                  },
                })
              }
              placeholder="PCHQFRPP"
              className="w-full border rounded px-4 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">Code SWIFT/BIC (8 caractères)</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Titulaire du compte</label>
            <input
              type="text"
              value={settings.bankAccount?.accountName || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bankAccount: {
                    ...settings.bankAccount!,
                    accountName: e.target.value,
                  },
                })
              }
              placeholder="Kdanse SARL"
              className="w-full border rounded px-4 py-2"
            />
          </div>
        </div>

        <hr />

        {/* Adresse postale */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">📮 Adresse postale (pour chèques)</h2>

          <div>
            <label className="block text-sm font-medium mb-2">Rue</label>
            <input
              type="text"
              value={settings.postalAddress?.street || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  postalAddress: {
                    ...settings.postalAddress!,
                    street: e.target.value,
                  },
                })
              }
              placeholder="123 Rue de la Danse"
              className="w-full border rounded px-4 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Code postal</label>
              <input
                type="text"
                value={settings.postalAddress?.postalCode || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    postalAddress: {
                      ...settings.postalAddress!,
                      postalCode: e.target.value,
                    },
                  })
                }
                placeholder="75001"
                className="w-full border rounded px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Ville</label>
              <input
                type="text"
                value={settings.postalAddress?.city || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    postalAddress: {
                      ...settings.postalAddress!,
                      city: e.target.value,
                    },
                  })
                }
                placeholder="Paris"
                className="w-full border rounded px-4 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Pays</label>
            <input
              type="text"
              value={settings.postalAddress?.country || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  postalAddress: {
                    ...settings.postalAddress!,
                    country: e.target.value,
                  },
                })
              }
              placeholder="France"
              className="w-full border rounded px-4 py-2"
            />
          </div>
        </div>

        {/* Aperçu */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">📋 Aperçu</h3>

          <div>
            <p className="text-sm text-gray-600">Compte bancaire (affiché aux clients pour virements):</p>
            <div className="mt-2 bg-white p-3 rounded border border-gray-200 text-sm">
              <p><strong>Titulaire:</strong> {settings.bankAccount?.accountName || '-'}</p>
              <p><strong>IBAN:</strong> {settings.bankAccount?.iban || '-'}</p>
              <p><strong>BIC:</strong> {settings.bankAccount?.bic || '-'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600">Adresse (affichée pour l'envoi de chèques):</p>
            <div className="mt-2 bg-white p-3 rounded border border-gray-200 text-sm">
              <p>{settings.postalAddress?.street || '-'}</p>
              <p>{settings.postalAddress?.postalCode || '-'} {settings.postalAddress?.city || '-'}</p>
              <p>{settings.postalAddress?.country || '-'}</p>
            </div>
          </div>
        </div>

        {/* Bouton */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Sauvegarde en cours...' : '💾 Sauvegarder'}
        </button>
      </div>
    </div>
  );
}
