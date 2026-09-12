import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../i18n/translations';
import { Bot, Bell, LogOut, Globe, Sprout } from 'lucide-react';
import axios from 'axios';

interface NavbarProps {
  onOpenAssistant: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAssistant }) => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (user?.token) {
      axios.get('/api/workflow/notifications')
        .then(res => setUnreadCount(res.data.unread_count || 0))
        .catch(() => setUnreadCount(0));
    }
  }, [user]);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBrandClick = () => {
    if (!user) {
      navigate('/');
    } else if (user.role === 'farmer') {
      navigate('/farmer/dashboard');
    } else if (user.role === 'buyer') {
      navigate('/buyer/dashboard');
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            onClick={handleBrandClick}
            className="flex items-center space-x-3 cursor-pointer select-none"
          >
            <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-inner flex items-center justify-center">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                KisanLink <span className="text-xs bg-emerald-700 text-emerald-200 px-2 py-0.5 rounded-full font-medium border border-emerald-600">Telangana</span>
              </span>
              <p className="text-[11px] text-emerald-200 hidden sm:block">
                {t('tagline')}
              </p>
            </div>
          </div>

          {/* Controls: Language Switcher, Assistant, Notifications, User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Language Switcher */}
            <div className="flex items-center bg-emerald-950/60 p-1 rounded-lg border border-emerald-700/50">
              <Globe className="w-4 h-4 text-emerald-300 ml-1.5 mr-1 hidden xs:block" />
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                  language === 'en' ? 'bg-emerald-500 text-white shadow' : 'text-emerald-200 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('te')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                  language === 'te' ? 'bg-emerald-500 text-white shadow' : 'text-emerald-200 hover:text-white'
                }`}
              >
                తెలుగు
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                  language === 'hi' ? 'bg-emerald-500 text-white shadow' : 'text-emerald-200 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
            </div>

            {/* Kisan Assistant Button */}
            <button
              onClick={onOpenAssistant}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all transform active:scale-95"
            >
              <Bot className="w-4 h-4 animate-pulse" />
              <span className="hidden md:inline">{t('kisanAssistant')}</span>
            </button>

            {/* Notifications Bell */}
            {user && (
              <div className="relative">
                <button className="p-2 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-700/50 transition-colors">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* User Profile / Logout */}
            {user ? (
              <div className="flex items-center space-x-2 border-l border-emerald-700/60 pl-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-white leading-tight">{user.name}</p>
                  <span className="text-[10px] bg-emerald-900 text-emerald-300 uppercase tracking-wider px-1.5 py-0.2 rounded font-semibold border border-emerald-700">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title={t('logout')}
                  className="p-2 text-emerald-200 hover:text-red-300 hover:bg-emerald-700/50 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <a
                href="/login"
                className="bg-white text-emerald-800 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-50 transition-colors"
              >
                {t('login')}
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
