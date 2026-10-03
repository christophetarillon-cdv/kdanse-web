import { NextResponse } from 'next/server';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST() {
  try {
    console.log('🚀 Initialisation des données de test...');

    // 1. Récupérer les IDs des saisons
    const seasonsSnapshot = await getDocs(collection(db, 'seasons'));
    let season2024Id = '';
    let season2025Id = '';

    for (const doc of seasonsSnapshot.docs) {
      const data = doc.data();
      if (data.name === '2024-2025') season2024Id = doc.id;
      if (data.name === '2025-2026') season2025Id = doc.id;
    }

    if (!season2024Id) {
      return NextResponse.json(
        { error: 'Saison 2024-2025 non trouvée' },
        { status: 400 }
      );
    }

    // 2. Créer un stage
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

    // 3. Créer une membership
    const membershipRef = await addDoc(collection(db, 'memberships'), {
      userId: 'dev-user-123',
      visibleUserIds: ['dev-user-123'],
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

    // 4. Créer une réservation
    const reservationRef = await addDoc(collection(db, 'reservations'), {
      userId: 'dev-user-123',
      seasonId: season2025Id || 'test-season-2025',
      currentSeasonId: season2024Id,
      status: 'pending',
      notes: 'Réservation créée pour Phase 4 - utilisateur ÉLIGIBLE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: {
        stageId: stageRef.id,
        membershipId: membershipRef.id,
        reservationId: reservationRef.id,
        season2024Id,
        season2025Id,
      },
    });
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
