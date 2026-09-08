import { initializeApp } from 'firebase/app';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence Firestore's console error spam about offline/unavailable states
// in the preview environment, which causes false-positive crash reports.
setLogLevel('silent');

const app = initializeApp(firebaseConfig);
const databaseId = import.meta.env.VITE_FIRESTORE_DATABASE_ID
  || "ai-studio-armsptmitrajasat-52aae9e1-5f32-4716-863f-a8a1a969eef9";
const db = getFirestore(app, databaseId);
const auth = getAuth(app);

export { app, db, auth };
