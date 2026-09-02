const fs = require('fs');
let content = fs.readFileSync('src/components/modules/CollectionModule.tsx', 'utf8');

content = content.replace(
  /<select[\s\S]*?value=\{photo\.category\}[\s\S]*?<\/select>/,
  `<SearchableSelect 
                          value={photo.category}
                          onChange={(val) => updatePhotoMeta(photo.id, { category: val as any })}
                          searchable={false}
                          options={[
                            { value: 'RUMAH_DEBITUR', label: 'Rumah Debitur' },
                            { value: 'TEMU_DEBITUR', label: 'Pertemuan Debitur' },
                            { value: 'KENDARAAN', label: 'Kendaraan' },
                            { value: 'STNK', label: 'STNK' },
                            { value: 'KUNCI', label: 'Kunci' },
                            { value: 'KTP_DEBITUR', label: 'KTP Debitur' },
                            { value: 'LAINNYA', label: 'Lainnya' },
                          ]}
                        />`
);

fs.writeFileSync('src/components/modules/CollectionModule.tsx', content);
