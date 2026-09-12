import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  ShieldCheck, TrendingUp, Package, Truck, Star, ArrowRight,
  Eye, RefreshCw, AlertCircle, CheckCircle2, Clock, MapPin,
  Building2, User, Receipt, CreditCard, ChevronRight, X, Sparkles,
  DollarSign, ArrowDownRight, FileText
} from 'lucide-react';
import axios from 'axios';

interface PaymentInfo {
  id?: number | null;
  amount: number;
  amount_due: number;
  status: string;
  payment_method: string;
  payment_reference?: string | null;
  payment_date?: string | null;
}

interface FeedbackInfo {
  id?: number;
  rating: number;
  comments?: string | null;
  created_at?: string | null;
}

interface TransactionItem {
  id: number;
  transaction_code: string;
  agreement_id: number;
  agreement_code?: string;
  produce_id?: number | null;
  booking_id?: number | null;
  procurement_id?: number | null;
  crop_name: string;
  quantity: number;
  price_per_kg: number;
  gross_value: number;
  transport_cost: number;
  storage_cost: number;
  other_costs: number;
  net_realisation: number;
  net_price_per_kg: number;
  procurement_status: string;
  payment_status: string;
  final_status: string;
  created_at?: string | null;
  completed_at?: string | null;
  farmer_name: string;
  farmer_village?: string;
  farmer_district?: string;
  buyer_company: string;
  buyer_city?: string;
  buyer_district?: string;
  slot_date?: string;
  slot_window?: string;
  pickup_location?: string;
  payment?: PaymentInfo;
  user_feedback?: FeedbackInfo | null;
  other_feedback?: FeedbackInfo | null;
}

