import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence Firestore's console error spam about offline/unavailable states
// in the preview environment, which causes false-positive crash reports.
setLogLevel('silent');

/**
 * Konfigurasi Google Firebase (Firestore = database utama, Firebase Auth =
 * login Google). Konfigurasi web app bersifat publik dan tertanam di repo.
 *
 * Database Firestore yang dipakai: "(default)" — bisa di-override lewat
 * env VITE_FIRESTORE_DATABASE_ID (Netlify: set pada build env).
 */
const app = initializeApp(firebaseConfig as FirebaseOptions);

const databaseId = import.meta.env.VITE_FIRESTORE_DATABASE_ID;
const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
const auth = getAuth(app);

/** Project ID Firebase untuk UI & troubleshooting. */
export const FIREBASE_PROJECT_ID: string = firebaseConfig.projectId;

export { app, db, auth };
