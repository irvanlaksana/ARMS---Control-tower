import React, { useMemo, useState } from 'react';
import { Activity, ArrowUpRight, Briefcase, CalendarDays, DollarSign, FileText, Wallet } from 'lucide-react';
import { ARMSStore } from '../../services/armsDataService';
import { User } from '../../types/arms';
import { formatRupiahNumber } from '../../utils/exportUtils';
import { DateInput } from '../common/DateInput';

interface DailyActivityModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

const getCompanyFee = (payment: any) => {
  if (typeof payment.companyRevenueAmount === 'number') return payment.companyRevenueAmount;
  const grossFee = Number(payment.grossAgencyFee ?? payment.successFeeAmount ?? payment.amount * 0.2 ?? 0);
  const companyPercent = Number(payment.companyFeePercent ?? (payment.companyFeePercent ?? 20));
  return Math.round((grossFee * companyPercent) / 100);
};

const getPartnerFee = (payment: any) => {
  if (typeof payment.partnerCommissionAmount === 'number') return payment.partnerCommissionAmount;
  const grossFee = Number(payment.grossAgencyFee ?? payment.successFeeAmount ?? payment.amount * 0.2 ?? 0);
  const companyFee = getCompanyFee(payment);
  return Math.max(0, Math.round(grossFee - companyFee));
};

const getShortExpenseCategory = (category: string) => ({
  COMMISSION_PARTNER: 'Komisi Mitra',
  OPERATIONAL: 'Operasional',
  TOWING: 'Penarikan',
  WAREHOUSE_RENTAL: 'Gudang',
  LEGAL_FEE: 'Legal',
  TRAVEL_FIELD: 'Perjalanan',
  OTHER: 'Lainnya',
}[category] || category || 'Pengeluaran');

const getShortStatus = (status: string) => ({
  PENDING_APPROVAL: 'Menunggu',
  APPROVED: 'Disetujui',
  PAID: 'Paid',
  REJECTED: 'Ditolak',
}[status] || status || 'Menunggu');

const getPartnerName = (description: string, fallback: string) => {
  const match = description.match(/Mitra DC\]?\s*[:\-]?\s*([^|()]+)/i);
  return match?.[1]?.trim() || fallback || 'Mitra DC';
};

