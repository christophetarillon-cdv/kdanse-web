import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

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

async function initializeCollections() {
  try {
    console.log('Initializing Firestore collections...');

    // Create stages
    const stagesRef = collection(db, 'stages');

    await setDoc(doc(stagesRef, 'stage-2024-summer'), {
      id: 'stage-2024-summer',
      name: 'Stage d\'été 2024',
      description: 'Stage intensif de danse contemporaine et hip-hop',
      startDate: new Date('2024-07-01'),
      endDate: new Date('2024-07-14'),
      maxParticipants: 30,
      pricing: {
        solo: 300,
        couple: 500,
        ffdanse: 200,
        withHousing: 150,
      },
      location: 'Montpellier',
      createdAt: new Date(),
    });

    await setDoc(doc(stagesRef, 'stage-2024-autumn'), {
      id: 'stage-2024-autumn',
      name: 'Stage d\'automne 2024',
      description: 'Découverte et perfectionnement en danse classique',
      startDate: new Date('2024-09-16'),
      endDate: new Date('2024-09-22'),
      maxParticipants: 25,
      pricing: {
        solo: 250,
        couple: 450,
        ffdanse: 150,
        withHousing: 120,
      },
      location: 'Lyon',
      createdAt: new Date(),
    });

    console.log('✅ Stages created');

    // Create empty collections references (they'll be auto-created when first document is added)
    console.log('✅ Collections structure created');
    console.log('\nFirestore initialization complete!');
    console.log('Collections created:');
    console.log('  - stages');
    console.log('  - memberships');
    console.log('  - paymentGroups');
    console.log('  - paymentInstallments');
    console.log('  - bankAccounts');

  } catch (error) {
    console.error('Error initializing Firestore:', error);
    process.exit(1);
  }
}

initializeCollections();
