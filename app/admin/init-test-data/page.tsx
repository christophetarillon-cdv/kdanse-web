'use client';

import { useState } from 'react';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TestDataResult {
  stageId?: string;
  membershipId?: string;
  reservationId?: string;
  season2024Id?: string;
  season2025Id?: string;
  error?: string;
}

const TEST_USER_ID = 'dev-user-123';

export default function InitTestDataPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestDataResult | null>(null);
  const [message, setMessage] = useState('');

  const initializeTestData = async () => {
    try {
      setLoading(true);
      setMessage('Initialisation en cours...');
      setResult(null);

      const result: TestDataResult = {};

      // 1. Récupérer les IDs des saisons
      console.log('Récupération des saisons...');
      const seasonsSnapshot = await getDocs(collection(db, 'seasons'));
      let season2024Id = '';
      let season2025Id = '';

      for (const doc of seasonsSnapshot.docs) {
        const data = doc.data();
        if (data.name === '2024-2025') season2024Id = doc.id;
        if (data.name === '2025-2026') season2025Id = doc.id;
      }

      if (!season2024Id) {
        throw new Error('Saison 2024-2025 non trouvée');
      }

      result.season2024Id = season2024Id;
      result.season2025Id = season2025Id;

      // 2. Créer un stage
      console.log('Création du stage...');
      const stageRef = await addDoc(collection(db, 'stages'), {
        name: 'Stage de Test - Phase 4',
        description: 'Stage créé automatiquement pour tester le système d\'éligibilité',
        location: 'En ligne (Test)',
        seasonId: season2024Id,
        startDate: new Date('2024-10-01'),
        endDate: new Date('2024-10-07'),
        maxParticipants: 50,
        pricing: {
          solo: 100,
          couple: 200,
          ffdanse: 80,
          withHousing: 300,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      result.stageId = stageRef.id;

      // 3. Créer une membership
      console.log('Création de la membership...');
      const membershipRef = await addDoc(collection(db, 'memberships'), {
        userId: TEST_USER_ID,
        visibleUserIds: [TEST_USER_ID],
        stageId: stageRef.id,
        status: 'active',
        options: {
          housing: true,
          pricingCategory: 'solo',
        },
        amount: 400,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      result.membershipId = membershipRef.id;

      // 4. Créer une réservation
      console.log('Création de la réservation...');
      const reservationRef = await addDoc(collection(db, 'reservations'), {
        userId: TEST_USER_ID,
        seasonId: season2025Id || 'test-season-2025',
        currentSeasonId: season2024Id,
        status: 'pending',
        notes: 'Réservation créée automatiquement pour Phase 4 - devrait être ÉLIGIBLE',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      result.reservationId = reservationRef.id;

      setResult(result);
      setMessage('✅ Initialisation réussie!');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setResult({ error: errorMsg });
      setMessage(`❌ Erreur: ${errorMsg}`);
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Initialisation des Données de Test</h1>
          <p className="text-gray-900 font-medium mb-8">Phase 4 - Gestion des Accès</p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 text-blue-900 mb-3">📋 Ce qui sera créé:</h2>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✅ <span className="font-medium">1 Stage</span> - "Stage de Test - Phase 4" pour saison 2024-2025</li>
              <li>✅ <span className="font-medium">1 Membership</span> - Inscription de l'utilisateur dev au stage</li>
              <li>✅ <span className="font-medium">1 Réservation</span> - Pour saison 2025-2026 (statut: pending)</li>
            </ul>
          </div>

          <button
            onClick={initializeTestData}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition mb-6"
          >
            {loading ? '⏳ Initialisation en cours...' : '🚀 Initialiser les Données de Test'}
          </button>

          {message && (
            <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${
              message.includes('✅')
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}>
              {message}
            </div>
          )}

          {result && !result.error && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 text-green-900">📊 Résultats</h2>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">Saison 2024-2025 (Actuelle)</p>
                  <p className="text-gray-900 font-medium font-mono text-xs break-all">{result.season2024Id}</p>
                </div>

                {result.season2025Id && (
                  <div>
                    <p className="font-medium text-gray-900">Saison 2025-2026 (Prochaine)</p>
                    <p className="text-gray-900 font-medium font-mono text-xs break-all">{result.season2025Id}</p>
                  </div>
                )}

                <div className="border-t pt-3">
                  <p className="font-medium text-gray-900">Stage Créé</p>
                  <p className="text-gray-900 font-medium font-mono text-xs break-all">{result.stageId}</p>
                  <p className="text-gray-800 text-xs mt-1">Nom: "Stage de Test - Phase 4"</p>
                </div>

                <div className="border-t pt-3">
                  <p className="font-medium text-gray-900">Membership (Inscription) Créée</p>
                  <p className="text-gray-900 font-medium font-mono text-xs break-all">{result.membershipId}</p>
                  <p className="text-gray-800 text-xs mt-1">Utilisateur: dev-user-123 | Statut: active ✅</p>
                </div>

                <div className="border-t pt-3">
                  <p className="font-medium text-gray-900">Réservation Créée</p>
                  <p className="text-gray-900 font-medium font-mono text-xs break-all">{result.reservationId}</p>
                  <p className="text-gray-800 text-xs mt-1">
                    Utilisateur: dev-user-123 | Statut: pending | Éligibilité: ✅ OUI
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold text-gray-900 mb-3">🧪 Prêt pour tester:</h3>
                <ul className="space-y-2 text-sm text-gray-900">
                  <li>
                    📍 <a href="/admin/reservations" className="text-blue-600 hover:underline">
                      /admin/reservations
                    </a>
                    {' '} — Voir les réservations avec colonne Éligibilité
                  </li>
                  <li>
                    📍 <a href="/reservations" className="text-blue-600 hover:underline">
                      /reservations
                    </a>
                    {' '} — Tester la page de réservation avec badge d'éligibilité
                  </li>
                  <li>
                    📍 <a href="/admin/stages" className="text-blue-600 hover:underline">
                      /admin/stages
                    </a>
                    {' '} — Voir le stage créé
                  </li>
                </ul>
              </div>
            </div>
          )}

          {result?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 text-red-900 mb-3">❌ Erreur</h2>
              <p className="text-red-800 text-sm">{result.error}</p>
            </div>
          )}

          <div className="border-t mt-8 pt-8">
            <h2 className="text-lg font-bold text-gray-900 text-gray-900 mb-4">ℹ️ Informations</h2>
            <div className="space-y-3 text-sm text-gray-900 font-medium">
              <p>
                <span className="font-medium">Utilisateur de test:</span> dev-user-123 (localhost dev mode)
              </p>
              <p>
                <span className="font-medium">Ce qu'on teste:</span> Phase 4 - Gestion des accès basée sur l'inscription
              </p>
              <p>
                <span className="font-medium">Résultat attendu:</span> L'utilisateur est éligible car inscrit à la saison 2024-2025
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
