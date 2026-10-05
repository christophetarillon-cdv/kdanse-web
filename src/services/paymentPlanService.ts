import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PaymentPlan, PaymentInstallment, PaymentSettings, Cart, Membership } from '@/types';

const PAYMENT_PLANS_COLLECTION = 'paymentPlans';
const INSTALLMENTS_COLLECTION = 'paymentInstallments';
const PAYMENT_SETTINGS_COLLECTION = 'paymentSettings';

// Create payment plan with installments
export const createPaymentPlan = async (
  cartId: string,
  userId: string,
  totalAmount: number,
  installmentCount: number,
  installments: Array<{
    method: 'cheque' | 'virement' | 'cheque_vacances';
    amount: number;
    dueDate: string;
    chequeNumber?: string;
    chequeBank?: string;
    chequeCity?: string;
    chequeName?: string;
    chequeVacancesCount?: number;
  }>,
  cart?: Cart
): Promise<PaymentPlan> => {
  const planId = doc(collection(db, PAYMENT_PLANS_COLLECTION)).id;

  // Calculate equal installment amounts if not specified
  const amountPerInstallment = totalAmount / installmentCount;

  // Create installment documents
  const installmentDocs = installments.map((inst) => ({
    id: doc(collection(db, INSTALLMENTS_COLLECTION)).id,
    paymentPlanId: planId,
    amount: inst.amount || amountPerInstallment,
    dueDate: new Date(inst.dueDate),
    method: inst.method,
    status: 'pending' as const,
    chequeNumber: inst.chequeNumber,
    chequeBank: inst.chequeBank,
    chequeCity: inst.chequeCity,
    chequeName: inst.chequeName,
    chequeVacancesCount: inst.chequeVacancesCount,
    createdAt: new Date(),
  }));

  // Save plan (without full installments, they're saved separately)
  await setDoc(doc(db, PAYMENT_PLANS_COLLECTION, planId), {
    cartId,
    userId,
    totalAmount,
    installmentCount,
    status: 'active',
    acceptedTerms: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const plan: PaymentPlan = {
    id: planId,
    cartId,
    userId,
    totalAmount,
    installmentCount,
    installments: installmentDocs,
    status: 'active',
    acceptedTerms: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Save installments with their IDs (remove undefined values)
  await Promise.all(
    installmentDocs.map((inst) => {
      const { id: instId, ...instData } = inst;
      const cleanedInst = Object.fromEntries(
        Object.entries(instData).filter(([, v]) => v !== undefined)
      );
      return setDoc(doc(db, INSTALLMENTS_COLLECTION, instId), {
        ...cleanedInst,
        createdAt: serverTimestamp(),
      });
    })
  );

  // Create memberships for each item in cart (status: pending_plan)
  if (cart && cart.items.length > 0) {
    await Promise.all(
      cart.items.map((item) =>
        addDoc(collection(db, 'memberships'), {
          userId,
          stageId: item.stageId,
          stageName: item.stageName,
          registrationDetails: item.configuration,
          amount: item.totals?.total || 0,
          paymentMethod: 'plan',
          status: 'pending_plan',
          paymentPlanId: planId,
          cartId: cart.id,
          createdAt: serverTimestamp(),
        })
      )
    );
  }

  return plan;
};

// Get payment plan by ID
export const getPaymentPlan = async (planId: string): Promise<PaymentPlan | null> => {
  const docSnap = await getDoc(doc(db, PAYMENT_PLANS_COLLECTION, planId));
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  const installmentsSnap = await getDocs(
    query(
      collection(db, INSTALLMENTS_COLLECTION),
      where('paymentPlanId', '==', planId)
    )
  );

  const installments = installmentsSnap.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,  // Override with correct document ID, not the field id
    dueDate: doc.data().dueDate?.toDate?.() || new Date(doc.data().dueDate),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
  })) as PaymentInstallment[];

  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
    installments,
  } as PaymentPlan;
};

// Get payment plans by cart
export const getPaymentPlanByCart = async (cartId: string): Promise<PaymentPlan | null> => {
  const q = query(
    collection(db, PAYMENT_PLANS_COLLECTION),
    where('cartId', '==', cartId)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  return getPaymentPlan(snapshot.docs[0].id);
};

// Mark installment as received
export const markInstallmentReceived = async (
  installmentId: string,
  userId: string,
  notes?: string
): Promise<void> => {
  await updateDoc(doc(db, INSTALLMENTS_COLLECTION, installmentId), {
    status: 'received',
    receivedDate: serverTimestamp(),
    confirmedBy: userId,
    notes: notes || '',
    updatedAt: serverTimestamp(),
  });
};

// Update installment details
export const updateInstallment = async (
  installmentId: string,
  data: Partial<PaymentInstallment>
): Promise<void> => {
  const { id, createdAt, ...updateData } = data as any;
  await updateDoc(doc(db, INSTALLMENTS_COLLECTION, installmentId), {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
};

// Get payment settings (Kdanse bank info)
export const getPaymentSettings = async (): Promise<PaymentSettings | null> => {
  const snapshot = await getDocs(collection(db, PAYMENT_SETTINGS_COLLECTION));
  if (snapshot.empty) return null;

  const data = snapshot.docs[0].data();
  return {
    id: snapshot.docs[0].id,
    ...data,
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  } as PaymentSettings;
};

// Save payment settings
export const savePaymentSettings = async (settings: Omit<PaymentSettings, 'id' | 'updatedAt'>): Promise<void> => {
  const existing = await getPaymentSettings();

  if (existing) {
    await updateDoc(doc(db, PAYMENT_SETTINGS_COLLECTION, existing.id), {
      ...settings,
      updatedAt: serverTimestamp(),
    });
  } else {
    await addDoc(collection(db, PAYMENT_SETTINGS_COLLECTION), {
      ...settings,
      updatedAt: serverTimestamp(),
    });
  }
};

// Get all pending installments for admin
export const getPendingInstallments = async (): Promise<PaymentInstallment[]> => {
  const q = query(
    collection(db, INSTALLMENTS_COLLECTION),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,  // Override with correct document ID
    dueDate: doc.data().dueDate?.toDate?.() || new Date(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
  })) as PaymentInstallment[];
};

// Get installments by plan
export const getInstallmentsByPlan = async (planId: string): Promise<PaymentInstallment[]> => {
  const q = query(
    collection(db, INSTALLMENTS_COLLECTION),
    where('paymentPlanId', '==', planId)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,  // Override with correct document ID
    dueDate: doc.data().dueDate?.toDate?.() || new Date(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
  })) as PaymentInstallment[];
};

// Get payment plan with associated membership (reusable for admin & danseur space)
export const getPaymentPlanWithMembership = async (
  planId: string
): Promise<(PaymentPlan & { membership?: Membership }) | null> => {
  // Get the payment plan
  const plan = await getPaymentPlan(planId);
  if (!plan) return null;

  // Find the membership associated with this plan
  const q = query(
    collection(db, 'memberships'),
    where('paymentPlanId', '==', planId)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.warn(`No membership found for planId: ${planId}`);
    return plan;
  }

  const membershipDoc = snapshot.docs[0];
  const membership = {
    id: membershipDoc.id,
    ...membershipDoc.data(),
    createdAt: membershipDoc.data().createdAt?.toDate?.() || new Date(),
    updatedAt: membershipDoc.data().updatedAt?.toDate?.() || new Date(),
  } as Membership;

  console.log(`Found membership for planId ${planId}:`, membership.stageName);

  return { ...plan, membership };
};
