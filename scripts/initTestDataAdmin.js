/**
 * Script Node.js pour initialiser les données de test
 * Utilise les credentials depuis .env.local
 */

const admin = require('firebase-admin');

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// Initialize Firebase Admin SDK with web API (no service account needed)
const fetch = require('node-fetch');

async function initTestData() {
  try {
    console.log('📊 Initialisation des données de test via API...\n');

    // Appel de l'API endpoint
    const response = await fetch('http://localhost:3000/api/init-test-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur API');
    }

    console.log('✅ Initialisation réussie!\n');
    console.log('📋 Résumé:');
    console.log(`   Stage ID: ${data.data.stageId}`);
    console.log(`   Membership ID: ${data.data.membershipId}`);
    console.log(`   Reservation ID: ${data.data.reservationId}`);
    console.log(`   Season 2024-2025: ${data.data.season2024Id}`);
    console.log(`   Season 2025-2026: ${data.data.season2025Id}\n`);

    console.log('🧪 Testez sur:');
    console.log('   /admin/reservations - Voir l\'éligibilité');
    console.log('   /reservations - Voir le badge d\'éligibilité\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

initTestData();
