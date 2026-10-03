'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ReservationForm from '@/components/ReservationForm';
import { getActiveSeason } from '@/services/seasonService';
import type { Season } from '@/types';

export default function ReservationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSeason = async () => {
      try {
        const season = await getActiveSeason();
        setActiveSeason(season);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }
      loadSeason();
    }
  }, [user, loading, router]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="text-gray-600 mt-4">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!activeSeason) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg text-center">
            <p className="font-bold mb-2">Aucune saison active</p>
            <p>Les réservations ne sont pas disponibles pour le moment. Veuillez vérifier ultérieurement.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Réservez votre place</h1>
          <p className="text-lg text-gray-600">
            Réservez dès maintenant pour la prochaine saison
          </p>
        </div>

        {/* Season Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Saison actuelle</p>
              <p className="text-xl font-bold text-blue-600">{activeSeason.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Statut</p>
              <p className="text-xl font-bold text-green-600">Actif</p>
            </div>
          </div>
        </div>

        {/* Reservation Form */}
        <ReservationForm
          currentSeasonId={activeSeason.id}
          onSuccess={() => {
            // Optionally reload or show success message
          }}
        />

        {/* Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">📅</div>
            <h3 className="font-bold text-gray-900 mb-2">Dates de réservation</h3>
            <p className="text-sm text-gray-600">
              Du {activeSeason.reservationStartDate.toLocaleDateString('fr-FR')} au{' '}
              {activeSeason.reservationEndDate.toLocaleDateString('fr-FR')}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">✓</div>
            <h3 className="font-bold text-gray-900 mb-2">Vérification</h3>
            <p className="text-sm text-gray-600">
              Votre réservation sera vérifiée par notre équipe dans les 48h
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">📧</div>
            <h3 className="font-bold text-gray-900 mb-2">Confirmation</h3>
            <p className="text-sm text-gray-600">
              Vous recevrez une confirmation par email à {user.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
