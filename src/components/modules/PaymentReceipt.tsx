import React from 'react';
import { Payment } from '../../types/arms';
import { Printer, X, CheckCircle } from 'lucide-react';
import { OfficialLetterhead } from '../common/OfficialLetterhead';

interface PaymentReceiptProps {
  payment: Payment;
  onClose: () => void;
}

export const PaymentReceipt: React.FC<PaymentReceiptProps> = ({ payment, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const formatRupiah = (val: number) => {
    return `Rp ${(val || 0).toLocaleString('id-ID')}`;
  };

  return (
    <div className="payment-receipt-modal fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-3 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="payment-receipt-paper bg-white text-slate-900 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-auto max-h-[85vh] overflow-y-auto print:m-0 print:w-full print:max-w-none print:shadow-none print:max-h-none print:overflow-visible print:rounded-none">
        {/* Actions header (Hidden during print) */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-sm text-slate-800">Kuitansi Pembayaran Resmi</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak F4 (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 space-y-3 font-serif" style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}>
          {/* Kop Surat Resmi */}
          <OfficialLetterhead className="mb-3" />

          <div className="flex justify-between items-center border-b border-slate-300 pb-1.5">
            <div>
              <span className="inline-block bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-xs uppercase tracking-wide">
                KUITANSI RESMI PEMBAYARAN
              </span>
            </div>
            <div className="text-right text-xs">
              <div className="font-mono font-bold text-slate-800">
                No: {payment.paymentNo}
              </div>
              <div className="text-[11px] text-slate-500">
                Tanggal: {payment.paymentDate}
              </div>
            </div>
          </div>

          {/* Details Table */}
          <table className="w-full text-xs text-slate-800 border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-2 font-semibold text-slate-600 w-44">Telah Terima Dari</td>
                <td className="py-2 font-bold text-slate-900">: {payment.debtorName}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 font-semibold text-slate-600">Nomor Perkara / Case No</td>
                <td className="py-2 font-mono font-medium">: {payment.caseNo}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 font-semibold text-slate-600">Jumlah Pembayaran</td>
                <td className="py-2 font-extrabold text-emerald-700 text-sm">: {formatRupiah(payment.amount)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 font-semibold text-slate-600">Metode Pembayaran</td>
                <td className="py-2">: {payment.paymentMethod || 'TRANSFER'}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 font-semibold text-slate-600">Keterangan / Alokasi</td>
                <td className="py-2">: {payment.allocationSummary || payment.paymentType}</td>
              </tr>
              {payment.verifiedBy && (
                <tr className="border-b border-slate-200">
                  <td className="py-2 font-semibold text-slate-600">Diverifikasi Oleh</td>
                  <td className="py-2">: {payment.verifiedBy} ({payment.verificationStatus})</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Amount Box */}
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-3 flex justify-between items-center">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TOTAL NOMINAL DITERIMA</div>
              <div className="text-lg font-mono font-black text-slate-900">{formatRupiah(payment.amount)}</div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold bg-emerald-600 text-white px-2 py-1 rounded">
                LUNAS / DITERIMA
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-6 flex justify-between text-center text-xs">
            <div className="space-y-12">
              <p className="font-semibold text-slate-600">Penyetor / Debitur</p>
              <div>
                <p className="font-bold underline text-slate-900">{payment.debtorName}</p>
              </div>
            </div>

            <div className="space-y-12">
              <p className="font-semibold text-slate-600">Penerima Kasir / Tim Keuangan</p>
              <div>
                <p className="font-bold underline text-slate-900">{payment.verifiedBy || 'PT. MITRAJASA SATRIA INDONESIA'}</p>
                <p className="text-[10px] text-slate-500">Divisi Keuangan & Recovery</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-400 text-center font-mono">
            PT. MITRAJASA SATRIA INDONESIA • Bukti Pembayaran Resmi ARMS • Ukuran F4 (215mm x 330mm)
          </div>
        </div>
      </div>
    </div>
  );
};
