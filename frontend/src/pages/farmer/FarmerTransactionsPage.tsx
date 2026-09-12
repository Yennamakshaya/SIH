import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldCheck, ArrowDownRight, Star, AlertCircle, FileText } from 'lucide-react';
import axios from 'axios';

export const FarmerTransactionsPage: React.FC = () => {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ratingModalTx, setRatingModalTx] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('Excellent buyer! Timely pickup and transparent payment.');

  useEffect(() => {
    axios.get('/api/workflow/transactions')
      .then(res => setTransactions(res.data))
      .catch(console.error);
  }, []);

  const handleSubmitRating = () => {
    if (!ratingModalTx) return;
    axios.post('/api/workflow/feedback', {
      transaction_id: ratingModalTx.id,
      rating: rating,
      comments: comments
    })
    .then(() => {
      alert("Feedback & Rating Submitted Successfully! Thank you.");
      setRatingModalTx(null);
    })
    .catch(err => alert("Feedback error: " + err.response?.data?.detail));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          Transactions, Net Realisation & Payment Tracking
        </h1>
        <p className="text-xs text-slate-500">View gross sales, transport deductions, net earnings, and payment ledger.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-5 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="p-3">Txn Code</th>
                <th className="p-3">Crop & Qty</th>
                <th className="p-3">Buyer Company</th>
                <th className="p-3">Gross Value</th>
                <th className="p-3">Transport Cost</th>
                <th className="p-3">Net Realisation</th>
                <th className="p-3">Payment Status</th>
                <th className="p-3">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-emerald-800">{t.transaction_code}</td>
                  <td className="p-3 font-bold text-slate-900">{t.crop_name} ({t.quantity} kg)</td>
                  <td className="p-3">{t.buyer_company}</td>
                  <td className="p-3">₹{t.gross_value?.toLocaleString()}</td>
                  <td className="p-3 text-red-600 font-bold">- ₹{t.transport_cost?.toLocaleString()}</td>
                  <td className="p-3 font-black text-emerald-700 text-sm">₹{t.net_realisation?.toLocaleString()}</td>
                  <td className="p-3">
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                      {t.payment_status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => setRatingModalTx(t)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] rounded-lg shadow-sm flex items-center gap-1"
                    >
                      <Star className="w-3 h-3 fill-slate-950" /> Rate Buyer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedback Modal */}
      {ratingModalTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-800">Rate Buyer: {ratingModalTx.buyer_company}</h3>
            <p className="text-xs text-slate-500">Share your feedback regarding communication, payment reliability, and pickup timeliness.</p>
            
            <div className="flex items-center justify-center space-x-2 text-2xl py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={star <= rating ? "text-amber-500" : "text-slate-300"}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              placeholder="Write comments..."
            />

            <div className="flex gap-2 justify-end">
              <button onClick={() => setRatingModalTx(null)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">
                Cancel
              </button>
              <button onClick={handleSubmitRating} className="px-5 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow">
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
