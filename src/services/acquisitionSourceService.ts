import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AcquisitionSource } from '@/types/courses';

const ACQUISITION_SOURCES_COLLECTION = 'acquisitionSources';

export const getAcquisitionSources = async (onlyActive = false): Promise<AcquisitionSource[]> => {
  const snapshot = await getDocs(collection(db, ACQUISITION_SOURCES_COLLECTION));
  return snapshot.docs
    .map((d) => ({
      id: d.id,
      label: d.data().label ?? '',
      order: Number(d.data().order ?? 0),
      active: d.data().active !== false,
    }))
    .filter((source) => !onlyActive || source.active)
    .sort((a, b) => a.order - b.order);
};

export const createAcquisitionSource = async (label: string, order: number): Promise<void> => {
  await addDoc(collection(db, ACQUISITION_SOURCES_COLLECTION), {
    label,
    order,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const deleteAcquisitionSource = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, ACQUISITION_SOURCES_COLLECTION, id));
};

export const updateAcquisitionSource = async (
  id: string,
  changes: Partial<Pick<AcquisitionSource, 'label' | 'order' | 'active'>>
): Promise<void> => {
  await updateDoc(doc(db, ACQUISITION_SOURCES_COLLECTION, id), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
};
