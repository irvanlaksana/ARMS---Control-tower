import React from 'react';
import { Network, ArrowRight, DollarSign, Edit, CheckCircle } from 'lucide-react';

export const SettingsWorkflowTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
          <Network className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Alur Kerja (Workflow) Sistem Control Tower</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed mb-8">
          Panduan operasional dari awal data masuk hingga penutupan kasus dan kalkulasi pendapatan perusahaan.
        </p>

        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
          
          {/* Phase 1 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-indigo-500 text-slate-900 font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              1
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
              <h3 className="font-bold text-white text-sm mb-1">Onboarding & Penugasan Kasus</h3>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                <li>Import Data Kasus (Leads) dari Multi Finance (Klien).</li>
                <li>Penerbitan Surat Kuasa (SK) / Surat Tugas (ST).</li>
                <li>Distribusi Assignment (Penugasan) ke Field Collector (DC).</li>
              </ul>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-blue-500 text-slate-900 font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              2
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
              <h3 className="font-bold text-white text-sm mb-1">Eksekusi Lapangan & Pemantauan</h3>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                <li>Field Activity: Kunjungan, mediasi, update status janji bayar.</li>
                <li>Penarikan Unit (Recovery) jika terjadi wanprestasi parah, diamankan ke Gudang.</li>
                <li>Pengajuan Dana Talangan untuk biaya towing/operasional taktis (Opsional).</li>
              </ul>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-emerald-500 text-slate-900 font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              3
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-emerald-950/40 p-4 rounded-xl border border-emerald-800/60 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-emerald-300 text-sm">Penyelesaian & Kalkulasi Akhir</h3>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                  <h4 className="text-xs font-bold text-white mb-1">1. Kalkulasi Final Invoice</h4>
                  <p className="text-[11px] text-slate-300">
                    Sistem menjumlahkan: <strong>Total Tagihan</strong> = principal + interest + penalty + admin_fee + repossession_fee + unblocking_fee + storage_fee.
                  </p>
                </div>

                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                  <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-1"><Edit className="w-3 h-3 text-amber-400"/> 2. Input Pembayaran</h4>
                  <p className="text-[11px] text-slate-300">
                    Admin membuat record di tabel <code>Payment_Transaction</code>. Admin memilih metode pembayaran (payment_method) dan jumlah uang muka nasabah (total_paid_by_debitur).
                  </p>
                </div>

                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                  <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-1"><Edit className="w-3 h-3 text-amber-400"/> 3. Manual Splitting Fee</h4>
                  <p className="text-[11px] text-slate-300 mb-2">Admin diwajibkan mengisi 3 kolom finansial internal secara manual sesuai kontrak Multi Finance:</p>
                  <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-1">
                    <li><strong className="text-emerald-300">success_fee_amount:</strong> Nominal uang dari Pokok/Bunga yang menjadi pendapatan sah perusahaan Anda (misal: 10% dari tagihan).</li>
                    <li><strong className="text-emerald-300">execution_fee_amount:</strong> Uang hasil Biaya Tarik yang diakui sebagai pendapatan perusahaan/tim DC.</li>
                    <li><strong className="text-emerald-300">pass_through_fee:</strong> Uang titipan (seperti Biaya Buka Blokir) adalah biaya untuk membuka blokir akun pembayaran leasing yg menjadi revenue bagi perusahaan, tambahkan split ke DC dalam presentase.</li>
                  </ul>
                </div>

                <div className="bg-emerald-900/50 p-3 rounded-lg border border-emerald-700/50">
                  <h4 className="text-xs font-bold text-emerald-200 mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400"/> 4. State Akhir</h4>
                  <p className="text-[11px] text-emerald-100">
                    <code>Assignment_Task.status</code> diset menjadi <strong>CLOSED</strong>. Laporan Laba/Rugi (Profit/Loss) otomatis di-update berdasarkan kalkulasi <code>success_fee_amount + execution_fee_amount</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
