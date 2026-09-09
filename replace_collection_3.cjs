const fs = require('fs');
let content = fs.readFileSync('src/components/modules/CollectionModule.tsx', 'utf8');

content = content.replace(
  /<select\s+value=\{repossessionCondition\}\s+onChange=\{\(e\) => setRepossessionCondition\(e\.target\.value as any\)\}\s+className="[^"]+"\s*>\s*<option value="EXCELLENT">Sangat Baik \/ Mulus<\/option>\s*<option value="GOOD">Baik \/ Normal<\/option>\s*<option value="FAIR">Cukup \/ Baret Minor<\/option>\s*<option value="DAMAGED">Rusak \/ Tidak Jalan<\/option>\s*<option value="PARTS_MISSING">Mesin Mati \/ Part Hilang<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                      value={repossessionCondition}
                      onChange={(val) => setRepossessionCondition(val as any)}
                      searchable={false}
                      options={[
                        { value: 'EXCELLENT', label: 'Sangat Baik / Mulus' },
                        { value: 'GOOD', label: 'Baik / Normal' },
                        { value: 'FAIR', label: 'Cukup / Baret Minor' },
                        { value: 'DAMAGED', label: 'Rusak / Tidak Jalan' },
                        { value: 'PARTS_MISSING', label: 'Mesin Mati / Part Hilang' },
                      ]}
                    />`
);

content = content.replace(
  /<select\s+value=\{paymentMethod\}\s+onChange=\{\(e\) => setPaymentMethod\(e\.target\.value as any\)\}\s+className="[^"]+"\s*>\s*<option value="TRANSFER">Transfer Bank PT<\/option>\s*<option value="CASH">Tunai \/ Cash<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                      value={paymentMethod}
                      onChange={(val) => setPaymentMethod(val as any)}
                      searchable={false}
                      options={[
                        { value: 'TRANSFER', label: 'Transfer Bank PT' },
                        { value: 'CASH', label: 'Tunai / Cash' },
                      ]}
                    />`
);

fs.writeFileSync('src/components/modules/CollectionModule.tsx', content);
