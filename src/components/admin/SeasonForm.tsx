'use client';

import { useState } from 'react';
import type { Season } from '@/types';
import { createSeason, updateSeason } from '@/services/seasonService';

interface SeasonFormProps {
  season?: Season;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function SeasonForm({ season, onSuccess, onCancel }: SeasonFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        startDate: new Date(formData.get('startDate') as string),
        endDate: new Date(formData.get('endDate') as string),
        reservationStartDate: new Date(formData.get('reservationStartDate') as string),
        reservationEndDate: new Date(formData.get('reservationEndDate') as string),
        status: formData.get('status') as Season['status'],
        stageIds: season?.stageIds || [],
      };

      if (season) {
        await updateSeason(season.id, data);
      } else {
        await createSeason(data);
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Nom de la saison */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nom de la saison *
        </label>
        <input
          type="text"
          name="name"
          defaultValue={season?.name}
          placeholder="Ex: 2024-2025"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          name="description"
          defaultValue={season?.description}
          placeholder="Description de la saison..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
        />
      </div>

      {/* Dates de la saison */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date de début *
          </label>
          <input
            type="date"
            name="startDate"
            defaultValue={season ? formatDate(season.startDate) : ''}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date de fin *
          </label>
          <input
            type="date"
            name="endDate"
            defaultValue={season ? formatDate(season.endDate) : ''}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
          />
        </div>
      </div>

      {/* Dates de réservation */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Début des réservations *
          </label>
          <input
            type="date"
            name="reservationStartDate"
            defaultValue={season ? formatDate(season.reservationStartDate) : ''}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fin des réservations *
          </label>
          <input
            type="date"
            name="reservationEndDate"
            defaultValue={season ? formatDate(season.reservationEndDate) : ''}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
          />
        </div>
      </div>

      {/* Statut */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Statut *
        </label>
        <select
          name="status"
          defaultValue={season?.status || 'planning'}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
        >
          <option value="planning">Planification</option>
          <option value="active">Actif</option>
          <option value="reservation">Réservation ouverte</option>
          <option value="closed">Fermé</option>
        </select>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-ink hover:bg-ink-soft disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
        >
          {isLoading ? 'Sauvegarde...' : season ? 'Mettre à jour' : 'Créer'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg transition"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
