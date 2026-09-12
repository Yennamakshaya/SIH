import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, CheckCircle2, MapPin, Calendar, Clock, ArrowRight } from 'lucide-react';
import { StatusTimeline } from '../../components/StatusTimeline';
import { TelanganaMap } from '../../components/TelanganaMap';
import axios from 'axios';

export const HandoverPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStatus, setCurrentStatus] = useState("Produce Picked Up");
  const [handoverDone, setHandoverDone] = useState(false);

  const handleHandover = () => {
    axios.post('/api/workflow/procurement/1/handover', { notes: "Handover completed at Shadnagar farm site in good order." })
      .then(() => {
        setCurrentStatus("Produce Picked Up");
        setHandoverDone(true);
      })
      .catch(() => setHandoverDone(true));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Visual Timeline Tracker */}
      <StatusTimeline currentStatus={handoverDone ? "Produce Picked Up" : "Slot Booked"} />

      {/* Handover Details Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-6 h-6 text-emerald-600" />
              Produce Handover Confirmation
            </h1>
            <p className="text-xs text-slate-500">Confirm physical handover of Grade A Tomato to buyer truck driver at farm site.</p>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
            Slot Code: SLOT-KL-1024
          </span>
        </div>

        {/* Map Visualization */}
        <TelanganaMap />

        {/* Details Grid */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 font-bold uppercase">Crop & Quantity</span>
            <p className="font-extrabold text-slate-900 text-sm">Tomato (500 kg)</p>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase">Pickup Location</span>
            <p className="font-bold text-slate-800">Shadnagar, Rangareddy</p>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase">Receiver / Buyer</span>
            <p className="font-bold text-blue-800">Shree Foods Pvt Ltd</p>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase">Slot Time</span>
            <p className="font-bold text-emerald-800">12 Sep 2026 (10-12 PM)</p>
          </div>
        </div>

        {handoverDone ? (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="font-extrabold text-emerald-950">Produce Handed Over Successfully!</h3>
            <p className="text-xs text-emerald-800">Buyer will confirm Quality & Quantity upon delivery to release payment.</p>
            <button
              onClick={() => navigate('/farmer/transactions')}
              className="mt-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow inline-flex items-center gap-1.5"
            >
              <span>View Transactions & Payment Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleHandover}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Confirm Produce Handed Over To Buyer</span>
          </button>
        )}
      </div>
    </div>
  );
};
