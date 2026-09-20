'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold mb-2">Bienvenue, {user?.displayName || user?.email}!</h1>
        <p className="text-blue-100">Site de réservation et paiement Kdanse</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Link
          href="/stages"
          className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
        >
          <h2 className="text-2xl font-bold text-blue-600 mb-2">📅 Stages</h2>
          <p className="text-gray-600">Découvrez nos stages disponibles et inscrivez-vous</p>
        </Link>

        <Link
          href="/memberships"
          className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
        >
          <h2 className="text-2xl font-bold text-green-600 mb-2">✓ Mes inscriptions</h2>
          <p className="text-gray-600">Consultez vos inscriptions et statuts de paiement</p>
        </Link>

        <Link
          href="/account"
          className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
        >
          <h2 className="text-2xl font-bold text-purple-600 mb-2">👤 Mon compte</h2>
          <p className="text-gray-600">Gérez vos informations personnelles</p>
        </Link>
      </div>

      {user?.roles?.includes('admin') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-4">Accès administrateur</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/admin/stages"
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-center"
            >
              Gérer les stages
            </Link>
            <Link
              href="/admin/settings/page-permissions"
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-center"
            >
              Permissions des pages
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
