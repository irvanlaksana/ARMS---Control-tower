import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0940128449",
  appId: "1:940783112916:web:3a4bee0066862e1a46a141",
  apiKey: "AIzaSyAsweURO34anxM90Wu-LNZkUA8Lr4XukRY",
  authDomain: "gen-lang-client-0940128449.firebaseapp.com",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    console.log("Testing default DB...");
    const snap = await getDocs(collection(db, 'settings'));
    console.log("Default DB Success! count:", snap.size);
  } catch (e) {
    console.error("Default DB Error:", e.message);
  }
  process.exit(0);
}
test();
