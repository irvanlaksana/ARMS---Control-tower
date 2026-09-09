const fs = require('fs');
let content = fs.readFileSync('src/components/modules/TransferPartnerCommissionModal.tsx', 'utf8');

content = content.replace(
  /<select\s+value=\{selectedCashAccountId\}\s+onChange=\{\(e\) => setSelectedCashAccountId\(e\.target\.value\)\}\s+className="[^"]+"\s*>\s*\{store\.cashAccounts\.map\(\(acc\) => \(\s*<option key=\{acc\.id\} value=\{acc\.id\}>\s*\{acc\.bankName\} \{acc\.accountNumber\} \(\{acc\.accountName\}\)\s*<\/option>\s*\)\)\}\s*<\/select>/g,
  `<SearchableSelect 
                    value={selectedCashAccountId}
                    onChange={setSelectedCashAccountId}
                    options={store.cashAccounts.map((acc) => ({
                      value: acc.id,
                      label: \`\${acc.bankName} \${acc.accountNumber}\`,
                      subLabel: acc.accountName
                    }))}
                  />`
);

fs.writeFileSync('src/components/modules/TransferPartnerCommissionModal.tsx', content);
