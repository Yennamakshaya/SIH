import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Building2, Upload, FileText, X, CheckCircle2, AlertCircle, Lock, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import axios from 'axios';

export const BuyerRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Company Details
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState('');

  // Contact Details
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');

  // Account Details
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Business Verification (GST Certificate)
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [gstPreviewName, setGstPreviewName] = useState<string | null>(null);

  // Status & Error Messages
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setValidationError(t('errorInvalidFileType'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setValidationError(t('errorFileSizeLimit'));
        return;
      }
      setValidationError(null);
      setGstFile(file);
      setGstPreviewName(file.name);
    }
  };

  const handleRemoveFile = () => {
    setGstFile(null);
    setGstPreviewName(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validations
    if (!companyName.trim()) {
      setValidationError(t('errorCompanyName'));
      return;
    }
    if (!companyId.trim()) {
      setValidationError(t('errorCompanyId'));
      return;
    }
    const cleanMobile = mobileNumber.trim().replace(/\s+/g, "").replace("+91", "");
    if (!cleanMobile || cleanMobile.length < 10) {
      setValidationError(t('errorValidMobile'));
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setValidationError(t('errorValidEmail'));
      return;
    }
    if (!password || password.length < 6) {
      setValidationError(t('errorPasswordLength'));
      return;
    }
    if (password !== confirmPassword) {
      setValidationError(t('errorPasswordsMismatch'));
      return;
    }
    if (!gstFile && !gstPreviewName) {
      setValidationError(t('errorUploadGst'));
      return;
    }

    setLoading(true);

    axios.post('/api/auth/register/buyer', {
      company_name: companyName.trim(),
      company_id: companyId.trim(),
      contact_person: companyName.trim(),
      mobile_number: cleanMobile,
      email: email.trim(),
      password: password,
      confirm_password: confirmPassword,
      city: "Hyderabad",
      district: "Medchal-Malkajgiri",
      state: "Telangana",
      pincode: "500051",
      gstin: "36AAAAA0000A1Z5",
      pan: "ABCDE1234F",
      udyam_number: "UDYAM-TG-05-0012345",
      buyer_category: "Food Processor & Bulk Buyer",
      procurement_categories: "Tomato, Paddy, Cotton, Vegetables"
    })
      .then(res => {
        setSuccessMessage(t('successBuyerSubmitted'));
        setTimeout(() => {
          navigate('/login?role=buyer');
        }, 3000);
      })
      .catch(err => {
        setValidationError(err.response?.data?.detail || t('errorAuthFailed'));
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 py-8 px-4 flex justify-center">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-900 text-white p-6 text-center space-y-2">
          <div className="inline-flex bg-blue-700/60 p-3 rounded-2xl border border-blue-500/50">
            <Building2 className="w-8 h-8 text-blue-200" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">{t('buyerRegistration')}</h2>
          <p className="text-xs text-blue-200 font-medium">{t('buyerRegisterPortal')}</p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-blue-50 border border-blue-300 text-blue-950 text-sm font-bold rounded-xl flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Section 1: Company Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4" />
              {t('companyDetails')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">{t('companyName')} *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t('enterCompanyName')}
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">{t('companyId')} *</label>
                <input
                  type="text"
                  required
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  placeholder={t('enterCompanyId')}
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Phone className="w-4 h-4" />
              {t('contactDetails')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">{t('mobileNumber')} *</label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder={t('enterMobileNumber')}
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">{t('corporateEmail')} *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('enterCorporateEmail')}
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Account Credentials */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Lock className="w-4 h-4" />
              {t('accountDetails')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">{t('password')} *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('minSixChars')}
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">{t('confirmPassword')} *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('reEnterPassword')}
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Business Verification (GST Upload) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                {t('businessVerification')}
              </h3>
              <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded">
                {t('verificationStatus')}: {t('statusPendingVerification')}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">{t('uploadGstCert')} *</label>
              
              {gstPreviewName ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">{gstPreviewName}</p>
                      <p className="text-[10px] text-slate-500">{t('docUploadedSuccess')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title={t('removeDoc')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                  <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">{t('clickToUploadGst')}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{t('gstUploadNote')}</p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="gst-upload-input"
                  />
                  <label
                    htmlFor="gst-upload-input"
                    className="mt-3 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-colors"
                  >
                    {t('selectDocument')}
                  </label>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !!successMessage}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{loading ? t('submittingRegistration') : t('submitBuyerRegBtn')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center pt-2 text-xs text-slate-500 border-t border-slate-100">
            {t('alreadyHaveAccount')}{' '}
            <a href="/login?role=buyer" className="text-blue-700 font-bold hover:underline">
              {t('login')}
            </a>
          </div>
        </form>

      </div>
    </div>
  );
};
