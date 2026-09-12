import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { FileCheck, ShieldCheck, CheckSquare, Calendar, ArrowRight, Info } from 'lucide-react';
import axios from 'axios';

export const AgreementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const agreementId = id ? Number(id) : 1;
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [agreement, setAgreement] = useState<any>(null);
  const [acceptedTc, setAcceptedTc] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/workflow/agreements/${agreementId}`)
      .then(res => setAgreement(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [agreementId]);

  const handleSignAgreement = () => {
    if (!acceptedTc) {
      alert("Please check the mandatory Terms & Conditions box before signing.");
      return;
    }

    axios.post(`/api/workflow/agreements/${agreementId}/sign`, {
      accepted_tc: true
    })
    .then(res => {
      alert("Agreement Signed Successfully! Proceeding to Procurement Slot Booking.");
      navigate(`/farmer/slot-booking?agreement_id=${agreementId}`);
    })
    .catch(err => alert("Signing Error: " + err.response?.data?.detail));
  };

  if (loading || !agreement) {
    return <div className="p-8 text-center text-slate-500">Loading Digital Agreement...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
            Agreement Code: {agreement.agreement_code}
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-emerald-600" />
            Digital Procurement Contract
          </h1>
          <p className="text-xs text-slate-500">KisanLink Digital Trade Agreement between Farmer & Buyer</p>
        </div>

        <div className="text-right">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            agreement.status === 'Signed' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950 font-black'
          }`}>
            Status: {agreement.status}
          </span>
        </div>
      </div>

      {/* Contract Terms Box */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
        {/* Parties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Farmer (Seller)</span>
            <h4 className="font-extrabold text-base text-slate-900">{agreement.farmer_name}</h4>
            <p className="text-xs text-slate-600">Location: Shadnagar, Rangareddy, Telangana</p>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Buyer (Procurer)</span>
            <h4 className="font-extrabold text-base text-slate-900">{agreement.buyer_company}</h4>
            <p className="text-xs text-slate-600">Verified GST | Telangana Bulk Buyer</p>
          </div>
        </div>

        {/* Commercial & Financial Breakdown Table */}
        <div className="space-y-2">
          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Commercial Terms & Net Realisation Breakdown</h3>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Crop & Variety</span>
              <p className="font-bold text-slate-900 text-sm">{agreement.crop_name} ({agreement.quality})</p>
            </div>
            <div>
              <span className="text-slate-500">Quantity</span>
              <p className="font-bold text-slate-900 text-sm">{agreement.quantity} kg</p>
            </div>
            <div>
              <span className="text-slate-500">Agreed Price</span>
              <p className="font-bold text-emerald-700 text-sm">₹{agreement.final_price}/kg</p>
            </div>
            <div>
              <span className="text-slate-500">Gross Value</span>
              <p className="font-bold text-slate-900 text-sm">₹{agreement.total_value?.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-slate-500">Estimated Transport Cost</span>
              <p className="font-bold text-red-600 text-sm">- ₹{agreement.transport_cost?.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-slate-500">Cold Storage Cost</span>
              <p className="font-bold text-slate-700 text-sm">₹0 (Direct Farm Pickup)</p>
            </div>
            <div className="col-span-2 bg-emerald-100 p-2.5 rounded-lg border border-emerald-300">
              <span className="text-emerald-900 font-bold uppercase text-[10px]">Net Realisation to Farmer</span>
              <p className="font-extrabold text-emerald-900 text-base">₹{agreement.net_realisation?.toLocaleString()} (Net ₹{roundTwo(agreement.net_realisation / agreement.quantity)}/kg)</p>
            </div>
          </div>
        </div>

        {/* Full Agreement Text */}
        <div className="space-y-2">
          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Agreement Terms & Conditions</h3>
          <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto border border-slate-800">
            {agreement.terms_and_conditions}
          </pre>
        </div>

        {/* Mandatory Signature Checkbox & Action */}
        <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200 space-y-3">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTc}
              onChange={(e) => setAcceptedTc(e.target.checked)}
              className="mt-1 w-4 h-4 text-emerald-600 rounded border-amber-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-bold text-amber-950">
              "I have read and agree to all terms and conditions specified in Digital Agreement {agreement.agreement_code}."
            </span>
          </label>

          <p className="text-[11px] text-amber-800 italic flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>This is a prototype digital signing process and must not be represented as legally binding e-signature unless an actual provider is integrated.</span>
          </p>

          <button
            onClick={handleSignAgreement}
            disabled={!acceptedTc || agreement.status === 'Signed'}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>{agreement.status === 'Signed' ? 'Agreement Signed ✓' : 'Sign Agreement & Book Slot'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

function roundTwo(num: number) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
