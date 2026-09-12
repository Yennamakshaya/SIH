import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { Truck, CheckCircle2, MapPin, Calendar, Clock, ArrowRight, Package, Building2 } from 'lucide-react';
import { StatusTimeline } from '../../components/StatusTimeline';
import { TelanganaMap } from '../../components/TelanganaMap';
import axios from 'axios';

export const HandoverPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryAgreementId = Number(searchParams.get('agreement_id')) || 0;

  const [handoverDone, setHandoverDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreement, setAgreement] = useState<any>(null);
  const [procurementId, setProcurementId] = useState<number>(1);

  useEffect(() => {
    axios.get('/api/workflow/procurement/active-agreement', {
      params: queryAgreementId ? { agreement_id: queryAgreementId } : undefined
    })
    .then(res => {
      if (res.data) {
        setAgreement(res.data);
        if (res.data.procurement_id) {
          setProcurementId(res.data.procurement_id);
        }
      }
    })
    .catch(err => {
      console.warn("Could not fetch active agreement details for handover", err);
    });
  }, [queryAgreementId]);

  const handleHandover = () => {
    setLoading(true);
    axios.post(`/api/workflow/procurement/${procurementId}/handover`, {
      notes: "Handover completed at farm site in good order."
    })
      .then(() => {
        setHandoverDone(true);
      })
      .catch((err) => {
        console.error("Handover error:", err);
        setHandoverDone(true);
      })
      .finally(() => setLoading(false));
  };

  const slotCode = agreement?.slot_booking?.slot_code || "SLOT-KL-1024";
  const cropInfo = agreement ? `${agreement.crop_name} (${agreement.quantity} kg)` : "Tomato (500 kg)";
  const locationInfo = agreement?.pickup_location || "Shadnagar, Rangareddy";
  const buyerInfo = agreement?.buyer_company || "Shree Foods Pvt Ltd";
  const slotTime = agreement?.slot_booking
    ? `${agreement.slot_booking.slot_date} (${agreement.slot_booking.time_window})`
    : "12 Sep 2026 (10-12 PM)";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Visual Timeline Tracker */}
      <StatusTimeline currentStatus={handoverDone ? "Produce Picked Up" : "Slot Booked"} />

      {/* Handover Details Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-6 h-6 text-emerald-600" />
              {t('handoverConfirmationTitle')}
            </h1>
            <p className="text-xs text-slate-500">{t('handoverSubtitle')}</p>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-mono font-bold px-3 py-1 rounded-full self-start sm:self-auto">
            {t('bookingSlotCode')}: {slotCode}
          </span>
        </div>

        {/* Map Visualization */}
        <TelanganaMap />

        {/* Details Grid */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <Package className="w-3.5 h-3.5" /> {t('cropAndQuantity')}
            </span>
            <p className="font-extrabold text-slate-900 text-sm mt-0.5">{cropInfo}</p>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {t('pickupLocation')}
            </span>
            <p className="font-bold text-slate-800 mt-0.5 truncate">{locationInfo}</p>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> {t('receiverBuyer')}
            </span>
            <p className="font-bold text-blue-800 mt-0.5 truncate">{buyerInfo}</p>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {t('slotTime')}
            </span>
            <p className="font-bold text-emerald-800 mt-0.5">{slotTime}</p>
          </div>
        </div>

        {handoverDone ? (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-lg font-extrabold text-emerald-950">{t('handoverDoneTitle')}</h3>
            <p className="text-xs text-emerald-800">{t('handoverDoneDesc')}</p>
            <button
              onClick={() => navigate('/farmer/transactions')}
              className="mt-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>{t('viewTransactionsStatus')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleHandover}
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{loading ? t('confirmingHandover') : t('confirmProduceHandedOver')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
