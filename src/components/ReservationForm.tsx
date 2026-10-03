'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Season } from '@/types';
import { getNextSeason } from '@/services/seasonService';
import { createReservation, getUserReservationForSeason } from '@/services/reservationService';

interface ReservationFormProps {
  currentSeasonId: string;
  onSuccess?: () => void;
}

export default function ReservationForm({ currentSeasonId, onSuccess }: ReservationFormProps) {
  const { user } = useAuth();
  const [nextSeason, setNextSeason] = useState<Season | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingReservation, setExistingReservation] = useState(false);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get next season
        const season = await getNextSeason();
        if (!season) {
          setError('Aucune saison disponible pour les réservations');
          return;
        }

        setNextSeason(season);

        // Check if user already has a reservation
        if (user?.id) {
          const existing = await getUserReservationForSeason(user.id, season.id);
          if (existing) {
            setExistingReservation(true);
          }
        }
      } catch (err) {
        console.error('Erreur lors du chargement:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id || !nextSeason) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createReservation({
        userId: user.id,
        seasonId: nextSeason.id,
        currentSeasonId,
        notes: notes || undefined,
      });

      setSuccess(true);
      setNotes('');
      onSuccess?.();

      // Reset after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la réservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        <p className="text-gray-600 mt-4">Chargement...</p>
      </div>
    );
  }

  if (error && !nextSeason) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
        {error}
      </div>
    );
  }

  if (existingReservation) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg">
        <div className="font-bold mb-2">✓ Réservation confirmée</div>
        <p>Vous avez déjà une réservation pour la saison {nextSeason?.name}.</p>
      </div>
    );
  }

  if (!nextSeason) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Réservation pour la saison {nextSeason.name}
        </h2>
        <p className="text-gray-600">
          Période: du {nextSeason.startDate.toLocaleDateString('fr-FR')} au{' '}
          {nextSeason.endDate.toLocaleDateString('fr-FR')}
        </p>
      </div>

      {success && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          ✓ Réservation confirmée ! Nous vous remercions de votre inscription.
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Utilisateur:</span> {user?.displayName}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Email:</span> {user?.email}
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes ou messages supplémentaires (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Avez-vous des questions ou des informations à partager ?"
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Conditions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            En validant votre réservation, vous confirmez que vous avez des informations
            supplémentaires au sujet de cette saison. Votre réservation sera revérifiée par notre
            équipe.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
        >
          {isSubmitting ? 'Réservation en cours...' : 'Confirmer ma réservation'}
        </button>
      </form>
    </div>
  );
}
