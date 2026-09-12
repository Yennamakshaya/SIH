import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Lock, Mail, Phone, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import axios from 'axios';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [identifier, setIdentifier] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg("Please enter your registered Mobile Number, Email or Username.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    axios.post('/api/auth/forgot-password', { identifier: identifier.trim() })
      .then(res => {
        setStep(2);
        setStatusMsg(res.data.message || "Reset OTP sent to your registered contact.");
        if (res.data.otp_hint) {
          setStatusMsg(`Reset OTP sent. (Code: ${res.data.otp_hint})`);
        }
      })
      .catch(err => {
        setErrorMsg(err.response?.data?.detail || "No account found with this identifier.");
      })
      .finally(() => setLoading(false));
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setErrorMsg("Please enter the verification OTP code.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    axios.post('/api/auth/reset-password', {
      identifier: identifier.trim(),
      otp: otpCode.trim(),
      new_password: newPassword,
      confirm_password: confirmPassword
    })
      .then(res => {
        setStatusMsg("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      })
      .catch(err => {
        setErrorMsg(err.response?.data?.detail || "Invalid OTP or reset failed.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 text-center space-y-2">
          <div className="inline-flex bg-slate-800 p-3 rounded-2xl border border-slate-700">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">{t('resetPassword')}</h2>
          <p className="text-xs text-slate-300 font-medium">Verify contact and create a new secure password</p>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{statusMsg}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Registered Mobile / Email / Username</label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 9876543210 or farmer@kisanlink.in"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{loading ? "Sending..." : "Send Verification OTP"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Enter 6-Digit OTP *</label>
                <input
                  type="text"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter OTP"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-center font-mono font-bold tracking-widest"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">New Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Password & Login"}
              </button>
            </form>
          )}

          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            <a href="/login" className="text-slate-600 hover:text-slate-900 font-bold inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
