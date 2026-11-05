import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InsuranceSettings } from '@/types';

// Document lisible par tous (la page stage est accessible sans connexion)
const insuranceSettingsRef = () => doc(db, 'insuranceSettings', 'default');

export const getInsuranceSettings = async (): Promise<InsuranceSettings | null> => {
  const snap = await getDoc(insuranceSettingsRef());
  if (!snap.exists()) return null;
  const data = snap.data();
  return { enabled: data.enabled === true, percent: Number(data.percent ?? 0) };
};

export const saveInsuranceSettings = async (settings: InsuranceSettings): Promise<void> => {
  await setDoc(insuranceSettingsRef(), { ...settings, updatedAt: serverTimestamp() }, { merge: true });
};
