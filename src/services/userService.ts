import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, SavedDancer } from '@/types';

const USERS_COLLECTION = 'users';
const EMAIL_INDEX_COLLECTION = 'emailIndex';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toDateInput = (value: Date | string) => new Date(value).toISOString().split('T')[0];

export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const docSnap = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
      profile: {
        ...data.profile,
        dateOfBirth: data.profile?.dateOfBirth?.toDate?.() || data.profile?.dateOfBirth,
      },
    } as User;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export const registerEmailIndex = async (userId: string, email: string): Promise<void> => {
  await setDoc(doc(db, EMAIL_INDEX_COLLECTION, normalizeEmail(email)), { uid: userId });
};

export const findUserUidByEmail = async (email: string): Promise<string | null> => {
  const normalized = normalizeEmail(email);
  const indexSnap = await getDoc(doc(db, EMAIL_INDEX_COLLECTION, normalized));
  if (indexSnap.exists()) return indexSnap.data().uid as string;

  const usersSnap = await getDocs(
    query(collection(db, USERS_COLLECTION), where('email', '==', normalized))
  );
  return usersSnap.empty ? null : usersSnap.docs[0].id;
};

export const getDancerUids = (dancers: { uid?: string }[]): string[] =>
  [...new Set(dancers.map((d) => d.uid).filter((uid): uid is string => !!uid))];

export const linkDancerAccount = async (dancerUid: string, managerUid: string): Promise<void> => {
  await updateDoc(doc(db, USERS_COLLECTION, dancerUid), {
    managedBy: arrayUnion(managerUid),
  });
};

export const syncLinkedDancerProfile = async (dancerUid: string, dancer: SavedDancer): Promise<void> => {
  const profile: Record<string, unknown> = {
    firstName: dancer.firstName,
    lastName: dancer.lastName,
    postalAddress: {
      street: dancer.postalAddress?.street || '',
      postalCode: dancer.postalAddress?.postalCode || '',
      city: dancer.postalAddress?.city || '',
    },
    license: {
      number: dancer.license?.number || '',
      federation: 'ffdanse',
      active: dancer.license?.active || false,
    },
  };
  if (dancer.dateOfBirth) profile.dateOfBirth = new Date(dancer.dateOfBirth);

  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [key, value] of Object.entries(profile)) {
    update[`profile.${key}`] = value;
  }
  await updateDoc(doc(db, USERS_COLLECTION, dancerUid), update);
};

// Remplace les données copiées par le profil réel des danseurs liés à un compte
export const resolveLinkedDancers = async (dancers: SavedDancer[]): Promise<SavedDancer[]> =>
  Promise.all(
    dancers.map(async (dancer) => {
      if (!dancer.uid) return dancer;

      const linked = await getUserProfile(dancer.uid).catch(() => null);
      const profile = linked?.profile as any;
      if (!profile) return dancer;

      return {
        ...dancer,
        firstName: profile.firstName || dancer.firstName,
        lastName: profile.lastName || dancer.lastName,
        dateOfBirth: profile.dateOfBirth ? toDateInput(profile.dateOfBirth) : dancer.dateOfBirth,
        postalAddress: profile.postalAddress || dancer.postalAddress,
        license: profile.license
          ? { number: profile.license.number, active: profile.license.active }
          : dancer.license,
      };
    })
  );

export const updateSavedDancer = async (
  userId: string,
  index: number,
  dancer: SavedDancer
): Promise<SavedDancer[]> => {
  const current = await getUserProfile(userId);
  const dancers = [...(((current?.profile as any)?.dancers as SavedDancer[]) || [])];

  const email = dancer.email?.trim();
  const emailUid = email ? await findUserUidByEmail(email) : null;
  const linkedUid = emailUid && emailUid !== userId ? emailUid : undefined;
  const saved: SavedDancer = linkedUid ? { ...dancer, uid: linkedUid } : dancer;

  if (linkedUid) await linkDancerAccount(linkedUid, userId);
  dancers[index] = saved;

  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    'profile.dancers': dancers,
    updatedAt: serverTimestamp(),
  });

  if (linkedUid) await syncLinkedDancerProfile(linkedUid, saved);

  return resolveLinkedDancers(dancers);
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
  try {
    const { id, createdAt, updatedAt, ...cleanUpdates } = updates as any;

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(cleanUpdates).filter(([, v]) => v !== undefined)
    );

    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      ...filteredUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};
