const fs = require('fs');

function replaceInFile(filepath, regex, replacement) {
  let content = fs.readFileSync(filepath, 'utf8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(filepath, content);
}

replaceInFile('src/components/modules/AssignmentModule.tsx', 
  /<select[\s\S]*?value=\{personnelId\}[\s\S]*?<\/select>/,
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

replaceInFile('src/components/modules/CasesModule.tsx', 
  /<select[\s\S]*?value=\{personnelId\}[\s\S]*?<\/select>/,
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

