'use client';

import type { Season } from '@/types';
import { deleteSeason } from '@/services/seasonService';
import { useState } from 'react';

interface SeasonListProps {
  seasons: Season[];
  onEdit?: (season: Season) => void;
  onRefresh?: () => void;
}

const STATUS_COLORS: Record<Season['status'], string> = {
  planning: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  reservation: 'bg-blue-100 text-blue-800',
  closed: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<Season['status'], string> = {
  planning: 'Planification',
  active: 'Actif',
  reservation: 'Réservation',
  closed: 'Fermé',
};

export default function SeasonList({ seasons, onEdit, onRefresh }: SeasonListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette saison ?')) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteSeason(id);
      onRefresh?.();
    } catch (error) {
      alert('Erreur lors de la suppression');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  if (seasons.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">Aucune saison créée. Commencez par en ajouter une !</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Période</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Réservations
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Stages</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {seasons.map((season) => (
            <tr key={season.id} className="hover:bg-gray-50 transition">
              <td className="px-6 py-4">
                <div className="font-medium text-gray-900">{season.name}</div>
                {season.description && (
                  <div className="text-sm text-gray-500">{season.description}</div>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                <div>{season.startDate.toLocaleDateString('fr-FR')}</div>
                <div className="text-xs text-gray-500">
                  à {season.endDate.toLocaleDateString('fr-FR')}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                <div className="text-xs">
                  Du {season.reservationStartDate.toLocaleDateString('fr-FR')}
                </div>
                <div className="text-xs text-gray-500">
                  au {season.reservationEndDate.toLocaleDateString('fr-FR')}
                </div>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    STATUS_COLORS[season.status]
                  }`}
                >
                  {STATUS_LABELS[season.status]}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                <div className="text-xs font-medium">{season.stageIds?.length || 0} stage(s)</div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => onEdit?.(season)}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition"
                  >
                    Éditer
                  </button>
                  <button
                    onClick={() => handleDelete(season.id)}
                    disabled={deletingId === season.id}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-sm rounded transition"
                  >
                    {deletingId === season.id ? 'Suppression...' : 'Supprimer'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
