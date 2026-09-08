const fs = require('fs');

let content = fs.readFileSync('src/components/modules/CollectionModule.tsx', 'utf8');

// select 1: personnelId
content = content.replace(
  /<select\s+value=\{personnelId\}\s+onChange=\{\(e\) => setPersonnelId\(e\.target\.value\)\}\s+className="[^"]+"\s*>\s*\{\(store\.personnel \|\| \[\]\)\.map\(\(p\) => \{\s*const roleLabel = p\.position \|\| \(p\.type \? p\.type\.replace\(\/_\/g, ' '\) : 'Petugas Lapangan'\);\s*return \(\s*<option key=\{p\.id\} value=\{p\.id\}>\s*\{p\.fullName \|\| 'Petugas'\} \(\{roleLabel\}\)\s*<\/option>\s*\);\s*\}\)\}\s*<\/select>/g,
  `<SearchableSelect 
                  value={personnelId}
                  onChange={setPersonnelId}
                  options={(store.personnel || []).map(p => ({
                    value: p.id,
                    label: p.fullName || 'Petugas',
                    subLabel: p.position || (p.type ? p.type.replace(/_/g, ' ') : 'Petugas Lapangan')
                  }))}
                />`
);

// select 2: outcome
content = content.replace(
  /<select\s+value=\{outcome\}\s+onChange=\{\(e\) => \{\s*const val = e\.target\.value as any;\s*setOutcome\(val\);\s*if \(val === 'DEPOSIT_PAID'\) \{\s*setHasPayment\(true\);\s*\}\s*\}\}\s+className="[^"]+"\s*>\s*<option value="PROMISE_TO_PAY">Janji Bayar \(Promise to Pay\)<\/option>\s*<option value="DEPOSIT_PAID">Pembayaran Titipan \/ Pelunasan<\/option>\s*<option value="MEDIATION_AGREED">Sepakat Mediasi Kantor<\/option>\s*<option value="UNIT_FOUND">Unit Ditemukan \/ Teridentifikasi<\/option>\s*<option value="REPOSSESSED">Unit Berhasil Ditarik \/ Diserahterimakan<\/option>\s*<option value="UNREACHABLE">Debitur Tidak di Rumah \/ Nomor Tidak Aktif<\/option>\s*<option value="REFUSED">Menolak Bayar \/ Tidak Kooperatif<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                  value={outcome}
                  onChange={(val) => {
                    setOutcome(val as any);
                    if (val === 'DEPOSIT_PAID') {
                      setHasPayment(true);
                    }
                  }}
                  searchable={false}
                  options={[
                    { value: 'PROMISE_TO_PAY', label: 'Janji Bayar (Promise to Pay)' },
                    { value: 'DEPOSIT_PAID', label: 'Pembayaran Titipan / Pelunasan' },
                    { value: 'MEDIATION_AGREED', label: 'Sepakat Mediasi Kantor' },
                    { value: 'UNIT_FOUND', label: 'Unit Ditemukan / Teridentifikasi' },
                    { value: 'REPOSSESSED', label: 'Unit Berhasil Ditarik / Diserahterimakan' },
                    { value: 'UNREACHABLE', label: 'Debitur Tidak di Rumah / Nomor Tidak Aktif' },
                    { value: 'REFUSED', label: 'Menolak Bayar / Tidak Kooperatif' },
                  ]}
                />`
);


// wait, let's write out and see if they matched
fs.writeFileSync('src/components/modules/CollectionModule.tsx', content);
console.log('CollectionModule partial done');
