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
      <div className="bg-gradient-to-r from-ink to-ink-soft text-white rounded-lg shadow-lg p-4 sm:p-8 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-4xl font-bold mb-2 break-words">Bienvenue, {user?.displayName || user?.email}!</h1>
          <p className="text-sm sm:text-base text-gold-100">Site de réservation et paiement Kdanse</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap"
        >
          Déconnexion
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Link href="/stages" className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
          <h2 className="text-2xl font-bold text-ink mb-2">📅 Stages</h2>
          <p className="text-gray-700 font-medium">Découvrez nos stages</p>
        </Link>
        <Link href="/memberships" className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
          <h2 className="text-2xl font-bold text-ink mb-2">✓ Mes inscriptions</h2>
          <p className="text-gray-700 font-medium">Vos inscriptions confirmées</p>
        </Link>
        <Link href="/account" className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
          <h2 className="text-2xl font-bold text-ink mb-2">👤 Mon compte</h2>
          <p className="text-gray-700 font-medium">Informations personnelles</p>
        </Link>
      </div>

      {/* Panier en cours */}
      {cart && (
        <div className="bg-gold-50 border-2 border-gold-200 rounded-lg p-6 mt-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-ink mb-1">🛒 Panier en cours</h2>
              <p className="text-sm text-gold-ink">{cart.items.length} article(s) - Total: {cart.totals.total}€</p>
            </div>
            <Link
              href="/cart"
              className="bg-gold-deep text-white px-6 py-2 rounded hover:bg-gold-ink font-semibold"
            >
              Voir panier
            </Link>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-gold-50 border border-gold-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-ink mb-4">Admin</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/admin/stages" className="bg-gold-deep text-white px-4 py-2 rounded hover:bg-gold-ink text-center">
              Gérer les stages
            </Link>
            <Link href="/admin/inscriptions" className="bg-ink text-white px-4 py-2 rounded hover:bg-ink-soft text-center font-semibold">
              📋 Inscriptions aux stages
            </Link>
            <Link href="/admin/danseurs" className="bg-ink text-white px-4 py-2 rounded hover:bg-ink-soft text-center font-semibold">
              👤 Danseurs
            </Link>
            <Link href="/admin/encaissements" className="bg-ink text-white px-4 py-2 rounded hover:bg-ink-soft text-center font-semibold">
              💶 Encaissements
            </Link>
            <Link href="/admin/mises-en-banque" className="bg-ink text-white px-4 py-2 rounded hover:bg-ink-soft text-center font-semibold">
              🏦 Mises en banque
            </Link>
            <Link href="/admin/payment-plans-validation" className="bg-ink text-white px-4 py-2 rounded hover:bg-ink-soft text-center font-semibold">
              📋 Plans à valider
            </Link>
            <Link href="/admin/payments" className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-center font-semibold">
              💳 Paiements à valider
            </Link>
            <Link href="/admin/bank-settings" className="bg-gold-deep text-white px-4 py-2 rounded hover:bg-gold-ink text-center">
              🏦 Renseignements du club
            </Link>
            <Link href="/admin/courses" className="bg-gold-deep text-white px-4 py-2 rounded hover:bg-gold-ink text-center">
              🎵 Gérer les cours
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
