/**
 * Parser sederhana untuk file skema PostgreSQL (migrasi ARMS di
 * schema/migrations/*.sql — sumber kebenaran skema, termasuk untuk
 * migrasi ke Firestore).
 * Dipakai oleh scripts/generate-firestore-schema.mjs dan
 * scripts/validate-arms-data.mjs agar keduanya memakai satu sumber logika.
 */

/**
 * @typedef {Object} ParsedColumn
 * @property {string} name
 * @property {boolean} notNull
 * @property {boolean} hasDefault
 * @property {[string, string] | null} fk  [tabel_induk, kolom_induk]
 * @property {string} raw
 */

/**
 * Ambil definisi kolom untuk tiap `CREATE TABLE ... public.<nama> ( ... );`
 * @param {string} sqlText
 * @returns {Record<string, ParsedColumn[]>}
 */
export function parseSqlTables(sqlText) {
  /** @type {Record<string, ParsedColumn[]>} */
  const tables = {};
  const re = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+public\.(\w+)\s*\(([\s\S]*?)\n\);/g;
  let m;
  while ((m = re.exec(sqlText))) {
    const [, table, body] = m;
    /** @type {ParsedColumn[]} */
    const cols = [];
    let depth = 0;
    let buf = '';

    const flush = () => {
      const t = buf.trim();
      buf = '';
      if (!t) return;
      if (/^(CONSTRAINT|PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK|EXCLUDE)\b/i.test(t)) return;
      const nameMatch = t.match(/^"?([a-z_][a-z0-9_]*)"?\s/i);
      if (!nameMatch) return;
      const fkMatch = t.match(/REFERENCES\s+public\.(\w+)\s*\(\s*(\w+)\s*\)/i);
      cols.push({
        name: nameMatch[1].toLowerCase(),
        notNull: /\bNOT NULL\b/i.test(t) || /\bPRIMARY KEY\b/i.test(t),
        hasDefault: /\bDEFAULT\b/i.test(t),
        fk: fkMatch ? [fkMatch[1], fkMatch[2]] : null,
        raw: t.replace(/\s+/g, ' '),
      });
    };

    for (const ch of body) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) flush();
      else buf += ch;
    }
    flush();
    tables[table] = cols;
  }

  // Terapkan ALTER TABLE ... ADD COLUMN agar migrasi lanjutan ikut ter-generate.
  const alterRe = /ALTER TABLE(?:\s+IF EXISTS)?\s+public\.(\w+)\s+([\s\S]*?);/gi;
  let am;
  while ((am = alterRe.exec(sqlText))) {
    const table = am[1];
    const body = am[2];
    if (!tables[table]) tables[table] = [];
    const addRe = /ADD COLUMN(?:\s+IF NOT EXISTS)?\s+"?([a-z_][a-z0-9_]*)"?\s+([^,]+)/gi;
    let addm;
    while ((addm = addRe.exec(body))) {
      const name = addm[1].toLowerCase();
      if (tables[table].some((c) => c.name === name)) continue;
      const rest = addm[2];
      tables[table].push({
        name,
        notNull: /\bNOT NULL\b/i.test(rest) || /\bPRIMARY KEY\b/i.test(rest),
        hasDefault: /\bDEFAULT\b/i.test(rest),
        fk: null,
        raw: `ADD COLUMN ${name} ${rest.replace(/\s+/g, ' ').trim()}`,
      });
    }
  }

  return tables;
}

/**
 * Kolom NOT NULL yang punya DEFAULT.
 * Mengirim null eksplisit ke kolom ini = error, karena Postgres hanya memakai
 * DEFAULT bila key-nya TIDAK dikirim sama sekali.
 * @param {Record<string, ParsedColumn[]>} tables
 * @returns {Record<string, string[]>}
 */
export function collectDefaultedNotNull(tables) {
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const [t, cols] of Object.entries(tables)) {
    const names = cols.filter((c) => c.notNull && c.hasDefault).map((c) => c.name);
    if (names.length) out[t] = names;
  }
  return out;
}

/**
 * Peta foreign key: tabel -> kolom -> { table, column, nullable }
 * @param {Record<string, ParsedColumn[]>} tables
 */
export function collectForeignKeys(tables) {
  /** @type {Record<string, Record<string, { table: string; column: string; nullable: boolean }>>} */
  const out = {};
  for (const [t, cols] of Object.entries(tables)) {
    for (const c of cols) {
      if (!c.fk) continue;
      out[t] = out[t] || {};
      out[t][c.name] = { table: c.fk[0], column: c.fk[1], nullable: !c.notNull };
    }
  }
  return out;
}
