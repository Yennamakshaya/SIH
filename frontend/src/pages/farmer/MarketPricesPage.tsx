import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { TrendingUp, Calendar, Info, RefreshCw, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import axios from 'axios';

export const MarketPricesPage: React.FC = () => {
  const { t } = useLanguage();
  const [prices, setPrices] = useState<any[]>([]);
  const [cropFilter, setCropFilter] = useState('Tomato');
  const [timeframe, setTimeframe] = useState('30 Days');
  const [historyData, setHistoryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/market/prices')
      .then(res => setPrices(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    axios.get(`/api/market/history?crop=${cropFilter}&timeframe=${encodeURIComponent(timeframe)}`)
      .then(res => setHistoryData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cropFilter, timeframe]);

  const filteredPrices = prices.filter(p => p.crop_name.toLowerCase().includes(cropFilter.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            {t('marketPrice')} & Price History
          </h1>
          <p className="text-xs text-slate-500">Real-time daily market price rates from APMC Mandis across Telangana.</p>
        </div>
        <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs text-amber-900 font-bold">
          <Info className="w-4 h-4 text-amber-600" />
          <span>{t('apmcMarketDisclaimer')}</span>
        </div>
      </div>

      {/* Interactive Price History Chart Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-emerald-600" />
              {cropFilter} Market Price Trend — {historyData?.market || "Bowenpally Market"}
            </h3>
            <p className="text-xs text-slate-500">Current Modal Price: <span className="font-bold text-emerald-700">₹{historyData?.current_price}/kg</span> | 30-Day Avg: ₹{historyData?.average_price}/kg</p>
          </div>

          {/* Timeframe & Crop selector */}
          <div className="flex items-center space-x-2">
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              className="text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800"
            >
              <option value="Tomato">Tomato</option>
              <option value="Paddy">Paddy</option>
              <option value="Cotton">Cotton</option>
              <option value="Maize">Maize</option>
              <option value="Chilli">Chilli</option>
              <option value="Turmeric">Turmeric</option>
            </select>

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              {['7 Days', '30 Days', '3 Months', '6 Months'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    timeframe === tf ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recharts Component */}
        <div className="h-64 w-full">
          {historyData?.history ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any) => [`₹${value}/kg`, 'Price']}
                />
                <Area type="monotone" dataKey="price" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#priceGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">Loading chart data...</div>
          )}
        </div>

        {/* Price History Disclaimer */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <p className="italic">"Price trends are informational and do not guarantee future prices."</p>
          <span className="text-[11px] text-slate-400 font-medium">Last Updated: Today</span>
        </div>
      </div>

      {/* APMC Daily Market Prices Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-3 p-5">
        <h3 className="font-bold text-base text-slate-800">
          APMC Telangana Mandi Rates Summary
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="p-3">Crop</th>
                <th className="p-3">APMC Market</th>
                <th className="p-3">District</th>
                <th className="p-3">Min Price</th>
                <th className="p-3">Modal Price</th>
                <th className="p-3">Max Price</th>
                <th className="p-3">Change</th>
                <th className="p-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredPrices.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-bold text-slate-900">{row.crop_name}</td>
                  <td className="p-3">{row.market_name}</td>
                  <td className="p-3">{row.district}</td>
                  <td className="p-3 text-slate-600">₹{row.min_price}/kg</td>
                  <td className="p-3 font-black text-emerald-700">₹{row.modal_price}/kg</td>
                  <td className="p-3 text-slate-600">₹{row.max_price}/kg</td>
                  <td className="p-3">
                    <span className={`font-bold ${row.price_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {row.price_change >= 0 ? `+₹${row.price_change}` : `-₹${Math.abs(row.price_change)}`}
                    </span>
                  </td>
                  <td className="p-3 text-[11px] text-slate-500">{row.data_source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
