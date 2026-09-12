import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { Sprout, Upload, X, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const CROPS = [
  "Tomato", "Paddy", "Rice", "Cotton", "Maize", "Chilli", "Turmeric",
  "Onion", "Red Gram", "Green Gram", "Black Gram", "Groundnut", "Soybean", "Vegetables", "Other"
];

const QUALITIES = ["Premium", "Grade A", "Grade B", "Grade C"];

export const AddProducePage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [cropName, setCropName] = useState('Tomato');
  const [variety, setVariety] = useState('Desi Hybrid (Sahu)');
  const [quantity, setQuantity] = useState<number>(500);
  const [unit, setUnit] = useState('kg');
  const [quality, setQuality] = useState('Grade A');
  const [expectedPrice, setExpectedPrice] = useState<number>(30);
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0] || "2026-09-11");
  const [availableFrom, setAvailableFrom] = useState(new Date().toISOString().split('T')[0] || "2026-09-11");
  const [district, setDistrict] = useState('Rangareddy');
  const [mandal, setMandal] = useState('Farooqnagar');
  const [village, setVillage] = useState('Shadnagar');
  const [pincode, setPincode] = useState('509216');
  const [description, setDescription] = useState('Freshly harvested farm-fresh Grade A produce from red soil fields in Shadnagar.');
  
  // Image Upload Preview state
  const [imagePreview, setImagePreview] = useState<string>("https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    axios.post('/api/farmer/produce', {
      crop_name: cropName,
      variety: variety,
      quantity: quantity,
      unit: unit,
      quality: quality,
      expected_price: expectedPrice,
      harvest_date: harvestDate,
      available_from: availableFrom,
      state: "Telangana",
      district: district,
      mandal: mandal,
      village: village,
      pincode: pincode,
      description: description,
      images: imagePreview
    })
    .then(() => {
      setSuccessMsg("Produce added successfully!");
      setTimeout(() => navigate('/farmer/produce'), 1200);
    })
    .catch(err => {
      alert("Error adding produce: " + (err.response?.data?.detail || "Please try again."));
    })
    .finally(() => setLoading(false));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sprout className="w-6 h-6 text-emerald-600" />
              {t('addProduce')}
            </h1>
            <p className="text-xs text-slate-500">List your agricultural crop harvest for Telangana verified buyers.</p>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
            Telangana Location Scope
          </span>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">{t('crop')} *</label>
              <select
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">{t('variety')}</label>
              <input
                type="text"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                placeholder="e.g. Sahu / Lakshmi Hybrid"
                className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">{t('quantity')} (kg) *</label>
              <input
                type="number"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="500"
                className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">{t('quality')} *</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">{t('expectedPrice')} *</label>
              <input
                type="number"
                required
                value={expectedPrice}
                onChange={(e) => setExpectedPrice(Number(e.target.value))}
                placeholder="30"
                className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Harvest Date</label>
              <input
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Village *</label>
              <input
                type="text"
                required
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Shadnagar"
                className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Mandal *</label>
              <input
                type="text"
                required
                value={mandal}
                onChange={(e) => setMandal(e.target.value)}
                placeholder="Farooqnagar"
                className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe produce quality, moisture content, or packaging..."
              className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          {/* Crop Image Upload Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Crop Image Upload (JPG/PNG/WEBP)</label>
            <div className="flex items-center space-x-4">
              {imagePreview && (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImagePreview('')}
                    className="absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <label className="cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl px-4 py-3 text-xs font-bold flex items-center space-x-2 transition-colors">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Choose Image File</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/farmer/produce')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
