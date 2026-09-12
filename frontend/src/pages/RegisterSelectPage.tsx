import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Sprout, Building2, ArrowRight } from 'lucide-react';

export const RegisterSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        
        {/* Header */}
        <div className="bg-emerald-800 text-white p-6 text-center space-y-2">
          <div className="inline-flex bg-emerald-600/60 p-3 rounded-2xl border border-emerald-500/50">
            <Sprout className="w-8 h-8 text-amber-300" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">{t('createAccount')}</h2>
          <p className="text-xs text-emerald-200 font-medium">{t('telanganaFocus')}</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-base font-bold text-slate-800">{t('selectRole')}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t('chooseRoleSubtitle')}</p>
          </div>

          <div className="space-y-4">
            {/* Farmer Registration Card */}
            <div
              onClick={() => navigate('/register/farmer')}
              className="p-5 bg-emerald-50/70 hover:bg-emerald-100/80 border-2 border-emerald-200 hover:border-emerald-500 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md">
                  <Sprout className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-emerald-950 group-hover:text-emerald-800">
                    {t('registerAsFarmer')}
                  </h4>
                  <p className="text-xs text-emerald-800/80 mt-0.5">
                    {t('farmerRegisterDesc')}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-700 transform group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Buyer Registration Card */}
            <div
              onClick={() => navigate('/register/buyer')}
              className="p-5 bg-blue-50/70 hover:bg-blue-100/80 border-2 border-blue-200 hover:border-blue-500 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-blue-950 group-hover:text-blue-800">
                    {t('registerAsBuyer')}
                  </h4>
                  <p className="text-xs text-blue-800/80 mt-0.5">
                    {t('buyerRegisterDesc')}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-700 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            {t('alreadyHaveAccount')}{' '}
            <a href="/login" className="text-emerald-700 font-bold hover:underline">
              {t('login')}
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
