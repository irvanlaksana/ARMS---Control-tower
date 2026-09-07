const fs = require('fs');
const file = 'src/components/modules/SKModule.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update endDate to +3
content = content.replace(
  /endDate\.setDate\(endDate\.getDate\(\) \+ 10\);/g,
  'endDate.setDate(endDate.getDate() + 3);'
);

// Remove NIK/ID Petugas and Alamat Domisili from PENERIMA KUASA table
const patternPenerima = /<tr>\s*<td className="w-48 py-0\.5 align-top font-medium">NIK \/ ID Petugas<\/td>[\s\S]*?<\/tr>\s*<tr>\s*<td className="w-48 py-0\.5 align-top font-medium">Jabatan<\/td>/g;
content = content.replace(patternPenerima, '<tr>\n                          <td className="w-48 py-0.5 align-top font-medium">Jabatan</td>');

const patternAlamat = /<tr>\s*<td className="w-48 py-0\.5 align-top font-medium">Alamat Domisili<\/td>[\s\S]*?<\/tr>\s*<\/tbody>/g;
content = content.replace(patternAlamat, '</tbody>');

// Update 'NIK / No. KTP' to 'NIK'
content = content.replace(
  /<td className="w-48 py-0\.5 align-top font-medium">NIK \/ No\. KTP<\/td>/g,
  '<td className="w-48 py-0.5 align-top font-medium">NIK</td>'
);

// Update "Nama Petugas / Karyawan" to "Nama"
content = content.replace(
  /<td className="w-48 py-0\.5 align-top font-medium">Nama Petugas \/ Karyawan<\/td>/g,
  '<td className="w-48 py-0.5 align-top font-medium">Nama</td>'
);

// Update "Dengan ini memberikan kuasa penuh kepada Tim Operasional PT MITRAJASA SATRIA INDONESIA:"
content = content.replace(
  /Dengan ini memberikan kuasa penuh kepada Tim Operasional PT MITRAJASA SATRIA INDONESIA:/g,
  'Dengan ini memberikan tugas penuh, wewenang, dan tanggung jawab penagihan di lapangan kepada :'
);

// Update PENERIMA KUASA to PENERIMA TUGAS
content = content.replace(
  /<p className="keep-together">Yang selanjutnya disebut sebagai <b>PENERIMA KUASA<\/b>\.<\/p>/g,
  '<p className="keep-together">Yang selanjutnya disebut sebagai <b>PENERIMA TUGAS</b>.</p>'
);

