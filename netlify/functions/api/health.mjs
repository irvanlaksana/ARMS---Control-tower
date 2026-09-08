import { preflight, CORS_HEADERS } from '../lib/http.mjs';
import { isGoogleAuthAvailable } from '../lib/googleAuth.mjs';

/** GET /api/health — status server & integrasi Google. */
export default async function handler(req) {
  if (req.method === 'OPTIONS') return preflight(req);

  return new Response(
    JSON.stringify({
      status: 'ok',
      system: 'ARMS - Control Tower Agency DC',
      database: 'Google Cloud Firestore (Firebase)',
      firestoreProject: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0940128449',
      driveConfigured: isGoogleAuthAvailable(),
      sheetsConfigured: isGoogleAuthAvailable(),
      runtime: 'Netlify Functions',
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: CORS_HEADERS }
  );
}
