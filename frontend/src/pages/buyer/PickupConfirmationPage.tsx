import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, CheckCircle2, AlertTriangle, ShieldCheck, CreditCard } from 'lucide-react';
import { StatusTimeline } from '../../components/StatusTimeline';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';

export const PickupConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [expectedQty] = useState(500);
  const [receivedQty, setReceivedQty] = useState(495); // Example: 5kg diff
  const [quality, setQuality] = useState('Grade A');
  const [status, setStatus] = useState('Accepted with Adjustment');
  const [adjustmentReason, setAdjustmentReason] = useState('5 kg natural moisture reduction during transport.');

  const [qualityConfirmed, setQualityConfirmed] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentTxnCode, setPaymentTxnCode] = useState<string | null>(null);

  const handleConfirmQuality = (e: React.FormEvent) => {
    e.preventDefault();
    axios.post('/api/workflow/procurement/quality-confirm', {
      procurement_id: 1,
      expected_quantity: expectedQty,
      received_quantity: receivedQty,
      quality_received: quality,
      status: status,
      adjustment_reason: adjustmentReason
    })
    .then(res => {
      setQualityConfirmed(true);
    })
    .catch(err => alert("Confirmation error: " + err.response?.data?.detail));
  };

  const handleProcessPayment = () => {
    axios.post('/api/workflow/procurement/process-payment', {
      procurement_id: 1,
      payment_method: "Direct Bank Transfer (Prototype Sandbox)"
    })
    .then(res => {
      setPaymentDone(true);
      setPaymentTxnCode(res.data.transaction_code);
    })
    .catch(err => alert("Payment error: " + err.response?.data?.detail));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <StatusTimeline currentStatus={paymentDone ? "Transaction Completed" : (qualityConfirmed ? "Quality Confirmed" : "Produce Picked Up")} />

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-600" />
              {t('pickupAuditTitle')}
            </h1>
            <p className="text-xs text-slate-500">{t('pickupAuditSubtitle')}</p>
          </div>
          <span className="text-xs bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full">
            {t('farmerRole')}: Ramesh Reddy (Shadnagar)
          </span>
        </div>

        {!qualityConfirmed ? (
          <form onSubmit={handleConfirmQuality} className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-sm text-slate-800 uppercase">{t('qualityAuditForm')}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">{t('expectedQuantity')}</label>
                <input
                  type="number"
                  disabled
                  value={expectedQty}
                  className="w-full mt-1 p-2 text-xs bg-slate-200 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">{t('receivedQuantity')} *</label>
                <input
                  type="number"
                  required
                  value={receivedQty}
                  onChange={(e) => setReceivedQty(Number(e.target.value))}
                  className="w-full mt-1 p-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">{t('auditStatus')} *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full mt-1 p-2 text-xs bg-white border border-slate-300 rounded-xl font-bold"
                >
                  <option value="Accepted">{t('acceptedExact')}</option>
                  <option value="Accepted with Adjustment">{t('acceptedWithAdjustment')}</option>
                  <option value="Rejected">{t('rejectedQuality')}</option>
                </select>
              </div>
            </div>

            {status.includes('Adjustment') && (
              <div>
                <label className="text-xs font-bold text-slate-700">{t('adjustmentReason')} *</label>
                <input
                  type="text"
                  required
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder={t('enterAdjustmentReason')}
                  className="w-full mt-1 p-2 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('confirmQualityAudit')}</span>
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs space-y-1">
              <p className="font-extrabold text-emerald-950 text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                {t('qualityWeightConfirmed')}
              </p>
              <p className="text-emerald-800">{t('receivedQuantity')}: <span className="font-bold">{receivedQty} kg</span> ({t('expectedQuantity')}: {expectedQty} kg) | {t('quality')}: <span className="font-bold">{quality}</span></p>
              <p className="text-emerald-700 italic">{t('adjustmentReason')}: {adjustmentReason}</p>
            </div>

            {!paymentDone ? (
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 text-center">
                <CreditCard className="w-8 h-8 text-blue-600 mx-auto" />
                <h3 className="font-extrabold text-slate-900 text-base">{t('releaseSandboxPayment')}</h3>
                <p className="text-xs text-slate-600">{t('totalGrossTrade')}: <span className="font-black text-emerald-700 text-sm">₹15,500</span></p>
                <p className="text-[11px] text-slate-500 italic">"{t('sandboxPaymentDisclaimer')}"</p>
                
                <button
                  onClick={handleProcessPayment}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors"
                >
                  {t('processPaymentBtn')}
                </button>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl text-center space-y-2">
                <ShieldCheck className="w-10 h-10 text-blue-600 mx-auto" />
                <h3 className="font-extrabold text-blue-950 text-lg">{t('paymentCompletedTitle')}</h3>
                <p className="text-xs text-blue-800">{t('txnCode')}: <span className="font-mono font-bold">{paymentTxnCode || "TXN-KL-2026-1023"}</span></p>
                <p className="text-xs text-blue-700 font-bold">{t('status')}: {t('statusCompleted')} | {t('paymentMethod')} {t('directBankTransfer')}</p>
                
                <button
                  onClick={() => navigate('/buyer/transactions')}
                  className="mt-3 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow"
                >
                  {t('orderHistoryAndRating')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
