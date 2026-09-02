const fs = require('fs');
let content = fs.readFileSync('src/components/modules/PaymentsModule.tsx', 'utf8');

content = content.replace(
  /<select\s+value=\{paymentMethod\}\s+onChange=\{\(e\) => setPaymentMethod\(e\.target\.value as any\)\}\s+className="[^"]+"\s*>\s*<option value="TRANSFER">Transfer Bank \(Rekening Penampung PT\)<\/option>\s*<option value="CASH">Tunai \/ Cash Kwitansi Lapangan<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                  value={paymentMethod}
                  onChange={(val) => setPaymentMethod(val as any)}
                  searchable={false}
                  options={[
                    { value: 'TRANSFER', label: 'Transfer Bank (Rekening Penampung PT)' },
                    { value: 'CASH', label: 'Tunai / Cash Kwitansi Lapangan' },
                  ]}
                />`
);

content = content.replace(
  /<select\s+value=\{paymentType\}\s+onChange=\{\(e\) => setPaymentType\(e\.target\.value as any\)\}\s+className="[^"]+"\s*>\s*<option value="PARTIAL_PAYMENT">Angsuran \/ Partial Payment \(Kasus Tetap Open\)<\/option>\s*<option value="FULL_PAYMENT">Pelunasan \/ Full Payment \(Otomatis CLOSE Kasus\)<\/option>\s*<option value="SETTLEMENT_NEGOTIATED">Settlement Negosiasi \(Otomatis CLOSE Kasus\)<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                  value={paymentType}
                  onChange={(val) => setPaymentType(val as any)}
                  searchable={false}
                  options={[
                    { value: 'PARTIAL_PAYMENT', label: 'Angsuran / Partial Payment (Kasus Tetap Open)' },
                    { value: 'FULL_PAYMENT', label: 'Pelunasan / Full Payment (Otomatis CLOSE Kasus)' },
                    { value: 'SETTLEMENT_NEGOTIATED', label: 'Settlement Negosiasi (Otomatis CLOSE Kasus)' },
                  ]}
                />`
);

fs.writeFileSync('src/components/modules/PaymentsModule.tsx', content);
