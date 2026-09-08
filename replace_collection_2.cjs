const fs = require('fs');
let content = fs.readFileSync('src/components/modules/CollectionModule.tsx', 'utf8');

content = content.replace(
  /<select\s+value=\{repossessionVehicleType\}\s+onChange=\{\(e\) => setRepossessionVehicleType\(e\.target\.value as any\)\}\s+className="[^"]+"\s*>\s*<option value="MOTORCYCLE">Sepeda Motor \(Roda 2\)<\/option>\s*<option value="PASSENGER_CAR">Mobil Penumpang \/ MPV \/ SUV<\/option>\s*<option value="COMMERCIAL_VEHICLE">Mobil Komersial \/ Truk \/ Box<\/option>\s*<option value="HEAVY_EQUIPMENT">Alat Berat \/ Heavy Unit<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                      value={repossessionVehicleType}
                      onChange={(val) => setRepossessionVehicleType(val as any)}
                      searchable={false}
                      options={[
                        { value: 'MOTORCYCLE', label: 'Sepeda Motor (Roda 2)' },
                        { value: 'PASSENGER_CAR', label: 'Mobil Penumpang / MPV / SUV' },
                        { value: 'COMMERCIAL_VEHICLE', label: 'Mobil Komersial / Truk / Box' },
                        { value: 'HEAVY_EQUIPMENT', label: 'Alat Berat / Heavy Unit' },
                      ]}
                    />`
);

content = content.replace(
  /<select\s+value=\{repossessionCondition\}\s+onChange=\{\(e\) => setRepossessionCondition\(e\.target\.value as any\)\}\s+className="[^"]+"\s*>\s*<option value="EXCELLENT">Sangat Baik \(Mulus\)<\/option>\s*<option value="GOOD">Baik \(Lecet Pemakaian\)<\/option>\s*<option value="FAIR">Wajar \(Sedang\)<\/option>\s*<option value="DAMAGED">Rusak Berat \/ Bekas Laka<\/option>\s*<option value="PARTS_MISSING">Mesin Mati \/ Part Hilang<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                      value={repossessionCondition}
                      onChange={(val) => setRepossessionCondition(val as any)}
                      searchable={false}
                      options={[
                        { value: 'EXCELLENT', label: 'Sangat Baik (Mulus)' },
                        { value: 'GOOD', label: 'Baik (Lecet Pemakaian)' },
                        { value: 'FAIR', label: 'Wajar (Sedang)' },
                        { value: 'DAMAGED', label: 'Rusak Berat / Bekas Laka' },
                        { value: 'PARTS_MISSING', label: 'Mesin Mati / Part Hilang' },
                      ]}
                    />`
);

content = content.replace(
  /<select\s+value=\{paymentMethod\}\s+onChange=\{\(e\) => setPaymentMethod\(e\.target\.value as any\)\}\s+className="[^"]+"\s*>\s*<option value="TRANSFER">Transfer Bank<\/option>\s*<option value="CASH">Tunai \/ Cash<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                      value={paymentMethod}
                      onChange={(val) => setPaymentMethod(val as any)}
                      searchable={false}
                      options={[
                        { value: 'TRANSFER', label: 'Transfer Bank' },
                        { value: 'CASH', label: 'Tunai / Cash' },
                      ]}
                    />`
);

fs.writeFileSync('src/components/modules/CollectionModule.tsx', content);
