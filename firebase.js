// firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


const firebaseConfig = {
  apiKey: "yo",
  authDomain: "gurt",
  projectId: "yo",
  storageBucket: "gurt",
  messagingSenderId: "yo",
  appId: "gurt"
};

// Initialize once and export services
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
