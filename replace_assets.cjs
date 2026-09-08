const fs = require('fs');
let content = fs.readFileSync('src/components/modules/AssetsModule.tsx', 'utf8');

content = content.replace(
  /<select\s+value=\{physicalStatus\}\s+onChange=\{\(e\) => setPhysicalStatus\(e\.target\.value as any\)\}\s+className="[^"]+"\s*>\s*<option value="RECOVERED_WAREHOUSE">RECOVERED WAREHOUSE<\/option>\s*<option value="HANDED_OVER_TO_CLIENT">HANDED OVER TO CLIENT<\/option>\s*<option value="AUCTIONED">AUCTIONED<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                  value={physicalStatus}
                  onChange={(val) => setPhysicalStatus(val as any)}
                  searchable={false}
                  options={[
                    { value: 'RECOVERED_WAREHOUSE', label: 'RECOVERED WAREHOUSE' },
                    { value: 'HANDED_OVER_TO_CLIENT', label: 'HANDED OVER TO CLIENT' },
                    { value: 'AUCTIONED', label: 'AUCTIONED' },
                  ]}
                />`
);

fs.writeFileSync('src/components/modules/AssetsModule.tsx', content);
