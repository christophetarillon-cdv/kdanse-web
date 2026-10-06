'use client';

import { useState, useEffect } from 'react';
import { getActiveSeason } from '@/services/seasonService';
import {
  getReservationsBySeason,
  getReservationStats,
  updateReservationStatus,
} from '@/services/reservationService';
import { isUserEligibleForNextSeasonReservation } from '@/services/accessService';
import type { Season, Reservation } from '@/types';

export default function ReservationsAdminPage() {
  const [season, setSeason] = useState<Season | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, cancelled: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<Record<string, boolean>>({}); // Track eligibility by reservation ID

  const loadData = async () => {
    try {
      setIsLoading(true);
      const activeSeason = await getActiveSeason();

      if (!activeSeason) {
        setSeason(null);
        return;
      }

      setSeason(activeSeason);

      // Load reservations and stats
      const [reservations, stats] = await Promise.all([
        getReservationsBySeason(activeSeason.id),
        getReservationStats(activeSeason.id),
      ]);

      setReservations(reservations);
      setStats(stats);

      // Check eligibility for each reservation
      const eligibilityMap: Record<string, boolean> = {};
      for (const reservation of reservations) {
        const result = await isUserEligibleForNextSeasonReservation(
          reservation.userId,
          reservation.currentSeasonId
        );
        eligibilityMap[reservation.id] = result.eligible;
      }
      setEligibility(eligibilityMap);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (id: string, status: Reservation['status']) => {
    try {
      setUpdatingId(id);
      await updateReservationStatus(id, status);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la mise à jour');
      console.error(error);
    } finally {
      setUpdatingId(null);
    }
  };

  const STATUS_COLORS: Record<Reservation['status'], string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const STATUS_LABELS: Record<Reservation['status'], string> = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    cancelled: 'Annulée',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="text-gray-900 font-medium mt-4">Chargement des réservations...</p>
        </div>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg text-center">
            <p className="font-bold mb-2">Aucune saison active</p>
            <p>Il n'y a pas de réservations à gérer pour le moment.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Réservations</h1>
          <p className="text-gray-900 font-medium">
            Saison active: <span className="font-bold">{season.name}</span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-900 font-medium mt-1">Réservations au total</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-900 font-medium mt-1">En attente</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">{stats.confirmed}</div>
            <div className="text-sm text-gray-900 font-medium mt-1">Confirmées</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-sm text-gray-900 font-medium mt-1">Annulées</div>
          </div>
        </div>

        {/* Reservations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {reservations.length === 0 ? (
            <div className="p-8 text-center text-gray-900 font-medium">
              <p>Aucune réservation pour le moment</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Éligibilité
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{reservation.userId}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">(À récupérer)</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {reservation.createdAt.toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {eligibility[reservation.id] === true ? (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          ✓ Éligible
                        </span>
                      ) : eligibility[reservation.id] === false ? (
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                          ✕ Non éligible
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                          — Vérification…
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      <div className="max-w-xs truncate">{reservation.notes || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          STATUS_COLORS[reservation.status]
                        }`}
                      >
                        {STATUS_LABELS[reservation.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {reservation.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(reservation.id, 'confirmed')}
                              disabled={updatingId === reservation.id}
                              className="px-3 py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-sm rounded transition"
                            >
                              ✓ Confirmer
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(reservation.id, 'cancelled')}
                              disabled={updatingId === reservation.id}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-sm rounded transition"
                            >
                              ✕ Rejeter
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
