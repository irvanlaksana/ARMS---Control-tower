const fs = require('fs');
let content = fs.readFileSync('src/components/modules/DanaTalanganModule.tsx', 'utf8');

content = content.replace(
  /<select\s+value=\{purpose\}\s+onChange=\{\(e\) => setPurpose\(e\.target\.value as any\)\}\s+className="[^"]+"\s*>\s*<option value="PENARIKAN_UNIT">Penarikan Unit<\/option>\s*<option value="BIAYA_DEREK">Biaya Derek<\/option>\s*<option value="BIAYA_GUDANG">Biaya Gudang<\/option>\s*<option value="BIAYA_PENGADILAN">Biaya Pengadilan<\/option>\s*<option value="BIAYA_KEPOLISIAN">Biaya Kepolisian<\/option>\s*<option value="LAIN_LAIN">Lain-Lain<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                  value={purpose}
                  onChange={(val) => setPurpose(val as any)}
                  searchable={false}
                  options={[
                    { value: 'PENARIKAN_UNIT', label: 'Penarikan Unit' },
                    { value: 'BIAYA_DEREK', label: 'Biaya Derek' },
                    { value: 'BIAYA_GUDANG', label: 'Biaya Gudang' },
                    { value: 'BIAYA_PENGADILAN', label: 'Biaya Pengadilan' },
                    { value: 'BIAYA_KEPOLISIAN', label: 'Biaya Kepolisian' },
                    { value: 'LAIN_LAIN', label: 'Lain-Lain' },
                  ]}
                />`
);

content = content.replace(
  /<select\s+value=\{funderSource\}\s+onChange=\{\(e\) => setFunderSource\(e\.target\.value as any\)\}\s+className="[^"]+"\s*>\s*<option value="TALANGAN_VAULT">Talangan Vault \(BCA\)<\/option>\s*<option value="OPERATIONAL_VAULT">Operational Vault \(Mandiri\)<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                  value={funderSource}
                  onChange={(val) => setFunderSource(val as any)}
                  searchable={false}
                  options={[
                    { value: 'TALANGAN_VAULT', label: 'Talangan Vault (BCA)' },
                    { value: 'OPERATIONAL_VAULT', label: 'Operational Vault (Mandiri)' },
                  ]}
                />`
);

fs.writeFileSync('src/components/modules/DanaTalanganModule.tsx', content);
