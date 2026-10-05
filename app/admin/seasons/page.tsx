'use client';

import { useState, useEffect } from 'react';
import SeasonForm from '@/components/admin/SeasonForm';
import SeasonList from '@/components/admin/SeasonList';
import { getSeasons } from '@/services/seasonService';
import type { Season } from '@/types';

export default function SeasonsAdminPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | undefined>();

  const loadSeasons = async () => {
    try {
      setIsLoading(true);
      const data = await getSeasons();
      setSeasons(data);
    } catch (error) {
      console.error('Erreur lors du chargement des saisons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSeasons();
  }, []);

  const handleEdit = (season: Season) => {
    setSelectedSeason(season);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setSelectedSeason(undefined);
    loadSeasons();
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedSeason(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Saisons</h1>
          <p className="text-gray-900 font-medium">
            Créez et gérez les saisons de danse, définissez les périodes de réservation
          </p>
        </div>

        {/* Form Section */}
        {showForm && (
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedSeason ? 'Modifier la saison' : 'Créer une nouvelle saison'}
              </h2>
            </div>
            <SeasonForm
              season={selectedSeason}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Add Season Button */}
        {!showForm && (
          <div className="mb-8">
            <button
              onClick={() => {
                setSelectedSeason(undefined);
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-md"
            >
              + Créer une nouvelle saison
            </button>
          </div>
        )}

        {/* Seasons List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Saisons</h2>
          {isLoading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">Chargement des saisons...</p>
            </div>
          ) : (
            <SeasonList seasons={seasons} onEdit={handleEdit} onRefresh={loadSeasons} />
          )}
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{seasons.length}</div>
            <div className="text-sm text-gray-900 font-medium"-800 font-medium mt-1">Saisons au total</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">
              {seasons.filter(s => s.status === 'active').length}
            </div>
            <div className="text-sm text-gray-900 font-medium"-800 font-medium mt-1">Saisons actives</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">
              {seasons.filter(s => s.status === 'reservation').length}
            </div>
            <div className="text-sm text-gray-900 font-medium"-800 font-medium mt-1">Réservations ouvertes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
