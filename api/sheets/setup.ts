import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { authFor } from '../lib/googleAuth';

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
    const { spreadsheetId } = req.body || {};
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Missing spreadsheetId' });
    }

    const auth = authFor([
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ]);

    const sheets = google.sheets({ version: 'v4', auth });

    const requiredTabs = [
      'Users', 'Roles', 'Clients', 'Partners', 'Services', 'Fees', 'Contracts',
      'Leads', 'Customers', 'Cases', 'Assignments', 'SK', 'Communication_Log',
      'Assets', 'Collections', 'Payments', 'Funding', 'Expenses', 'Settlements',
      'Ledger', 'Cash', 'Documents', 'Approvals', 'Notifications', 'Audit_Log', 'Settings'
    ];

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = (spreadsheet.data.sheets || []).map(s => s.properties?.title);

    const requests: any[] = [];
    requiredTabs.forEach(tab => {
      if (!existingSheets.includes(tab)) {
        requests.push({
          addSheet: {
            properties: { title: tab }
          }
        });
      }
    });

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
    }

    return res.status(200).json({
      success: true,
      spreadsheetId,
      message: `Successfully verified/created all ${requiredTabs.length} sheets in Google Spreadsheet!`,
      sheets: requiredTabs,
    });
  } catch (err: any) {
    console.error('Sheets Setup Error:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to setup Google Sheets. Please check Spreadsheet ID and permissions.',
    });
  }
}
