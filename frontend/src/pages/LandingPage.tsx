import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Sprout, Building2, ShieldCheck, ArrowRight, CheckCircle, MapPin } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-800 to-slate-900 text-white">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center space-x-2 bg-emerald-700/60 border border-emerald-500/40 rounded-full px-4 py-1.5 text-sm font-semibold text-emerald-200 backdrop-blur-md">
          <MapPin className="w-4 h-4 text-amber-400" />
          <span>{t('heroBadge')}</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto">
          {t('heroTitlePrefix')} <span className="text-amber-400">{t('heroTitleHighlight')}</span> {t('heroTitleSuffix')}
        </h1>

        <p className="text-lg sm:text-xl text-emerald-100 max-w-2xl mx-auto font-normal">
          {t('heroSubtitle')}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-base rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>{t('login')} / {t('platformAccess')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-base rounded-xl border border-emerald-500/50 backdrop-blur-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>{t('register')} {t('newAccount')}</span>
          </button>
        </div>
      </div>

      {/* Role Selection Cards Section */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-center text-2xl font-bold text-emerald-100 mb-8">
          {t('choosePortal')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Farmer Card */}
          <div className="bg-slate-800/90 border border-emerald-500/30 rounded-2xl p-6 shadow-xl hover:border-emerald-400 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/40">
                <Sprout className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white">{t('farmerPortal')}</h3>
              <p className="text-sm text-slate-300">
                {t('farmerPortalDesc')}
              </p>
              <ul className="text-xs text-emerald-200 space-y-1.5">
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> {t('farmerCardF1')}</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> {t('farmerCardF2')}</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> {t('farmerCardF3')}</li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/login?role=farmer')}
              className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              {t('enterFarmerLogin')}
            </button>
          </div>

          {/* Buyer Card */}
          <div className="bg-slate-800/90 border border-blue-500/30 rounded-2xl p-6 shadow-xl hover:border-blue-400 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/40">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white">{t('buyerPortal')}</h3>
              <p className="text-sm text-slate-300">
                {t('buyerPortalDesc')}
              </p>
              <ul className="text-xs text-blue-200 space-y-1.5">
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-400" /> {t('buyerCardF1')}</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-400" /> {t('buyerCardF2')}</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-400" /> {t('buyerCardF3')}</li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/login?role=buyer')}
              className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              {t('enterBuyerLogin')}
            </button>
          </div>

          {/* Admin Card */}
          <div className="bg-slate-800/90 border border-purple-500/30 rounded-2xl p-6 shadow-xl hover:border-purple-400 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center border border-purple-500/40">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white">{t('adminPortal')}</h3>
              <p className="text-sm text-slate-300">
                {t('adminPortalDesc')}
              </p>
              <ul className="text-xs text-purple-200 space-y-1.5">
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-400" /> {t('adminCardF1')}</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-400" /> {t('adminCardF2')}</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-400" /> {t('adminCardF3')}</li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/admin/login')}
              className="mt-6 w-full py-2.5 bg-purple-600 hover:bg-purple-500 font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              {t('enterAdminLogin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
