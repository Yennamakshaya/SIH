import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldCheck, Lock, User, ArrowRight } from 'lucide-react';
import axios from 'axios';

export const AdminLoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg("Please enter Admin credentials.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    axios.post('/api/auth/login', {
      identifier: identifier.trim(),
      password,
      role: "admin"
    })
    .then(res => {
      login(res.data.access_token, "admin", res.data.user_id, "Administrator");
      navigate('/admin/dashboard');
    })
    .catch(err => {
      setErrorMsg(err.response?.data?.detail || "Admin authentication failed. Invalid credentials.");
    })
    .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-purple-500/30 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="bg-purple-950 p-6 text-center space-y-2 border-b border-purple-800">
          <div className="inline-flex bg-purple-800/60 p-3 rounded-2xl border border-purple-600">
            <ShieldCheck className="w-8 h-8 text-purple-300" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">{t('adminLoginTitle')}</h2>
          <p className="text-xs text-purple-300">Protected Administrative Console for Telangana State APMC Portal</p>
        </div>

        {/* Form */}
        <form onSubmit={handleAdminLogin} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 text-xs font-medium rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Admin Username / Email</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter admin username"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Master Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-sm rounded-xl shadow-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{loading ? "Authenticating Admin..." : "Authenticate Admin Access"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center pt-2">
            <a href="/login" className="text-xs text-purple-300 hover:text-white underline">
              Switch to Farmer / Buyer Login
            </a>
          </div>
        </form>

      </div>
    </div>
  );
};