export const FarmerTransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [ratingModalTx, setRatingModalTx] = useState<TransactionItem | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [comments, setComments] = useState<string>('Excellent procurement experience, timely handover and transparent pricing.');
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);
  const [payingTxId, setPayingTxId] = useState<number | null>(null);

  const isFarmer = user?.role === 'farmer';
  const isBuyer = user?.role === 'buyer';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const fetchTransactions = () => {
    setLoading(true);
    axios.get('/api/workflow/transactions')
      .then(res => {
        if (Array.isArray(res.data)) {
          setTransactions(res.data);
        } else {
          setTransactions([]);
        }
      })
      .catch(err => {
        console.error("Error loading transactions:", err);
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  };

  const handleOpenRating = (tx: TransactionItem) => {
    setRatingModalTx(tx);
    if (tx.user_feedback) {
      setRating(tx.user_feedback.rating || 5);
      setComments(tx.user_feedback.comments || '');
    } else {
      setRating(5);
      setComments('Excellent trade partner! Fast communication and reliable process.');
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingModalTx) return;
    setSubmittingRating(true);
    try {
      await axios.post('/api/workflow/feedback', {
        transaction_id: ratingModalTx.id,
        rating: rating,
        comments: comments
      });
      setRatingModalTx(null);
      fetchTransactions();
    } catch (err: any) {
      alert("Feedback Notice: " + (err.response?.data?.detail || "Could not submit feedback. Please try again."));
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleProcessPayment = async (txId: number) => {
    setPayingTxId(txId);
    try {
      await axios.post(`/api/workflow/transactions/${txId}/pay`, {});
      fetchTransactions();
      if (selectedTx && selectedTx.id === txId) {
        setSelectedTx(prev => prev ? { ...prev, payment_status: 'COMPLETED', final_status: 'COMPLETED' } : null);
      }
    } catch (err: any) {
      alert("Payment Error: " + (err.response?.data?.detail || "Could not process settlement."));
    } finally {
      setPayingTxId(null);
    }
  };

  // Financial aggregates
  const totalGross = transactions.reduce((acc, t) => acc + (t.gross_value || 0), 0);
  const totalTransport = transactions.reduce((acc, t) => acc + (t.transport_cost || 0), 0);
  const totalNet = transactions.reduce((acc, t) => acc + (t.net_realisation || 0), 0);
  const completedSettlements = transactions.filter(t => t.payment_status === 'COMPLETED' || t.payment_status === 'Completed').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              {isBuyer ? t('buyerTransactionsTitle') : isAdmin ? t('adminTransactionsTitle') : t('transactionsLedgerTitle')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {isBuyer
              ? t('buyerLedgerSubtitle')
              : isAdmin
              ? t('adminLedgerSubtitle')
              : t('farmerLedgerSubtitle')}
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('refreshLedger')}</span>
        </button>
      </div>

      {/* Metric Cards Summary */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('totalGrossTrade')}</span>
            <p className="text-xl font-black text-slate-800 font-mono">₹{totalGross.toLocaleString()}</p>
            <span className="text-[10px] text-slate-500 font-medium">{transactions.length} {t('tradeContractsCount')}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('logisticsDeductions')}</span>
            <p className="text-xl font-black text-rose-600 font-mono">- ₹{totalTransport.toLocaleString()}</p>
            <span className="text-[10px] text-slate-500 font-medium">{t('directFarmPickup')}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">{t('totalNetRealisation')}</span>
            <p className="text-xl font-black text-emerald-900 font-mono">₹{totalNet.toLocaleString()}</p>
            <span className="text-[10px] text-emerald-700 font-bold">{t('directFarmerProceeds')}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('paymentSettlements')}</span>
            <p className="text-xl font-black text-blue-700 font-mono">{completedSettlements} / {transactions.length}</p>
            <span className="text-[10px] text-blue-600 font-medium">{t('completedBankTransfers')}</span>
          </div>
        </div>
      )}

      {/* TRANSACTIONS TABLE / EMPTY STATE */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs font-bold text-slate-500">Loading...</p>
          </div>
        ) : transactions.length === 0 ? (
          /* USEFUL EMPTY STATE */
          <div className="p-16 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
              <Receipt className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-800">{t('noTransactionsYet')}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {t('noTransactionsDesc')}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate(isBuyer ? '/buyer/search-farmers' : '/farmer/produce')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>{isBuyer ? t('searchFarmersBtn') : t('myProduce')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* RESPONSIVE TRANSACTION TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4">{t('txnCode')}</th>
                  <th className="p-4">{t('cropAndQuantity')}</th>
                  <th className="p-4">{isBuyer ? t('farmerRole') : isAdmin ? t('counterparties') : t('buyerProcurer')}</th>
                  <th className="p-4">{t('grossValue')}</th>
                  <th className="p-4">{t('transportCost')}</th>
                  <th className="p-4">{t('netRealisation')}</th>
                  <th className="p-4">{t('paymentStatus')}</th>
                  <th className="p-4 text-center">{t('feedbackActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {transactions.map((tItem) => {
                  const isCompletedPayment = tItem.payment_status === 'COMPLETED' || tItem.payment_status === 'Completed';

                  return (
                    <tr key={tItem.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Txn Code */}
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedTx(tItem)}
                          className="font-mono font-black text-emerald-700 hover:text-emerald-900 underline decoration-dotted flex items-center gap-1 cursor-pointer text-xs"
                        >
                          <span>{tItem.transaction_code}</span>
                        </button>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{tItem.created_at || '12 Sep 2026'}</span>
                      </td>

                      {/* Crop & Qty */}
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900">{tItem.crop_name}</div>
                        <span className="text-[11px] text-slate-500">{tItem.quantity} kg • ₹{tItem.price_per_kg}/kg</span>
                      </td>

                      {/* Counterparty */}
                      <td className="p-4">
                        {isAdmin ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800">{tItem.farmer_name}</div>
                            <div className="text-[11px] text-blue-700">→ {tItem.buyer_company}</div>
                          </div>
                        ) : isBuyer ? (
                          <div>
                            <span className="font-bold text-slate-800 block">{tItem.farmer_name}</span>
                            <span className="text-[10px] text-slate-400">{tItem.farmer_village}, {tItem.farmer_district}</span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-800 block">{tItem.buyer_company}</span>
                            <span className="text-[10px] text-slate-400">{tItem.buyer_city || 'Telangana'}</span>
                          </div>
                        )}
                      </td>

                      {/* Gross Value */}
                      <td className="p-4 font-mono font-bold text-slate-900">
                        ₹{tItem.gross_value?.toLocaleString()}
                      </td>

                      {/* Transport Cost */}
                      <td className="p-4 font-mono font-bold text-rose-600">
                        - ₹{tItem.transport_cost?.toLocaleString()}
                      </td>

                      {/* Net Realisation */}
                      <td className="p-4 font-mono font-black text-emerald-800 text-sm">
                        ₹{tItem.net_realisation?.toLocaleString()}
                      </td>

                      {/* Payment Status */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isCompletedPayment
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isCompletedPayment ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {isCompletedPayment ? t('statusCompleted') : tItem.payment_status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Buyer Payment Button */}
                          {isBuyer && !isCompletedPayment && (
                            <button
                              onClick={() => handleProcessPayment(tItem.id)}
                              disabled={payingTxId === tItem.id}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{payingTxId === tItem.id ? t('updating') : t('releasePayment')}</span>
                            </button>
                          )}

                          {/* Feedback Button */}
                          <button
                            onClick={() => handleOpenRating(tItem)}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] rounded-xl shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>{tItem.user_feedback ? `${tItem.user_feedback.rating} ${t('starFeedback')}` : t('giveFeedback')}</span>
                          </button>

                          {/* View Details */}
                          <button
                            onClick={() => setSelectedTx(tItem)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title="View Transaction Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TRANSACTION DETAILS MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center font-black">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">{t('transactionBreakdown')}</h3>
                  <span className="font-mono text-xs font-bold text-emerald-700">{selectedTx.transaction_code}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTx(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Produce & Parties Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('cropAndQuantity')}</span>
                <span className="font-extrabold text-slate-900">{selectedTx.crop_name} ({selectedTx.quantity} kg)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('farmerSeller')}</span>
                <span className="font-bold text-slate-800">{selectedTx.farmer_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('buyerProcurer')}</span>
                <span className="font-bold text-blue-800">{selectedTx.buyer_company}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('unitRate')}</span>
                <span className="font-bold text-slate-900">₹{selectedTx.price_per_kg} / kg</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('status')}</span>
                <span className="font-bold text-emerald-700">{selectedTx.procurement_status}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('agreementCode')}</span>
                <span className="font-mono font-bold text-slate-700">{selectedTx.agreement_code || 'AGR-KL'}</span>
              </div>
            </div>

            {/* Financial Ledger Calculation Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>{t('financialCalcTitle')}</span>
              </h4>

              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                <div className="p-3 bg-white flex justify-between items-center">
                  <span className="font-medium text-slate-600">{t('grossValueRow')} ({selectedTx.quantity} kg × ₹{selectedTx.price_per_kg}/kg)</span>
                  <span className="font-mono font-bold text-slate-900">₹{selectedTx.gross_value?.toLocaleString()}</span>
                </div>

                <div className="p-3 bg-rose-50/40 flex justify-between items-center text-rose-800">
                  <span className="font-medium">{t('directTransportDeduction')}</span>
                  <span className="font-mono font-bold">- ₹{selectedTx.transport_cost?.toLocaleString()}</span>
                </div>

                {selectedTx.storage_cost > 0 && (
                  <div className="p-3 bg-rose-50/40 flex justify-between items-center text-rose-800">
                    <span className="font-medium">{t('storageHubCost')}</span>
                    <span className="font-mono font-bold">- ₹{selectedTx.storage_cost?.toLocaleString()}</span>
                  </div>
                )}

                <div className="p-3.5 bg-emerald-50 flex justify-between items-center text-emerald-950 font-black">
                  <span className="text-sm">{t('finalNetRealisation')}</span>
                  <span className="font-mono text-base font-black text-emerald-800">₹{selectedTx.net_realisation?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Tracking Details */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('paymentTrackingSandbox')}</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-400 block">{t('status')}</span>
                  <span className="font-extrabold text-emerald-700">{selectedTx.payment_status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t('paymentMethod')}</span>
                  <span className="font-medium text-slate-800">{selectedTx.payment?.payment_method || t('directBankTransfer')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t('paymentRef')}</span>
                  <span className="font-mono font-bold text-slate-700">{selectedTx.payment?.payment_reference || 'REF-TS-SBX-001'}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleOpenRating(selectedTx)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Star className="w-4 h-4 fill-slate-950" />
                <span>{selectedTx.user_feedback ? t('editFeedbackBtn') : t('giveFeedbackBtn')}</span>
              </button>

              <button
                onClick={() => setSelectedTx(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK & RATING MODAL */}
      {ratingModalTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                <span>{t('rateExperience')}</span>
              </h3>
              <button
                onClick={() => setRatingModalTx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {t('ratePartnerPrompt')}
            </p>

            {/* Interactive Stars */}
            <div className="flex items-center justify-center space-x-3 text-3xl py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`transition-transform hover:scale-110 cursor-pointer ${
                    star <= rating ? "text-amber-500 fill-amber-500" : "text-slate-200"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-emerald-500"
              placeholder={t('feedbackPlaceholder')}
            />

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setRatingModalTx(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={submittingRating}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {submittingRating ? t('updating') : t('submitRating')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

