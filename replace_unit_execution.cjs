const fs = require('fs');

let content = fs.readFileSync('src/components/modules/UnitExecutionModal.tsx', 'utf8');

content = content.replace(
  /<select\s+value=\{selectedPersonnelId\}\s+onChange=\{\(e\) => setSelectedPersonnelId\(e\.target\.value\)\}\s+className="[^"]+"\s*>\s*\{store\.personnel\.map\(\(p\) => \(\s*<option key=\{p\.id\} value=\{p\.id\}>\s*\{p\.fullName\} \(\{p\.type === 'MITRA_DC' \? '⚡ Mitra DC Freelance' : '🏢 Karyawan Internal'\}\) - \{p\.position \|\| p\.type\}\s*<\/option>\s*\)\)\}\s*<\/select>/g,
  `<SearchableSelect 
                  value={selectedPersonnelId}
                  onChange={setSelectedPersonnelId}
                  options={store.personnel.map(p => ({
                    value: p.id,
                    label: p.fullName,
                    subLabel: \`\${p.type === 'MITRA_DC' ? '⚡ Mitra DC Freelance' : '🏢 Karyawan Internal'} - \${p.position || p.type}\`
                  }))}
                />`
);

content = content.replace(
  /<select\s+value=\{repossessionCondition\}\s+onChange=\{\(e\) => setRepossessionCondition\(e\.target\.value as any\)\}\s+className="[^"]+"\s*>\s*<option value="EXCELLENT">Sangat Baik \(EXCELLENT\)<\/option>\s*<option value="GOOD">Baik \(GOOD\)<\/option>\s*<option value="FAIR">Wajar \(FAIR\)<\/option>\s*<option value="DAMAGED">Rusak \(DAMAGED\)<\/option>\s*<option value="PARTS_MISSING">Ada Part Hilang \(PARTS MISSING\)<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                  value={repossessionCondition}
                  onChange={(val) => setRepossessionCondition(val as any)}
                  searchable={false}
                  options={[
                    { value: 'EXCELLENT', label: 'Sangat Baik (EXCELLENT)' },
                    { value: 'GOOD', label: 'Baik (GOOD)' },
                    { value: 'FAIR', label: 'Wajar (FAIR)' },
                    { value: 'DAMAGED', label: 'Rusak (DAMAGED)' },
                    { value: 'PARTS_MISSING', label: 'Ada Part Hilang (PARTS MISSING)' },
                  ]}
                />`
);

content = content.replace(
  /<select\s+value=\{repossessionVehicleType\}\s+onChange=\{\(e\) => setRepossessionVehicleType\(e\.target\.value as any\)\}\s+className="[^"]+"\s*>\s*<option value="MOTORCYCLE">Sepeda Motor \(R2\)<\/option>\s*<option value="PASSENGER_CAR">Mobil Penumpang \(R4\)<\/option>\s*<option value="COMMERCIAL_VEHICLE">Kendaraan Komersial \(Pickup\/Truk\)<\/option>\s*<option value="HEAVY_EQUIPMENT">Alat Berat<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                  value={repossessionVehicleType}
                  onChange={(val) => setRepossessionVehicleType(val as any)}
                  searchable={false}
                  options={[
                    { value: 'MOTORCYCLE', label: 'Sepeda Motor (R2)' },
                    { value: 'PASSENGER_CAR', label: 'Mobil Penumpang (R4)' },
                    { value: 'COMMERCIAL_VEHICLE', label: 'Kendaraan Komersial (Pickup/Truk)' },
                    { value: 'HEAVY_EQUIPMENT', label: 'Alat Berat' },
                  ]}
                />`
);


fs.writeFileSync('src/components/modules/UnitExecutionModal.tsx', content);
console.log('Done UnitExecutionModal');
