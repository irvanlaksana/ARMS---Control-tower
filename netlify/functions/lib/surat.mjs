/**
 * Operasi modul Surat (SK / Surat Tugas) — dipakai bersama oleh Netlify
 * Functions dan server lokal (server.ts).
 */

/** POST /api/surat/open-generator — bangun URL generator surat dengan payload base64. */
export async function suratOpenGenerator({ skNumber, skId, debtor, personnel, driveDocumentUrl } = {}) {
  if (!debtor || !personnel) {
    return { success: false, error: 'Missing debtor or personnel data' };
  }

  const generatorBase = process.env.GENERATOR_SURAT_BASE_URL || 'https://generator-surat-new.vercel.app';
  const payload = { skNumber, skId, debtor, personnel, driveDocumentUrl };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  const generatorUrl = `${generatorBase}/?payload=${encodeURIComponent(encoded)}`;

  return { success: true, url: generatorUrl };
}

/** POST /api/surat/create-issue — kirim data SK/Debitur/Personel ke GitHub issue (opsional). */
export async function suratCreateIssue({ skNumber, skId, debtor, personnel, driveDocumentUrl } = {}) {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return {
      success: false,
      error: 'Server misconfigured: GITHUB_TOKEN not set. Set the GITHUB_TOKEN environment variable di Netlify untuk mengaktifkan fitur ini.',
    };
  }
  if (!debtor || !personnel) {
    return { success: false, error: 'Missing debtor or personnel data in request body' };
  }

  const repoOwner = process.env.SURAT_REPO_OWNER || 'irvanlaksana';
  const repoName = process.env.SURAT_REPO_NAME || 'generate-surat-tugas';
  const issueTitle = `SK: ${skNumber || skId || 'new'} - ${debtor.debtorName || debtor.name || 'Debtor'}`;

  const issueBody =
    `Auto-synced from ARMS - Control Tower\n\n` +
    `**SK ID / Number:** ${skId || skNumber || ''}\n\n` +
    `**Debtor (case data):**\n\n\`\`\`json\n${JSON.stringify(debtor, null, 2)}\n\`\`\`\n\n` +
    `**Personnel (penerima tugas):**\n\n\`\`\`json\n${JSON.stringify(personnel, null, 2)}\n\`\`\`\n\n` +
    `**Drive Document URL (if any):** ${driveDocumentUrl || ''}\n\n---\n` +
    '*(This issue was created automatically by ARMS - Control Tower to seed generate-surat-tugas with debtor & personnel data.)*';

  try {
    const resp = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'ARMS-Control-Tower',
      },
      body: JSON.stringify({ title: issueTitle, body: issueBody }),
    });

    const jsonBody = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error('GitHub API error:', jsonBody);
      return { success: false, error: jsonBody.message || 'GitHub API error', details: jsonBody };
    }

    return { success: true, issueUrl: jsonBody.html_url, issueNumber: jsonBody.number };
  } catch (err) {
    const cause = err?.cause?.message || '';
    return {
      success: false,
      error: `${err?.message || 'Failed creating GitHub issue'}${cause ? ` (${cause})` : ''}. Pastikan function bisa mengakses api.github.com dan GITHUB_TOKEN valid.`,
    };
  }
}
