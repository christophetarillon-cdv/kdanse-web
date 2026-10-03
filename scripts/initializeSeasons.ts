/**
 * Script d'initialisation des saisons
 * À exécuter une seule fois pour créer la première saison
 *
 * Usage: npx ts-node scripts/initializeSeasons.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

const SEASONS = [
  {
    name: '2024-2025',
    description: 'Saison 2024-2025',
    startDate: new Date('2024-09-01'),
    endDate: new Date('2025-06-30'),
    reservationStartDate: new Date('2025-04-01'),
    reservationEndDate: new Date('2025-05-31'),
    status: 'active',
    stageIds: [],
  },
  {
    name: '2025-2026',
    description: 'Saison 2025-2026',
    startDate: new Date('2025-09-01'),
    endDate: new Date('2026-06-30'),
    reservationStartDate: new Date('2026-04-01'),
    reservationEndDate: new Date('2026-05-31'),
    status: 'planning',
    stageIds: [],
  },
];

async function initializeSeasons() {
  try {
    console.log('📅 Initialisation des saisons...');

    for (const season of SEASONS) {
      const docRef = await addDoc(collection(db, 'seasons'), {
        ...season,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ Saison "${season.name}" créée avec l'ID: ${docRef.id}`);
    }

    console.log('✨ Initialisation terminée !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

initializeSeasons();
