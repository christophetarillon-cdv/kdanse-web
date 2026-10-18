import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface CancelTarget {
  id: string;
  amount: number;
  paymentPlanId: string | null;
}

export interface CancelInput {
  reason: string;
  refundAmount: number;
  refundDate: string | null;
  refundNote: string;
  adminId: string;
}

export const cancelMemberships = async (targets: CancelTarget[], input: CancelInput): Promise<{ receivedTotal: number }> => {
  const batch = writeBatch(db);
  const now = serverTimestamp();
  let receivedTotal = 0;

  const planIds = [...new Set(targets.map((t) => t.paymentPlanId).filter((id): id is string => !!id))];
  for (const planId of planIds) {
    const installmentsSnap = await getDocs(
      query(collection(db, 'paymentInstallments'), where('paymentPlanId', '==', planId))
    );
    installmentsSnap.docs.forEach((d) => {
      const { status, amount } = d.data();
      if (status === 'pending') {
        batch.update(d.ref, { status: 'cancelled', updatedAt: now });
      } else if (status === 'received') {
        receivedTotal += Number(amount ?? 0);
      }
    });
  }

  targets.forEach((target) => {
    batch.update(doc(db, 'memberships', target.id), {
      status: 'cancelled',
      cancelledAt: now,
      cancelReason: input.reason,
      updatedAt: now,
    });
    batch.set(doc(collection(db, 'membershipHistory')), {
      membershipId: target.id,
      action: 'cancel',
      detail: input.reason,
      by: input.adminId,
      at: now,
    });
  });

  if (input.refundAmount > 0) {
    batch.set(doc(collection(db, 'refunds')), {
      membershipIds: targets.map((t) => t.id),
      amount: input.refundAmount,
      date: input.refundDate,
      note: input.refundNote,
      by: input.adminId,
      createdAt: now,
    });
  }

  await batch.commit();
  return { receivedTotal };
};