// Replace everything from HAK DAN WEWENANG PENERIMA KUASA to the meterai box
// We want to replace everything starting from {/* HAK DAN WEWENANG PENERIMA KUASA */}
// until before {/* Tanda Tangan */}
const startMarker = '{/* HAK DAN WEWENANG PENERIMA KUASA */}';
const endMarker = '{/* Tanda Tangan */}';
const newText = `{/* PELAKSANAAN SURAT TUGAS */}
                    <div className="keep-together pt-2 space-y-3">
                      <p className="text-justify mb-2">
                        Pelaksanaan Surat Tugas ini wajib tunduk dan patuh pada ketentuan sebagai berikut:
                      </p>

                      <div>
                        <h4 className="font-bold uppercase tracking-wide mb-1 text-slate-950">
                          MASA BERLAKU SURAT TUGAS
                        </h4>
                        <p className="text-justify mb-1">
                          Surat Tugas ini berlaku efektif terhitung sejak tanggal <b>{todayStr}</b> sampai dengan tanggal <b>{endDateStr}</b>. Apabila masa berlaku telah berakhir, Surat Tugas ini dinyatakan tidak berlaku lagi dan wajib diperpanjang melalui persetujuan Manajemen PT Mitra Jasatria Indonesia.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold uppercase tracking-wide mb-1 text-slate-950">
                          WEWENANG DAN TANGGUNG JAWAB PETUGAS
                        </h4>
                        <p className="text-justify mb-1">Dalam menjalankan tugas penagihan di lapangan, Tim Penagihan berwenang:</p>
                        <ol className="list-decimal ml-5 space-y-1 text-justify mb-1">
                          <li>Mendatangi alamat domisili, kantor, atau lokasi tempat usaha Debitur sesuai data resmi yang tercantum dalam lembar kerja penagihan.</li>
                          <li>Melakukan konfirmasi, negosiasi, dan menyampaikan Surat Peringatan (SP) atau tagihan resmi yang diterbitkan oleh Perusahaan/Kreditur/Mitra Perusahaan.</li>
                        </ol>
                        <p className="text-justify mb-1">
                          Untuk keperluan diatas, PENERIMA TUGAS berhak untuk menerima jaminan piutang/jaminan fidusia, menandatangani dokumen - dokumen, meminta tanda tangan, serta melakukan tindakan yang dianggap perlu dalam melaksanakan tugas tersebut/meminta bantuan pihak berwajib jika diperlukan.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold uppercase tracking-wide mb-1 text-slate-950">
                          LARANGAN DAN KEPATUHAN
                        </h4>
                        <ol className="list-decimal ml-5 space-y-1 text-justify mb-1">
                          <li>Dilarang menerima pembayaran tunai (cash) secara langsung dari Debitur dalam bentuk apa pun, kecuali menggunakan Virtual Account resmi atau tanda terima sah dari sistem perusahaan.</li>
                          <li>Dilarang menggunakan ancaman, kekerasan fisik, intimidasi, penekanan secara psikologis, atau tindakan melawan hukum yang melanggar Kode Etik Penagihan Bank Indonesia (BI), Otoritas Jasa Keuangan (OJK), serta Peraturan Perundang-undangan Republik Indonesia.</li>
                          <li>Petugas wajib bersikap sopan, profesional, mengenakan pakaian rapi dan sopan selama berada di lapangan.</li>
                          <li>Petugas wajib melaporkan hasil penagihan (Field Report) secara real-time melalui sistem aplikasi penagihan resmi PT Mitra Jasatria Indonesia pada hari yang sama.</li>
                        </ol>
                      </div>

                      <div>
                        <h4 className="font-bold uppercase tracking-wide mb-1 text-slate-950">
                          SANKSI DAN TANGGUNG JAWAB HUKUM
                        </h4>
                        <ol className="list-decimal ml-5 space-y-1 text-justify mb-1">
                          <li>Setiap pelanggaran terhadap kode etik, penyalahgunaan wewenang, penggelapan dana penagihan, atau tindakan penyimpangan yang dilakukan oleh Petugas Penagihan akan dikenakan sanksi tegas berupa Pemutusan Hubungan Kerja (PHK) secara tidak hormat.</li>
                          <li>Tindakan pelanggaran hukum yang dilakukan oleh Petugas di luar prosedur resmi Perusahaan menjadi tanggung jawab pribadi petugas bersangkutan secara pidana maupun perdata (PT Mitra Jasatria Indonesia membebaskan diri dari segala tuntutan hukum akibat penyimpangan oknum).</li>
                        </ol>
                      </div>

                      <p className="text-justify pt-1">
                        Demikian Surat Tugas ini diterbitkan untuk dipergunakan sebagaimana mestinya dan dilaksanakan dengan penuh rasa tanggung jawab demi menjaga integritas, profesionalisme, dan nama baik PT Mitra Jasatria Indonesia serta Kreditur.
                      </p>
                    </div>

                    `;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex) + newText + content.slice(endIndex);
}

// Remove meterai box
const meteraiBox = /\{\/\* Meterai box \*\/\}\s*<div className="w-24 h-12 border border-dashed border-slate-400 flex items-center justify-center text-\[10px\] text-slate-500 mb-4">\s*Meterai<br\/>Rp 10\.000\s*<\/div>/g;
content = content.replace(meteraiBox, '');

// Rename Pemberi Kuasa and Penerima Kuasa at signature block
content = content.replace(
  /<p className="font-bold mb-1">Pemberi Kuasa,<\/p>/g,
  '<p className="font-bold mb-1">Pemberi Tugas,</p>'
);
content = content.replace(
  /<p className="font-bold mb-1">Penerima Kuasa,<\/p>/g,
  '<p className="font-bold mb-1">Penerima Tugas,</p>'
);

fs.writeFileSync(file, content);
console.log('Done replacing');
