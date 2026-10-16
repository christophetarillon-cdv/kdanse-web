import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DiscountCode } from '@/types/cart';

const DISCOUNT_CODES_COLLECTION = 'discountCodes';
const CARTS_COLLECTION = 'carts';

export const normalizeDiscountCode = (code: string) => code.trim().toUpperCase();

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const date = new Date(value as string);
  return isNaN(date.getTime()) ? null : date;
};

const fromSnapshot = (id: string, data: Record<string, unknown>): DiscountCode => ({
  code: id,
  label: (data.label as string) ?? '',
  target: data.target as DiscountCode['target'],
  type: data.type as DiscountCode['type'],
  value: Number(data.value ?? 0),
  stageId: (data.stageId as string) ?? '',
  active: data.active !== false,
  startsAt: toDate(data.startsAt),
  endsAt: toDate(data.endsAt),
  maxUses: data.maxUses == null ? null : Number(data.maxUses),
  usedCount: Number(data.usedCount ?? 0),
});

export const getDiscountCode = async (code: string): Promise<DiscountCode | null> => {
  const normalized = normalizeDiscountCode(code);
  if (!normalized) return null;
  const snap = await getDoc(doc(db, DISCOUNT_CODES_COLLECTION, normalized));
  if (!snap.exists()) return null;
  return fromSnapshot(snap.id, snap.data());
};

export const isDiscountUsable = (discount: DiscountCode, stageId: string, now = new Date()): string | null => {
  if (!discount.active) return "Ce code promo n'est plus valable";
  if (discount.startsAt && now < discount.startsAt) return "Ce code promo n'est pas encore valable";
  if (discount.endsAt && now > discount.endsAt) return 'Ce code promo a expiré';
  if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
    return "Ce code promo a atteint son nombre maximum d'utilisations";
  }
  if (discount.stageId !== stageId) return "Ce code promo ne s'applique pas à ce stage";
  return null;
};

export const getDiscountCodes = async (): Promise<DiscountCode[]> => {
  const snapshot = await getDocs(query(collection(db, DISCOUNT_CODES_COLLECTION), orderBy('code', 'asc')));
  return snapshot.docs.map((d) => fromSnapshot(d.id, d.data()));
};

export const createDiscountCode = async (
  input: Omit<DiscountCode, 'usedCount'>
): Promise<void> => {
  await setDoc(doc(db, DISCOUNT_CODES_COLLECTION, input.code), {
    label: input.label,
    target: input.target,
    type: input.type,
    value: input.value,
    stageId: input.stageId,
    active: input.active,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    maxUses: input.maxUses,
    usedCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateDiscountCode = async (
  code: string,
  changes: Partial<Omit<DiscountCode, 'code' | 'usedCount'>>
): Promise<void> => {
  await updateDoc(doc(db, DISCOUNT_CODES_COLLECTION, code), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
};

export const deleteDiscountCode = async (code: string): Promise<void> => {
  await deleteDoc(doc(db, DISCOUNT_CODES_COLLECTION, code));
};

// Compte l'utilisation une seule fois par panier, au moment où la commande est validée
export const redeemDiscountCode = async (cartId: string): Promise<void> => {
  await runTransaction(db, async (tx) => {
    const cartRef = doc(db, CARTS_COLLECTION, cartId);
    const cartSnap = await tx.get(cartRef);
    const cartData = cartSnap.data();
    const code = cartData?.appliedCoupon as string | null | undefined;
    if (!code || cartData?.couponCounted) return;

    const discountRef = doc(db, DISCOUNT_CODES_COLLECTION, code);
    const discountSnap = await tx.get(discountRef);
    if (!discountSnap.exists()) throw new Error('Code promo introuvable');
    const maxUses = discountSnap.data().maxUses as number | null | undefined;
    const usedCount = Number(discountSnap.data().usedCount ?? 0);
    if (maxUses != null && usedCount >= maxUses) {
      throw new Error("Ce code promo a atteint son nombre maximum d'utilisations");
    }

    tx.update(discountRef, { usedCount: usedCount + 1 });
    tx.update(cartRef, { couponCounted: true });
  });
};
