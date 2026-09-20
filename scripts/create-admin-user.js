#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (using service account from environment)
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath) {
  console.error('FIREBASE_SERVICE_ACCOUNT_PATH environment variable not set');
  console.error('Download your service account key from Firebase Console:');
  console.error('Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/create-admin-user.js <UID>');
  process.exit(1);
}

const db = admin.firestore();

async function createAdminUser() {
  try {
    await db.collection('users').doc(uid).set({
      roles: ['admin'],
      email: 'admin@kdanse.local',
      displayName: 'Admin Kdanse',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    console.log(`✓ Admin user created: ${uid}`);
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();
