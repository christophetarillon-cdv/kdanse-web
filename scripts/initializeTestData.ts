/**
 * Script d'initialisation des données de test pour Phase 4
 * Crée: 1 stage, 1 membership, 1 réservation
 *
 * Usage: npx tsx scripts/initializeTestData.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TEST_USER_ID = 'dev-user-123';
const TEST_SEASON_2024_ID = ''; // À remplir après création de la saison
const TEST_SEASON_2025_ID = ''; // À remplir après création de la saison

async function initializeTestData() {
  try {
    console.log('📊 Initialisation des données de test...\n');

    // 1. Récupérer les IDs des saisons
    console.log('1️⃣  Récupération des saisons...');
    const seasonsSnapshot = await getDocs(collection(db, 'seasons'));
    let season2024Id = '';
    let season2025Id = '';

    for (const doc of seasonsSnapshot.docs) {
      const data = doc.data();
      if (data.name === '2024-2025') season2024Id = doc.id;
      if (data.name === '2025-2026') season2025Id = doc.id;
    }

    if (!season2024Id) {
      console.error('❌ Saison 2024-2025 non trouvée. Exécutez initializeSeasons.ts d\'abord.');
      process.exit(1);
    }

    console.log(`✅ Saisons trouvées: 2024-2025 (${season2024Id}), 2025-2026 (${season2025Id})\n`);

    // 2. Créer un stage pour 2024-2025
    console.log('2️⃣  Création d\'un stage de test...');
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
    const stageId = stageRef.id;
    console.log(`✅ Stage créé: ${stageId}\n`);

    // 3. Créer une membership (inscription) pour l'utilisateur dev
    console.log('3️⃣  Création d\'une inscription (membership)...');
    const membershipRef = await addDoc(collection(db, 'memberships'), {
      userId: TEST_USER_ID,
      visibleUserIds: [TEST_USER_ID],
      stageId: stageId,
      status: 'active',
      options: {
        housing: true,
        pricingCategory: 'solo',
      },
      amount: 400, // 100 (stage) + 300 (hébergement)
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const membershipId = membershipRef.id;
    console.log(`✅ Membership créée: ${membershipId}\n`);

    // 4. Créer une réservation pour la saison 2025-2026
    console.log('4️⃣  Création d\'une réservation de test...');
    if (!season2025Id) {
      console.warn('⚠️  Saison 2025-2026 non trouvée. Création d\'une réservation sans saison valide.');
    }

    const reservationRef = await addDoc(collection(db, 'reservations'), {
      userId: TEST_USER_ID,
      seasonId: season2025Id || 'test-season-2025',
      currentSeasonId: season2024Id,
      status: 'pending',
      notes: 'Réservation créée automatiquement pour Phase 4 - devrait être ÉLIGIBLE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const reservationId = reservationRef.id;
    console.log(`✅ Réservation créée: ${reservationId}\n`);

    // 5. Afficher le résumé
    console.log('═══════════════════════════════════════════════════════');
    console.log('✨ Initialisation terminée avec succès!\n');
    console.log('📋 Résumé des données de test:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n👤 Utilisateur (Dev):`);
    console.log(`   ID: ${TEST_USER_ID}`);
    console.log(`   Email: dev@localhost\n`);

    console.log(`📅 Saisons:`);
    console.log(`   2024-2025 (Actuelle): ${season2024Id}`);
    console.log(`   2025-2026 (Prochaine): ${season2025Id || 'À créer'}\n`);

    console.log(`🎓 Stage créé:`);
    console.log(`   ID: ${stageId}`);
    console.log(`   Nom: Stage de Test - Phase 4`);
    console.log(`   Saison: 2024-2025\n`);

    console.log(`📝 Membership (Inscription):`);
    console.log(`   ID: ${membershipId}`);
    console.log(`   Utilisateur: ${TEST_USER_ID}`);
    console.log(`   Stage: ${stageId}`);
    console.log(`   Statut: active ✅\n`);

    console.log(`🔖 Réservation:`);
    console.log(`   ID: ${reservationId}`);
    console.log(`   Utilisateur: ${TEST_USER_ID}`);
    console.log(`   Saison: 2025-2026`);
    console.log(`   Statut: pending`);
    console.log(`   Éligibilité: ✅ OUI (a une membership active)\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('\n✅ Prêt pour tester!\n');
    console.log('Accédez à:');
    console.log('  • /admin/reservations - Voir les réservations avec éligibilité');
    console.log('  • /reservations - Tester la page de réservation\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

initializeTestData();
