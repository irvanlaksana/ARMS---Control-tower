const fs = require('fs');
let content = fs.readFileSync('src/components/modules/LawyerModule.tsx', 'utf8');

content = content.replace(
  /<select\s+value=\{noticeType\}\s+onChange=\{\(e\) => setNoticeType\(e\.target\.value as LawyerNotice\['noticeType'\]\)\}\s+className="[^"]+"\s*>\s*<option value="SURAT_KLARIFIKASI">1\. Surat Klarifikasi & Konfirmasi Piutang<\/option>\s*<option value="SOMASI_1">2\. Surat Somasi Pertama \(1\)<\/option>\s*<option value="SOMASI_2">3\. Surat Somasi Kedua \(2\)<\/option>\s*<option value="SOMASI_3">4\. Surat Somasi Ketiga \(3\) & Terakhir<\/option>\s*<option value="LAPORAN_POLISI">5\. Pengaduan\/Laporan Polisi<\/option>\s*<option value="GUGATAN_PERDATA">6\. Gugatan Perdata di Pengadilan<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                      value={noticeType}
                      onChange={(val) => setNoticeType(val as LawyerNotice['noticeType'])}
                      searchable={false}
                      options={[
                        { value: 'SURAT_KLARIFIKASI', label: '1. Surat Klarifikasi & Konfirmasi Piutang' },
                        { value: 'SOMASI_1', label: '2. Surat Somasi Pertama (1)' },
                        { value: 'SOMASI_2', label: '3. Surat Somasi Kedua (2)' },
                        { value: 'SOMASI_3', label: '4. Surat Somasi Ketiga (3) & Terakhir' },
                        { value: 'LAPORAN_POLISI', label: '5. Pengaduan/Laporan Polisi' },
                        { value: 'GUGATAN_PERDATA', label: '6. Gugatan Perdata di Pengadilan' },
                      ]}
                    />`
);

content = content.replace(
  /<select\s+value=\{viewNotice\.status\}\s+onChange=\{\(e\) => handleUpdateNoticeStatus\(viewNotice\.id, e\.target\.value as LawyerNotice\['status'\]\)\}\s+className="[^"]+"\s*>\s*<option value="DRAFT_PROPOSED">Draft Pengajuan<\/option>\s*<option value="DRAFT_REVISED">Revisi Draft<\/option>\s*<option value="DRAFT_APPROVED">Draft Disetujui<\/option>\s*<option value="SENT">Terkirim ke Debitur<\/option>\s*<option value="DELIVERED">Diterima Debitur<\/option>\s*<option value="RESPONDED">Direspon Debitur<\/option>\s*<option value="SETTLED">Selesai \(Settled\)<\/option>\s*<option value="ESCALATED_POLICE">Eskalasi Laporan Polisi<\/option>\s*<option value="ESCALATED_COURT">Eskalasi Gugatan Pengadilan<\/option>\s*<\/select>/g,
  `<SearchableSelect 
                      value={viewNotice.status}
                      onChange={(val) => handleUpdateNoticeStatus(viewNotice.id, val as LawyerNotice['status'])}
                      searchable={false}
                      options={[
                        { value: 'DRAFT_PROPOSED', label: 'Draft Pengajuan' },
                        { value: 'DRAFT_REVISED', label: 'Revisi Draft' },
                        { value: 'DRAFT_APPROVED', label: 'Draft Disetujui' },
                        { value: 'SENT', label: 'Terkirim ke Debitur' },
                        { value: 'DELIVERED', label: 'Diterima Debitur' },
                        { value: 'RESPONDED', label: 'Direspon Debitur' },
                        { value: 'SETTLED', label: 'Selesai (Settled)' },
                        { value: 'ESCALATED_POLICE', label: 'Eskalasi Laporan Polisi' },
                        { value: 'ESCALATED_COURT', label: 'Eskalasi Gugatan Pengadilan' },
                      ]}
                    />`
);

fs.writeFileSync('src/components/modules/LawyerModule.tsx', content);
