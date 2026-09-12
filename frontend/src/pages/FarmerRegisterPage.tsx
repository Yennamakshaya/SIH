import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Sprout, CheckCircle2, AlertCircle, Lock, User, ShieldCheck, ArrowRight } from 'lucide-react';
import axios from 'axios';

const TELANGANA_DISTRICTS = [
  "Rangareddy", "Hyderabad", "Medchal-Malkajgiri", "Sangareddy", "Medak",
  "Nizamabad", "Kamareddy", "Karimnagar", "Peddapalli", "Rajanna Sircilla",
  "Warangal", "Hanamkonda", "Jangaon", "Siddipet", "Yadadri Bhuvanagiri",
  "Nalgonda", "Suryapet", "Khammam", "Bhadradri Kothagudem", "Mahabubnagar",
  "Nagarkurnool", "Wanaparthy", "Jogulamba Gadwal", "Narayanpet", "Vikarabad",
  "Adilabad", "Nirmal", "Mancherial", "Komaram Bheem Asifabad", "Jayashankar Bhupalpally", "Mulugu"
];

export const FarmerRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [mandal, setMandal] = useState('');
  const [district, setDistrict] = useState('Rangareddy');
  const [stateVal] = useState('Telangana');
  const [pincode, setPincode] = useState('');
  
  // Identity
  const [aadhaarNumber, setAadhaarNumber] = useState('');

  // Account
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & Error Messages
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Form Validations
    if (!fullName.trim()) {
      setValidationError("Please enter your full name.");
      return;
    }
    const cleanMobile = mobileNumber.trim().replace(/\s+/g, "").replace("+91", "");
    if (!cleanMobile || cleanMobile.length < 10) {
      setValidationError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!address.trim()) {
      setValidationError("Please enter your address.");
      return;
    }
    if (!village.trim()) {
      setValidationError("Please enter your village name.");
      return;
    }
    if (!mandal.trim()) {
      setValidationError("Please enter your mandal name.");
      return;
    }
    if (!district.trim()) {
      setValidationError("Please select your district.");
      return;
    }
    if (!pincode.trim() || pincode.trim().length < 6) {
      setValidationError("Please enter a valid 6-digit pincode.");
      return;
    }
    const cleanAadhaar = aadhaarNumber.replace(/\s+/g, "");
    if (!cleanAadhaar || cleanAadhaar.length < 12) {
      setValidationError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setValidationError("Please enter a valid email address.");
      return;
    }
    if (!username.trim()) {
      setValidationError("Please enter a username.");
      return;
    }
    if (!password || password.length < 6) {
      setValidationError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    setLoading(true);

    axios.post('/api/auth/register/farmer', {
      full_name: fullName.trim(),
      mobile_number: cleanMobile,
      username: username.trim(),
      email: email.trim(),
      password: password,
      confirm_password: confirmPassword,
      address: address.trim(),
      village: village.trim(),
      mandal: mandal.trim(),
      district: district.trim(),
      state: "Telangana",
      pincode: pincode.trim(),
      aadhaar_number: cleanAadhaar,
      preferred_language: "te",
      crops_grown: "Paddy, Cotton, Tomato, Vegetables",
      farm_size: "5 Acres"
    })
      .then(() => {
        setSuccessMessage("Your Farmer account has been created successfully. Redirecting to Farmer Login...");
        setTimeout(() => {
          navigate('/login?role=farmer');
        }, 2000);
      })
      .catch(err => {
        setValidationError(err.response?.data?.detail || "Registration failed. Please check your details.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 py-8 px-4 flex justify-center">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-emerald-800 text-white p-6 text-center space-y-2">
          <div className="inline-flex bg-emerald-600/60 p-3 rounded-2xl border border-emerald-500/50">
            <Sprout className="w-8 h-8 text-amber-300" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">{t('farmerRegistration')}</h2>
          <p className="text-xs text-emerald-200 font-medium">Telangana Farmer Registration Portal</p>
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
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-bold rounded-xl flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Section 1: Personal Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4" />
              {t('personalDetails')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Reddy"
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Address / House No. *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. H.No 4-12, Main Street"
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Village *</label>
                <input
                  type="text"
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Shadnagar"
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Mandal *</label>
                <input
                  type="text"
                  required
                  value={mandal}
                  onChange={(e) => setMandal(e.target.value)}
                  placeholder="e.g. Farooqnagar"
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Telangana District *</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {TELANGANA_DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">State</label>
                <input
                  type="text"
                  disabled
                  value={stateVal}
                  className="w-full mt-1 p-2.5 text-sm bg-slate-200 border border-slate-300 rounded-xl font-bold text-slate-700"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Pincode *</label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 509216"
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Identity (Aadhaar) */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShieldCheck className="w-4 h-4" />
              {t('identityDetails')}
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700">Aadhaar Number (12 Digits) *</label>
              <input
                type="text"
                required
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value)}
                placeholder="e.g. 1234 5678 9012"
                className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">{t('aadhaarMaskedNote')}</p>
            </div>
          </div>

          {/* Section 3: Account Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Lock className="w-4 h-4" />
              {t('accountDetails')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ramesh@kisanlink.in"
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Username *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. ramesh_reddy"
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !!successMessage}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{loading ? "Creating Farmer Account..." : "Create Farmer Account"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center pt-2 text-xs text-slate-500 border-t border-slate-100">
            {t('alreadyHaveAccount')}{' '}
            <a href="/login?role=farmer" className="text-emerald-700 font-bold hover:underline">
              {t('login')}
            </a>
          </div>
        </form>

      </div>
    </div>
  );
};
