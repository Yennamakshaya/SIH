import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Search, Filter, Sparkles, Building2, CheckCircle2, ShieldCheck, ArrowRight, ArrowUpDown } from 'lucide-react';
import axios from 'axios';

export const BuyersListPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const produceId = searchParams.get('produce_id');

  const [buyers, setBuyers] = useState<any[]>([]);
  const [cropFilter, setCropFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  const [loading, setLoading] = useState(true);

  // Modal Profile View State
  const [selectedBuyerProfile, setSelectedBuyerProfile] = useState<any>(null);

  useEffect(() => {
    let url = `/api/farmer/buyers?sort_by=${sortBy}`;
    if (produceId) url += `&produce_id=${produceId}`;
    if (cropFilter) url += `&crop=${cropFilter}`;
    if (districtFilter) url += `&district=${districtFilter}`;

    axios.get(url)
      .then(res => setBuyers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sortBy, produceId, cropFilter, districtFilter]);

  const handleStartNegotiation = (buyer: any) => {
    // Send initial offer & open negotiation screen
    axios.post('/api/workflow/offers', {
      produce_id: produceId ? Number(produceId) : 1,
      farmer_id: user?.user_id || 1,
      buyer_id: buyer.buyer_id,
      crop_name: buyer.crops_required || "Tomato",
      quantity: buyer.required_quantity || 500,
      price_per_kg: buyer.offered_price || 31,
      pickup_date: "2026-09-12",
      delivery_location: buyer.location,
      message: `Initial offer for ${buyer.crops_required || 'Tomato'} at ₹${buyer.offered_price}/kg`
    })
    .then(res => {
      navigate('/farmer/negotiations');
    })
    .catch(err => {
      alert("Error initiating negotiation: " + (err.response?.data?.detail || "Please try again."));
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" />
            Verified Bulk Buyers in Telangana
          </h1>
          <p className="text-xs text-slate-500">Discover verified food processors, exporters, and wholesale buyers near you.</p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs text-emerald-800 font-bold">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>AI Net Realisation Ranking Enabled</span>
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase">Crop Filter</label>
          <input
            type="text"
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            placeholder="e.g. Tomato, Paddy..."
            className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase">District Filter</label>
          <input
            type="text"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            placeholder="e.g. Hyderabad, Rangareddy..."
            className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase">Sort Buyers By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
          >
            <option value="recommended">Best Net Realisation (AI Recommended)</option>
            <option value="highest_price">Highest Offered Price</option>
            <option value="highest_rating">Highest Rating</option>
            <option value="reliability">Highest Reliability Score</option>
          </select>
        </div>
      </div>

      {/* Buyers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {buyers.map((buyer) => (
          <div
            key={buyer.buyer_id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-500 transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-base text-slate-900">{buyer.company_name}</h3>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{buyer.contact_person} | {buyer.buyer_category}</p>
                  <p className="text-xs text-slate-600 mt-0.5">Location: <span className="font-semibold text-slate-800">{buyer.location}</span></p>
                </div>

                <div className="text-right">
                  <span className="text-xs bg-amber-100 text-amber-900 font-extrabold px-2.5 py-1 rounded-full border border-amber-300">
                    Score: {buyer.ai_score}/100
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">⭐ {buyer.rating} ({buyer.reliability_score}% Rel.)</p>
                </div>
              </div>

              {/* Requirement & Pricing details */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Crop Requirement</span>
                  <p className="font-bold text-slate-800">{buyer.crops_required}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Offered Price</span>
                  <p className="font-extrabold text-emerald-700">₹{buyer.offered_price}/kg</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Required Qty</span>
                  <p className="font-bold text-slate-800">{buyer.required_quantity} kg</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Est. Net Realisation</span>
                  <p className="font-extrabold text-slate-900">₹{buyer.estimated_net_realisation?.toLocaleString()}</p>
                </div>
              </div>

              {/* AI Natural Language Explanation */}
              <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
                <span className="font-bold text-[10px] uppercase text-amber-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Prototype AI Recommendation Logic:
                </span>
                <p className="text-[11px] font-medium leading-relaxed">{buyer.ai_explanation?.en}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedBuyerProfile(buyer)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                View Profile
              </button>
              <button
                onClick={() => handleStartNegotiation(buyer)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1"
              >
                <span>Select & Negotiate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Buyer Profile Modal */}
      {selectedBuyerProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">{selectedBuyerProfile.company_name}</h3>
                <p className="text-xs text-slate-500">{selectedBuyerProfile.buyer_category} | {selectedBuyerProfile.location}</p>
              </div>
              <button onClick={() => setSelectedBuyerProfile(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p><span className="font-bold text-slate-700">Company ID:</span> {selectedBuyerProfile.company_id}</p>
              <p><span className="font-bold text-slate-700">Contact Person:</span> {selectedBuyerProfile.contact_person}</p>
              <p><span className="font-bold text-slate-700">Verification Status:</span> <span className="text-emerald-700 font-bold">Verified Buyer (GST Checked)</span></p>
              <p><span className="font-bold text-slate-700">Completed Transactions:</span> {selectedBuyerProfile.completed_transactions} orders</p>
              <p><span className="font-bold text-slate-700">Average Response Time:</span> {selectedBuyerProfile.response_time}</p>
              <p><span className="font-bold text-slate-700">Reliability Score:</span> {selectedBuyerProfile.reliability_score}%</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedBuyerProfile(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const b = selectedBuyerProfile;
                  setSelectedBuyerProfile(null);
                  handleStartNegotiation(b);
                }}
                className="px-5 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow"
              >
                Start Negotiation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