export const DailyActivityModule: React.FC<DailyActivityModuleProps> = ({ store }) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const dailyActivity = useMemo(() => {
    const items: Array<{
      id: string;
      category: string;
      title: string;
      subtitle: string;
      amount: number;
      timestamp: string;
      type: 'INCOME' | 'EXPENSE' | 'OPERATION' | 'LEGAL';
      tone: 'emerald' | 'amber' | 'slate' | 'rose' | 'indigo';
    }> = [];

    (store.payments || []).forEach((payment: any) => {
      const paymentDate = (payment.paymentDate || '').slice(0, 10);
      if (paymentDate !== selectedDate || ((payment.verificationStatus || payment.status) !== 'VERIFIED')) return;

      items.push({
        id: `pay-${payment.id}`,
        category: 'Penerimaan Dana',
        title: `Penerimaan dari ${payment.debtorName || 'Debitur'}`,
        subtitle: `${payment.caseNo || '-'} • ${payment.paymentMethod || 'Transfer'} • ${payment.paymentType || 'DEBTOR_REPAYMENT'}`,
        amount: getCompanyFee(payment),
        timestamp: payment.paymentDate,
        type: 'INCOME',
        tone: 'emerald',
      });

      const partnerFee = getPartnerFee(payment);
      if (partnerFee > 0) {
        items.push({
          id: `pay-partner-${payment.id}`,
          category: 'Komisi Mitra',
          title: `Pembayaran fee Mitra ${payment.personnelName || 'Mitra DC'}`,
          subtitle: `${payment.caseNo || '-'} • Share Mitra / DC`,
          amount: partnerFee,
          timestamp: payment.paymentDate,
          type: 'INCOME',
          tone: 'amber',
        });
      }
    });

    (store.expenses || []).forEach((expense: any) => {
      const expenseDate = (expense.expenseDate || '').slice(0, 10);
      if (expenseDate !== selectedDate) return;
      items.push({
        id: `expense-${expense.id}`,
        category: 'Pengeluaran',
        title: expense.category === 'COMMISSION_PARTNER'
          ? `Komisi Mitra${expense.caseNo ? ` (${expense.caseNo})` : ''}`
          : getShortExpenseCategory(expense.category),
        subtitle: expense.category === 'COMMISSION_PARTNER'
          ? `${getPartnerName(expense.description || '', expense.requestedBy)} • ${getShortStatus(expense.status)}`
          : `${expense.description || 'Biaya harian'} • ${getShortStatus(expense.status)}`,
        amount: Number(expense.amount || 0),
        timestamp: expense.expenseDate,
        type: 'EXPENSE',
        tone: 'rose',
      });
    });

    (store.assignments || []).forEach((assignment: any) => {
      const assignmentDate = (assignment.assignedDate || '').slice(0, 10);
      if (assignmentDate !== selectedDate) return;
      items.push({
        id: `assignment-${assignment.id}`,
        category: 'Penugasan',
        title: `Penugasan lapangan: ${assignment.personnelName || 'Tim'}`,
        subtitle: `${assignment.caseNo || '-'} • ${assignment.instructions || 'Instruksi penugasan'}`,
        amount: 0,
        timestamp: assignment.assignedDate,
        type: 'OPERATION',
        tone: 'indigo',
      });
    });

    (store.collections || []).forEach((collection: any) => {
      const collectionDate = (collection.collectionDate || '').slice(0, 10);
      if (collectionDate !== selectedDate) return;
      items.push({
        id: `collection-${collection.id}`,
        category: 'Koleksi',
        title: `Koleksi debitur: ${collection.debtorName || 'Debitur'}`,
        subtitle: `${collection.caseNo || '-'} • ${collection.actionType || 'Follow-up'}`,
        amount: Number(collection.amountCollected || 0),
        timestamp: collection.collectionDate,
        type: 'OPERATION',
        tone: 'slate',
      });
    });

    (store.settlements || []).forEach((settlement: any) => {
      const settlementDate = (settlement.settlementDate || '').slice(0, 10);
      if (settlementDate !== selectedDate) return;
      items.push({
        id: `settlement-${settlement.id}`,
        category: 'Settlement',
        title: `Settlement client: ${settlement.clientName || 'Client'}`,
        subtitle: `${settlement.caseNo || '-'} • remittance ${settlement.status || 'APPROVED'}`,
        amount: Number(settlement.netRemittedToClient || 0),
        timestamp: settlement.settlementDate,
        type: 'LEGAL',
        tone: 'slate',
      });
    });

    (store.assets || []).forEach((asset: any) => {
      const assetDate = (asset.recoveredDate || asset.createdAt || '').slice(0, 10);
      if (assetDate !== selectedDate) return;
      items.push({
        id: `asset-${asset.id}`,
        category: 'Eksekusi Aset',
        title: `Aset berhasil diambil: ${asset.debtorName || 'Debitur'}`,
        subtitle: `${asset.category || 'Asset'} • ${asset.physicalStatus || 'LOCATED'}`,
        amount: 0,
        timestamp: asset.recoveredDate || asset.createdAt,
        type: 'LEGAL',
        tone: 'indigo',
      });
    });

    return items.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [selectedDate, store]);

  const totalCompanyFee = dailyActivity
    .filter((item) => item.category === 'Penerimaan Dana')
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const totalPartnerFee = dailyActivity
    .filter((item) => item.category === 'Komisi Mitra')
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const totalOperationalExpense = dailyActivity
    .filter((item) => item.category === 'Pengeluaran')
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="space-y-2.5">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Daily Activity</h2>
              <p className="text-xs text-slate-400">Ringkasan operasional harian</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-400">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
            <DateInput
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 text-white rounded-lg border border-slate-700 px-2 py-1.5 text-xs outline-none"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 uppercase">Fee Perusahaan</span>
          <div className="mt-0.5 text-lg font-bold text-emerald-300 font-mono">{formatRupiahNumber(totalCompanyFee)}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 uppercase">Fee Mitra</span>
          <div className="mt-0.5 text-lg font-bold text-amber-300 font-mono">{formatRupiahNumber(totalPartnerFee)}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 uppercase">Biaya Operasional</span>
          <div className="mt-0.5 text-lg font-bold text-rose-300 font-mono">{formatRupiahNumber(totalOperationalExpense)}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 uppercase">Jumlah Kegiatan</span>
          <div className="mt-0.5 text-lg font-bold text-indigo-300 font-mono">{dailyActivity.length}</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="border-b border-slate-800 px-3 py-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Aktivitas harian</div>
          <div className="text-[10px] text-slate-400 uppercase">{new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>

        <div className="divide-y divide-slate-800">
          {dailyActivity.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              Belum ada aktivitas operasional pada tanggal yang dipilih.
            </div>
          ) : (
            dailyActivity.map((item) => {
              const Icon = item.category === 'Penerimaan Dana' ? DollarSign : item.category === 'Komisi Mitra' ? ArrowUpRight : item.category === 'Pengeluaran' ? Wallet : item.category === 'Penugasan' ? Briefcase : item.category === 'Settlement' ? FileText : Activity;
              const toneClasses = {
                emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
                amber: 'border-amber-500/20 bg-amber-500/5 text-amber-300',
                slate: 'border-slate-600/30 bg-slate-800/60 text-slate-300',
                rose: 'border-rose-500/20 bg-rose-500/5 text-rose-300',
                indigo: 'border-indigo-500/20 bg-indigo-500/5 text-indigo-300',
              }[item.tone];

              return (
                <div key={item.id} className="px-3 py-2 hover:bg-slate-800/30 transition">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className={`p-1.5 rounded-lg border ${toneClasses}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">{item.category}</div>
                        <div className="font-semibold text-white truncate">{item.title}</div>
                        <div className="text-xs text-slate-400 truncate">{item.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.amount > 0 && (
                        <div className="text-right">
                          <div className="font-mono text-xs font-bold text-white">{formatRupiahNumber(item.amount)}</div>
                        </div>
                      )}
                      <div className="hidden sm:block text-[10px] text-slate-500">{new Date(item.timestamp || selectedDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) || '—'}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
