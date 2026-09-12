import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { Sprout, PlusCircle, Search, Filter, Trash2, Eye, ArrowRight } from 'lucide-react';
import axios from 'axios';

export const MyProducePage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [produces, setProduces] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProduce = () => {
    axios.get('/api/farmer/produce')
      .then(res => setProduces(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProduce();
  }, []);

  const handleDeactivate = (id: number) => {
    if (window.confirm("Are you sure you want to deactivate this produce listing?")) {
      axios.put(`/api/farmer/produce/${id}/deactivate`)
        .then(() => fetchProduce())
        .catch(console.error);
    }
  };

  const filtered = produces.filter(p => p.crop_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sprout className="w-6 h-6 text-emerald-600" />
            {t('myProduce')}
          </h1>
          <p className="text-xs text-slate-500">Manage your listed produce, edit rates, and discover matching buyers.</p>
        </div>
        <button
          onClick={() => navigate('/farmer/add-produce')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('addProduce')}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search produce by crop name (e.g. Tomato, Paddy)..."
          className="w-full pl-10 pr-4 py-2.5 bg-white text-sm border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Produce List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3 hover:border-emerald-400 transition-colors">
            <div className="flex gap-4">
              <img
                src={item.images?.split(',')[0] || "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop"}
                alt={item.crop_name}
                className="w-24 h-24 object-cover rounded-xl border border-slate-100"
              />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-800">{item.crop_name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">Variety: <span className="font-semibold text-slate-800">{item.variety || "Hybrid"}</span></p>
                <p className="text-xs text-slate-600">Quantity: <span className="font-bold text-slate-800">{item.quantity} {item.unit}</span> | Grade: <span className="font-bold text-emerald-700">{item.quality}</span></p>
                <p className="text-xs text-slate-600">Location: {item.location}</p>
                <p className="text-xs text-slate-600">Expected Price: <span className="font-extrabold text-emerald-700">₹{item.expected_price}/kg</span></p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                onClick={() => handleDeactivate(item.id)}
                className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Deactivate
              </button>
              <button
                onClick={() => navigate(`/farmer/buyers?produce_id=${item.id}`)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1 transition-colors"
              >
                <span>Find Buyers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
