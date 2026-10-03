'use client';

import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { getAuth, signOut } from 'firebase/auth';

export default function DashboardPage() {
  const { user, firebaseUser, loading } = useAuth();
  const { cart } = useCart();
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
      // Flag pour empêcher la redirection automatique vers dashboard
      localStorage.setItem('justLoggedOut', 'true');

      // Nettoyer les autres données
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key !== 'justLoggedOut') {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();

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
        <Link href="/memberships" className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 relative">
          <h2 className="text-2xl font-bold text-green-600 mb-2">✓ Mes inscriptions</h2>
          <p className="text-gray-600">Vos inscriptions</p>
          {cart && (
            <div className="absolute top-4 right-4 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              {cart.items.length}
            </div>
          )}
        </Link>
        <Link href="/account" className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
          <h2 className="text-2xl font-bold text-purple-600 mb-2">👤 Mon compte</h2>
          <p className="text-gray-600">Informations personnelles</p>
        </Link>
      </div>

      {/* Panier en cours */}
      {cart && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mt-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-yellow-900 mb-1">🛒 Panier en cours</h2>
              <p className="text-sm text-yellow-800">{cart.items.length} article(s) - Total: {cart.totals.total}€</p>
            </div>
            <Link
              href="/cart"
              className="bg-yellow-600 text-white px-6 py-2 rounded hover:bg-yellow-700 font-semibold"
            >
              Voir panier
            </Link>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-4">Admin</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <Link href="/admin/stages" className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-center">
              Gérer les stages
            </Link>
            <Link href="/admin/pages" className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-center">
              Gérer les pages CMS
            </Link>
            <Link href="/admin/menus" className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-center">
              Gérer les menus
            </Link>
            <Link href="/admin/settings" className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-center">
              Paramètres
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
