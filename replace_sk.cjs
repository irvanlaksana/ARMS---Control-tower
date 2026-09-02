const fs = require('fs');
let content = fs.readFileSync('src/components/modules/SKModule.tsx', 'utf8');

content = content.replace(
  /<select\s+value=\{personnelId\}\s+onChange=\{\(e\) => setPartnerId\(e\.target\.value\)\}\s+className="[^"]+"\s*>\s*\{\(store\.personnel \|\| \[\]\)\.map\(\(pr\) => \(\s*<option key=\{pr\.id\} value=\{pr\.id\}>\s*\{pr\.fullName\} \(\{pr\.type === 'MITRA_DC' \? 'Mitra DC' : 'Internal'\}\)\s*<\/option>\s*\)\)\}\s*<\/select>/g,
  `<SearchableSelect 
                      value={personnelId}
                      onChange={setPartnerId}
                      options={(store.personnel || []).map((pr) => ({
                        value: pr.id,
                        label: pr.fullName,
                        subLabel: pr.type === 'MITRA_DC' ? 'Mitra DC' : 'Internal'
                      }))}
                    />`
);

fs.writeFileSync('src/components/modules/SKModule.tsx', content);
