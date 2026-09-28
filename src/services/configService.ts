import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SiteConfig } from '@/types/config';

const CONFIG_ID = 'site-config';
const CONFIG_COLLECTION = 'config';

export const getConfig = async (): Promise<SiteConfig> => {
  const configDoc = await getDoc(doc(db, CONFIG_COLLECTION, CONFIG_ID));
  if (!configDoc.exists()) {
    return {
      id: CONFIG_ID,
      updatedAt: new Date(),
    };
  }

  const data = configDoc.data();
  return {
    id: CONFIG_ID,
    headerMenuId: data.headerMenuId,
    footerMenuId: data.footerMenuId,
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  };
};

export const updateConfig = async (config: Partial<SiteConfig>): Promise<void> => {
  await setDoc(
    doc(db, CONFIG_COLLECTION, CONFIG_ID),
    {
      ...config,
      updatedAt: new Date(),
    },
    { merge: true }
  );
};
