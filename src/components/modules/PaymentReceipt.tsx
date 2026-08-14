import React from 'react';
import { Payment } from '../../types/arms';
import { Printer, X, CheckCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-8 print:m-0 print:w-full print:max-w-none print:shadow-none">
        {/* Actions header (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-sm text-slate-800">Kuitansi Pembayaran / Tanda Terima</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Print PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-8 space-y-6 font-sans">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-xl font-extrabold uppercase tracking-wider text-slate-900">
                MJ AGENCY RECOVERY
              </h1>
              <p className="text-xs text-slate-600">Asset Recovery & Debt Collection Management</p>
              <p className="text-[11px] text-slate-500">Gedung Sudirman Lantai 12, Jakarta Selatan</p>
            </div>
            <div className="text-right">
              <div className="inline-block bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded text-xs border border-emerald-300 uppercase tracking-wide">
                KUITANSI RESMI
              </div>
              <div className="text-xs font-mono font-bold text-slate-800 mt-2">
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
                <td className="py-2.5 font-semibold text-slate-600 w-44">Telah Terima Dari</td>
                <td className="py-2.5 font-bold text-slate-900">: {payment.debtorName}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2.5 font-semibold text-slate-600">Nomor Perkara / Case</td>
                <td className="py-2.5 font-mono font-medium">: {payment.caseNo}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2.5 font-semibold text-slate-600">Jumlah Pembayaran</td>
                <td className="py-2.5 font-extrabold text-emerald-700 text-sm">: {formatRupiah(payment.amount)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2.5 font-semibold text-slate-600">Metode Pembayaran</td>
                <td className="py-2.5">: {payment.paymentMethod || 'TRANSFER'}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2.5 font-semibold text-slate-600">Keterangan / Alokasi</td>
                <td className="py-2.5">: {payment.allocationSummary || payment.paymentType}</td>
              </tr>
              {payment.verifiedBy && (
                <tr className="border-b border-slate-200">
                  <td className="py-2.5 font-semibold text-slate-600">Diverifikasi Oleh</td>
                  <td className="py-2.5">: {payment.verifiedBy} ({payment.verificationStatus})</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Amount Box */}
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-4 flex justify-between items-center">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TOTAL NOMINAL</div>
              <div className="text-xl font-mono font-black text-slate-900">{formatRupiah(payment.amount)}</div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold bg-emerald-600 text-white px-2.5 py-1 rounded">
                LUNAS / DITERIMA
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 flex justify-between text-center text-xs">
            <div className="space-y-16">
              <p className="font-semibold text-slate-600">Penyetor / Debitur</p>
              <div>
                <p className="font-bold underline text-slate-900">{payment.debtorName}</p>
              </div>
            </div>

            <div className="space-y-16">
              <p className="font-semibold text-slate-600">Penerima (Kasir / Petugas)</p>
              <div>
                <p className="font-bold underline text-slate-900">{payment.verifiedBy || 'MJ Agency Finance'}</p>
                <p className="text-[10px] text-slate-500">Finance & Recovery Dept</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 text-center font-mono">
            Dokumen ini merupakan bukti pembayaran yang sah dan dicatat dalam sistem ARMS Control Tower.
          </div>
        </div>
      </div>
    </div>
  );
};
