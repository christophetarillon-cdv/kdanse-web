'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { getAuth, signOut } from 'firebase/auth';

export default function DashboardPage() {
  const { user, firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login');
    }
  }, [loading, firebaseUser, router]);

  if (loading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser) return null;

  const isAdmin = user?.roles?.includes('admin');

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow-lg p-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-2">Bienvenue, {user?.displayName || user?.email}!</h1>
          <p className="text-blue-100">Site de réservation et paiement Kdanse</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
        >
          Déconnexion
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Link href="/stages" className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-2">📅 Stages</h2>
          <p className="text-gray-600">Découvrez nos stages</p>
        </Link>
        <Link href="/memberships" className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
          <h2 className="text-2xl font-bold text-green-600 mb-2">✓ Mes inscriptions</h2>
          <p className="text-gray-600">Vos inscriptions</p>
        </Link>
        <Link href="/account" className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
          <h2 className="text-2xl font-bold text-purple-600 mb-2">👤 Mon compte</h2>
          <p className="text-gray-600">Informations personnelles</p>
        </Link>
      </div>

      {isAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-4">Admin</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/admin/stages" className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-center">
              Gérer les stages
            </Link>
            <Link href="/admin/settings/page-permissions" className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-center">
              Permissions
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
