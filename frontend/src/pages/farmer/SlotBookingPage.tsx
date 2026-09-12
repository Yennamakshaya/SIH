import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle2, Truck, ArrowRight } from 'lucide-react';
import axios from 'axios';

export const SlotBookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const agreementId = Number(searchParams.get('agreement_id')) || 1;
  const navigate = useNavigate();

  const [slotDate, setSlotDate] = useState('2026-09-12');
  const [timeWindow, setTimeWindow] = useState('10:00 AM – 12:00 PM');
  const [bookedSlotCode, setBookedSlotCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const availableSlots = [
    { date: "12 Sep 2026", window: "10:00 AM – 12:00 PM" },
    { date: "12 Sep 2026", window: "2:00 PM – 4:00 PM" },
    { date: "13 Sep 2026", window: "10:00 AM – 12:00 PM" },
    { date: "13 Sep 2026", window: "3:00 PM – 5:00 PM" }
  ];

  const handleBookSlot = (d: string, w: string) => {
    setSlotDate(d);
    setTimeWindow(w);
    setLoading(true);

    axios.post('/api/workflow/procurement/book-slot', {
      agreement_id: agreementId,
      slot_date: d,
      time_window: w
    })
    .then(res => {
      setBookedSlotCode(res.data.slot_code);
    })
    .catch(err => alert("Slot Error: " + err.response?.data?.detail))
    .finally(() => setLoading(false));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" />
            Book Procurement Slot
          </h1>
          <p className="text-xs text-slate-500">Select a convenient date and time window for direct farm pickup.</p>
        </div>

        {bookedSlotCode ? (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-3 animate-in fade-in">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-emerald-950">Slot Booked Successfully!</h3>
            <p className="text-xs text-emerald-800">Generated Slot Code: <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300">{bookedSlotCode}</span></p>
            <p className="text-xs text-emerald-700 font-bold">{slotDate} | {timeWindow}</p>
            
            <button
              onClick={() => navigate('/farmer/handover')}
              className="mt-4 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow transition-colors inline-flex items-center gap-1.5"
            >
              <span>Proceed to Produce Handover</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Slot Windows</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableSlots.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => handleBookSlot(s.date, s.window)}
                  className="bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 p-4 rounded-xl cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">{s.date}</span>
                    <Clock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{s.window}</p>
                  <span className="inline-block text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Available
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
