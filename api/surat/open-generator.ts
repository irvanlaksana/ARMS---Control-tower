import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  buildGeneratorLink,
  GENERATOR_BASE_URL,
  GENERATOR_REPO_URL,
} from '../lib/generatorLink';

/**
 * POST /api/surat/open-generator
 *
 * Menghasilkan tautan ke generator surat web:
 *   https://generator-surat-beige.vercel.app/  (repo: irvanlaksana/generator-surat-)
 *
 * Payload mengikuti model data aplikasi generator:
 *   • LetterData -> tab "Surat Tugas"
 *   • BastData   -> tab "BAST"
 *
 * Body yang diterima:
 *   1. { payload: <GeneratorPayload dari frontend> }            -> dipakai apa adanya
 *   2. { skNumber, skId, debtor, personnel, driveDocumentUrl,   -> dirakit di sini
 *        companyName, city, docType, paperSize, attachments }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body: any = req.body || {};
    const hasPayload = body.payload && typeof body.payload === 'object' && (body.payload.letter || body.payload.bast);
    if (!hasPayload && (!body.debtor || !body.personnel)) {
      return res.status(400).json({ success: false, error: 'Missing debtor or personnel data' });
    }

    const result = buildGeneratorLink(body);
    return res.json({
      success: true,
      url: result.url,
      generatorBase: GENERATOR_BASE_URL,
      generatorRepo: GENERATOR_REPO_URL,
      docType: result.docType,
      paperSize: result.paperSize,
      payload: result.payload,
      encodedPayload: result.encodedPayload,
      payloadInHash: result.payloadInHash,
      transport: result.transport,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed creating generator link' });
  }
}
