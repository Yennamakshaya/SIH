import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { Building2, ShoppingBag, Sprout, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import axios from 'axios';

export const BuyerDashboard: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [recommendedFarmers, setRecommendedFarmers] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/buyer/dashboard-summary')
      .then(res => setSummary(res.data))
      .catch(console.error);

    axios.get('/api/buyer/farmers')
      .then(res => setRecommendedFarmers(res.data.slice(0, 3)))
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs bg-blue-700/80 text-blue-200 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Buyer Dashboard — Telangana
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            Welcome, {summary?.company_name || "Shree Foods Pvt Ltd"} 🏢
          </h1>
          <p className="text-xs text-blue-200 mt-1">
            Contact: {summary?.contact_person || "Srinivas Rao"} | Status: <span className="text-emerald-400 font-bold">Verified Buyer</span> | Reliability: {summary?.reliability_score || 94}% ⭐ {summary?.rating || 4.7}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate('/buyer/add-requirement')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>+ {t('addRequirement')}</span>
          </button>
          <button
            onClick={() => navigate('/buyer/search-farmers')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <Sprout className="w-4 h-4 text-emerald-400" />
            <span>Search Telangana Farmers</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">{t('myRequirements')}</span>
          <p className="text-2xl font-black text-blue-800">{summary?.active_requirements || 1}</p>
          <span className="text-[11px] text-blue-600 font-medium">1 Active Procurement</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">Pending Offers</span>
          <p className="text-2xl font-black text-amber-600">{summary?.pending_offers || 0}</p>
          <span className="text-[11px] text-slate-500 font-medium">Farmer offers</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">Signed Agreements</span>
          <p className="text-2xl font-black text-emerald-600">{summary?.active_agreements || 0}</p>
          <span className="text-[11px] text-slate-500 font-medium">Ready for pickup</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">Completed Orders</span>
          <p className="text-2xl font-black text-slate-800">{summary?.completed_transactions || 34}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Fulfilled procurements</span>
        </div>
      </div>

      {/* Primary Requirement Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            Active Procurement Requirement (Shree Foods)
          </h3>
          <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
            Status: Active
          </span>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500">Crop Required</span>
            <p className="font-extrabold text-slate-900 text-sm">Tomato (Grade A)</p>
          </div>
          <div>
            <span className="text-slate-500">Quantity Needed</span>
            <p className="font-bold text-slate-800 text-sm">5,000 kg</p>
          </div>
          <div>
            <span className="text-slate-500">Max Budget Price</span>
            <p className="font-extrabold text-emerald-700 text-sm">₹32/kg</p>
          </div>
          <div>
            <span className="text-slate-500">Preferred Region</span>
            <p className="font-bold text-slate-800 text-sm">Rangareddy / Hyderabad</p>
          </div>
        </div>
      </div>

      {/* Recommended Farmers */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Smart Recommended Farmers Matching Your Requirement
            </h3>
            <p className="text-xs text-slate-500">Ranked by Crop Match, Quality, Quantity, Distance, and Reliability</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendedFarmers.map((f, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 flex flex-col justify-between hover:border-blue-500 transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                    Match: {f.match_score}%
                  </span>
                  <span className="text-xs text-slate-500">⭐ {f.rating} ({f.reliability_score}% Rel.)</span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm">{f.farmer_name}</h4>
                <p className="text-xs text-slate-600">{f.location}</p>
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-xs">
                  <p className="text-slate-600">Crop: <span className="font-bold text-slate-800">{f.crop_name} ({f.quality})</span></p>
                  <p className="text-slate-600">Available: <span className="font-bold text-slate-800">{f.quantity} kg</span> | Price: <span className="font-bold text-emerald-700">₹{f.expected_price}/kg</span></p>
                </div>
                <p className="text-[11px] text-slate-500 italic">"{f.explanation}"</p>
              </div>

              <button
                onClick={() => navigate('/buyer/search-farmers')}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                Send Offer to {f.farmer_name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
