import { initializeApp } from 'firebase/app';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Silence Firestore's console error spam about offline/unavailable states
// in the preview environment, which causes false-positive crash reports.
setLogLevel('silent');

const firebaseConfig = {
  projectId: "gen-lang-client-0940128449",
  appId: "1:940783112916:web:3a4bee0066862e1a46a141",
  apiKey: "AIzaSyAsweURO34anxM90Wu-LNZkUA8Lr4XukRY",
  authDomain: "gen-lang-client-0940128449.firebaseapp.com",
  storageBucket: "gen-lang-client-0940128449.firebasestorage.app",
  messagingSenderId: "940783112916",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-armsptmitrajasat-52aae9e1-5f32-4716-863f-a8a1a969eef9");
const auth = getAuth(app);

export { app, db, auth };
