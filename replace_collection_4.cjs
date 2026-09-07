const fs = require('fs');
let content = fs.readFileSync('src/components/modules/CollectionModule.tsx', 'utf8');

// I'll use a more generic regex for these.
content = content.replace(
  /<select[\s\S]*?value=\{repossessionCondition\}[\s\S]*?<\/select>/,
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
  /<select[\s\S]*?value=\{paymentMethod\}[\s\S]*?<\/select>/,
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

content = content.replace(
  /<select[\s\S]*?value=\{filterDate\}[\s\S]*?<\/select>/,
  `<SearchableSelect 
                          value={filterDate}
                          onChange={setFilterDate}
                          searchable={false}
                          options={[
                            { value: 'ALL', label: 'Semua Waktu' },
                            { value: 'TODAY', label: 'Hari Ini' },
                            { value: 'THIS_WEEK', label: 'Minggu Ini' },
                            { value: 'THIS_MONTH', label: 'Bulan Ini' },
                          ]}
                        />`
);


fs.writeFileSync('src/components/modules/CollectionModule.tsx', content);
