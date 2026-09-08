import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, User as FirebaseUser, onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

interface AuthContextType {
  user: FirebaseUser | null;
  googleToken: string | null;
  spreadsheetId: string | null;
  setSpreadsheetId: (id: string) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem("arms_google_token"));
  const [spreadsheetId, setSpreadsheetIdState] = useState<string | null>(localStorage.getItem("arms_spreadsheet_id"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/spreadsheets");
    provider.addScope("https://www.googleapis.com/auth/drive.file");
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleToken(credential.accessToken);
        localStorage.setItem("arms_google_token", credential.accessToken);
      }
    } catch (error) {
      console.error("Sign-in failed:", error);
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setGoogleToken(null);
    localStorage.removeItem("arms_google_token");
  };

  const setSpreadsheetId = (id: string) => {
    setSpreadsheetIdState(id);
    localStorage.setItem("arms_spreadsheet_id", id);
  }

  return (
    <AuthContext.Provider value={{ user, googleToken, spreadsheetId, setSpreadsheetId, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
