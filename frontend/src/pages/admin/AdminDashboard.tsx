import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users, Building2, TrendingUp, HelpCircle, BarChart3, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [summary, setSummary] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    axios.get('/api/admin/dashboard-summary')
      .then(res => setSummary(res.data))
      .catch(console.error);

    axios.get('/api/admin/analytics')
      .then(res => setAnalytics(res.data))
      .catch(console.error);
  }, []);

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-950 to-slate-900 text-white rounded-2xl p-6 shadow-md flex justify-between items-center">
        <div>
          <span className="text-xs bg-purple-800 text-purple-200 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            {t('adminCommandCenterTelangana')}
          </span>
          <h1 className="text-2xl font-black mt-1">{t('platformTelemetryTitle')}</h1>
          <p className="text-xs text-purple-300">{t('adminTelemetrySubtitle')}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin/buyers')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1"
          >
            <Building2 className="w-4 h-4" />
            <span>{t('verifyPendingBuyers')}</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">{t('totalFarmers')}</span>
          <p className="text-2xl font-black text-emerald-700">{summary?.total_farmers || 10}</p>
          <span className="text-[11px] text-emerald-600 font-medium">{t('verifiedTelanganaFarmers')}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">{t('totalBuyers')}</span>
          <p className="text-2xl font-black text-blue-700">{summary?.total_buyers || 8}</p>
          <span className="text-[11px] text-blue-600 font-medium">{summary?.pending_verification || 1} {t('pendingGstVerification')}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">{t('tradeVolume')}</span>
          <p className="text-2xl font-black text-slate-900">{summary?.monthly_volume_tons || 145.5} {t('tonsUnit')}</p>
          <span className="text-[11px] text-slate-500 font-medium">{t('grossValueLakhsSubtitle')}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">{t('openGrievances')}</span>
          <p className="text-2xl font-black text-amber-600">{summary?.open_grievances || 0}</p>
          <span className="text-[11px] text-slate-500 font-medium">{t('resolvedGrievances')} 1</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Transaction Value Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            {t('monthlyProcurementValue')}
          </h3>
          <div className="h-56 w-full">
            {analytics?.monthly_transactions && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthly_transactions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: any) => `₹${v/100000}L`} />
                  <Tooltip formatter={(val: any) => [`₹${(val/100000).toFixed(2)} ${t('lakhsUnit')}`, t('volumeLabel')]} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Crop Demand Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            {t('telanganaCropDemand')}
          </h3>
          <div className="h-56 w-full">
            {analytics?.crop_demand && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.crop_demand} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="crop" type="category" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(val: any) => [`${val} ${t('tonsUnit')}`, t('demandLabel')]} />
                  <Bar dataKey="demand_tn" fill="#10b981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
