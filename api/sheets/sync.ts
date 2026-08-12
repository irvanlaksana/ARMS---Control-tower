import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { spreadsheetId, data } = req.body || {};
    if (!spreadsheetId || !data) {
      return res.status(400).json({ error: 'Missing spreadsheetId or data' });
    }

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const STORE_KEY_MAP: Record<string, string> = {
      users: 'Users',
      roles: 'Roles',
      clients: 'Clients',
      partners: 'Partners',
      services: 'Services',
      fees: 'Fees',
      contracts: 'Contracts',
      leads: 'Leads',
      customers: 'Customers',
      cases: 'Cases',
      assignments: 'Assignments',
      sks: 'SK',
      commLogs: 'Communication_Log',
      assets: 'Assets',
      collections: 'Collections',
      assetRecoveries: 'Collections',
      payments: 'Payments',
      danaTalangan: 'Funding',
      expenses: 'Expenses',
      settlements: 'Settlements',
      ledger: 'Ledger',
      cashAccounts: 'Cash',
      documents: 'Documents',
      approvals: 'Approvals',
      notifications: 'Notifications',
      auditLogs: 'Audit_Log',
      settings: 'Settings'
    };

    const updatedTabs: string[] = [];
    const keys = Object.keys(data);

    for (const key of keys) {
      const tabName = STORE_KEY_MAP[key] || key;
      let records = data[key];
      if (key === 'settings' && records && typeof records === 'object' && !Array.isArray(records)) {
        records = Object.keys(records).map(k => ({ key: k, value: String(records[k]), updatedAt: new Date().toISOString() }));
      }

      if (Array.isArray(records) && records.length > 0) {
        const headers = Object.keys(records[0]);
        const rows = [
          headers,
          ...records.map((r: any) => headers.map(h => {
            const val = r[h];
            if (val === undefined || val === null) return '';
            if (typeof val === 'object') return JSON.stringify(val);
            return String(val);
          }))
        ];

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${tabName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows },
        });
        updatedTabs.push(tabName);
      }
    }

    return res.status(200).json({
      success: true,
      updatedTabs,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Sheets Sync Error:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Error syncing to Google Sheets',
    });
  }
}
