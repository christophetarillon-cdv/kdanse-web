import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Membership } from '@/types';

const MEMBERSHIPS_COLLECTION = 'memberships';
const STAGES_COLLECTION = 'stages';

const convertMembershipData = (data: any): Membership => ({
  ...data,
  createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
  updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
});

// Get all active memberships for a user
export const getUserActiveMemberships = async (userId: string): Promise<Membership[]> => {
  const q = query(
    collection(db, MEMBERSHIPS_COLLECTION),
    where('userId', '==', userId),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => convertMembershipData({ id: d.id, ...d.data() }));
};

// Get memberships for a user in a specific season
export const getUserMembershipsInSeason = async (
  userId: string,
  seasonId: string
): Promise<Membership[]> => {
  const activeMemberships = await getUserActiveMemberships(userId);

  // Filter memberships by season
  const membershipsInSeason = [];
  for (const membership of activeMemberships) {
    const stageDoc = await getDoc(doc(db, STAGES_COLLECTION, membership.stageId));
    if (stageDoc.exists()) {
      const stageData = stageDoc.data();
      if (stageData.seasonId === seasonId) {
        membershipsInSeason.push(membership);
      }
    }
  }

  return membershipsInSeason;
};

// Check if user is eligible to reserve next season
// User must have at least one active membership in current season
export const isUserEligibleForNextSeasonReservation = async (
  userId: string,
  currentSeasonId: string
): Promise<{
  eligible: boolean;
  membershipCount: number;
  reason?: string;
}> => {
  try {
    const memberships = await getUserMembershipsInSeason(userId, currentSeasonId);

    if (memberships.length === 0) {
      return {
        eligible: false,
        membershipCount: 0,
        reason: 'Vous devez être inscrit à la saison actuelle pour réserver la saison suivante',
      };
    }

    return {
      eligible: true,
      membershipCount: memberships.length,
    };
  } catch (error) {
    console.error('Error checking eligibility:', error);
    return {
      eligible: false,
      membershipCount: 0,
      reason: 'Erreur lors de la vérification de votre éligibilité',
    };
  }
};

// Get season ID from stage
export const getSeasonFromStage = async (stageId: string): Promise<string | null> => {
  try {
    const stageDoc = await getDoc(doc(db, STAGES_COLLECTION, stageId));
    if (stageDoc.exists()) {
      return stageDoc.data().seasonId || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting season from stage:', error);
    return null;
  }
};

// Count active memberships for a user
export const countUserActiveMemberships = async (userId: string): Promise<number> => {
  const memberships = await getUserActiveMemberships(userId);
  return memberships.length;
};
