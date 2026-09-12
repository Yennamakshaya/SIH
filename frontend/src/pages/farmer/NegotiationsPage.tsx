import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeftRight, CheckCircle2, XCircle, Send, MessageSquare } from 'lucide-react';
import axios from 'axios';

export const NegotiationsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);

  // Counter offer state
  const [counterPrice, setCounterPrice] = useState<number>(31);
  const [counterQty, setCounterQty] = useState<number>(500);
  const [counterMsg, setCounterMsg] = useState('');

  const fetchOffers = () => {
    axios.get('/api/workflow/offers')
      .then(res => {
        setOffers(res.data);
        if (res.data.length > 0 && !selectedOffer) {
          setSelectedOffer(res.data[0]);
          setCounterPrice(res.data[0].price_per_kg || 31);
          setCounterQty(res.data[0].quantity || 500);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleSendCounter = () => {
    if (!selectedOffer) return;
    axios.post(`/api/workflow/offers/${selectedOffer.id}/counter`, {
      offer_id: selectedOffer.id,
      price_per_kg: counterPrice,
      quantity: counterQty,
      message: counterMsg || `Counter offer: ₹${counterPrice}/kg for ${counterQty} kg`
    })
    .then(() => {
      setCounterMsg('');
      fetchOffers();
    })
    .catch(err => alert("Error: " + err.response?.data?.detail));
  };

  const handleAcceptOffer = () => {
    if (!selectedOffer) return;
    axios.post(`/api/workflow/offers/${selectedOffer.id}/accept`)
      .then(res => {
        alert("Offer Accepted! Digital Agreement generated.");
        navigate(`/farmer/agreement/${res.data.agreement_id}`);
      })
      .catch(err => alert("Error: " + err.response?.data?.detail));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-emerald-600" />
          Active Price Negotiations & Counter Offers
        </h1>
        <p className="text-xs text-slate-500">Bargain directly with bulk buyers in Telangana. All negotiation actions are logged.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Offers List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Active Negotiations</h3>
          {offers.map(o => (
            <div
              key={o.id}
              onClick={() => {
                setSelectedOffer(o);
                setCounterPrice(o.price_per_kg);
                setCounterQty(o.quantity);
              }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedOffer?.id === o.id
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-800">{o.crop_name} ({o.quantity} kg)</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  o.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                }`}>
                  {o.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">Buyer: <span className="font-bold text-slate-800">{o.buyer_company}</span></p>
              <p className="text-xs text-slate-600">Offered Rate: <span className="font-extrabold text-emerald-700">₹{o.price_per_kg}/kg</span> (₹{o.total_value?.toLocaleString()})</p>
            </div>
          ))}
        </div>

        {/* Right Side: Negotiation Thread & Actions */}
        {selectedOffer ? (
          <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header */}
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{selectedOffer.crop_name} Negotiation</h3>
                  <p className="text-xs text-slate-500">Buyer: {selectedOffer.buyer_company} | Location: {selectedOffer.delivery_location}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-bold uppercase">Dynamic Total Value</span>
                  <p className="text-lg font-black text-emerald-700">₹{(counterPrice * counterQty).toLocaleString()}</p>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3 max-h-64 overflow-y-auto border border-slate-200">
                {selectedOffer.negotiations?.map((n: any) => (
                  <div
                    key={n.id}
                    className={`flex flex-col ${n.sender_role === 'farmer' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-xs space-y-1 ${
                        n.sender_role === 'farmer'
                          ? 'bg-emerald-700 text-white rounded-br-none'
                          : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-none'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 text-[10px] opacity-80">
                        <span className="font-bold">{n.sender_name} ({n.sender_role})</span>
                        <span>{n.created_at}</span>
                      </div>
                      <p className="font-extrabold text-sm">Proposed: ₹{n.price_per_kg}/kg ({n.quantity} kg)</p>
                      <p>{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Form */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Submit Counter Offer</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">Counter Price (₹/kg)</label>
                    <input
                      type="number"
                      value={counterPrice}
                      onChange={(e) => setCounterPrice(Number(e.target.value))}
                      className="w-full mt-1 p-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">Quantity (kg)</label>
                    <input
                      type="number"
                      value={counterQty}
                      onChange={(e) => setCounterQty(Number(e.target.value))}
                      className="w-full mt-1 p-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={counterMsg}
                    onChange={(e) => setCounterMsg(e.target.value)}
                    placeholder="Add message (e.g. My tomatoes are Grade A fresh, final price ₹31/kg)"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSendCounter}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Counter Offer</span>
                  </button>

                  <button
                    onClick={handleAcceptOffer}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept Offer & Generate Agreement</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="md:col-span-2 bg-white rounded-2xl p-12 text-center text-slate-400 text-sm border border-slate-200">
            Select a negotiation from the left list to view thread & submit counter offers.
          </div>
        )}
      </div>
    </div>
  );
};
