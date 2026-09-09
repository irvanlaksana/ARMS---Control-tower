import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0940128449",
  appId: "1:940783112916:web:3a4bee0066862e1a46a141",
  apiKey: "AIzaSyAsweURO34anxM90Wu-LNZkUA8Lr4XukRY",
  authDomain: "gen-lang-client-0940128449.firebaseapp.com",
};

const app = initializeApp(firebaseConfig);
const dbDefault = getFirestore(app);
const dbNamed = getFirestore(app, "ai-studio-armsptmitrajasat-52aae9e1-5f32-4716-863f-a8a1a969eef9");

async function checkDbs() {
  try {
    const snap = await getDocs(collection(dbDefault, 'test'));
    console.log("Default DB exists!");
  } catch (e) {
    console.log("Default DB Error:", e.message);
  }
  
  try {
    const snap = await getDocs(collection(dbNamed, 'test'));
    console.log("Named DB exists!");
  } catch (e) {
    console.log("Named DB Error:", e.message);
  }
  process.exit(0);
}
checkDbs();
