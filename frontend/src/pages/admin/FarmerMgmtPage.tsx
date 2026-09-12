import React, { useState, useEffect } from 'react';
import { Sprout, ShieldCheck, UserX, UserCheck } from 'lucide-react';
import axios from 'axios';

export const FarmerMgmtPage: React.FC = () => {
  const [farmers, setFarmers] = useState<any[]>([]);

  const fetchFarmers = () => {
    axios.get('/api/admin/farmers')
      .then(res => setFarmers(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'suspended' ? 'verified' : 'suspended';
    axios.put(`/api/admin/farmers/${id}/status?status_val=${nextStatus}`)
      .then(() => fetchFarmers())
      .catch(console.error);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Sprout className="w-6 h-6 text-emerald-600" />
          Manage Telangana Farmers
        </h1>
        <p className="text-xs text-slate-500">View registered farmers across Telangana districts, masked Aadhaar records, and account statuses.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="p-3">Farmer Name</th>
                <th className="p-3">Village / Mandal</th>
                <th className="p-3">District</th>
                <th className="p-3">Aadhaar (Masked)</th>
                <th className="p-3">Farm Size</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {farmers.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-extrabold text-slate-900">{f.full_name}</td>
                  <td className="p-3">{f.village}, {f.mandal}</td>
                  <td className="p-3">{f.district}</td>
                  <td className="p-3 font-mono">{f.aadhaar_masked}</td>
                  <td className="p-3">{f.farm_size}</td>
                  <td className="p-3">
                    <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                      f.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleToggleStatus(f.id, f.status)}
                      className={`px-2.5 py-1 font-bold text-[10px] rounded-lg shadow-sm ${
                        f.status === 'suspended' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-red-100 hover:text-red-700'
                      }`}
                    >
                      {f.status === 'suspended' ? 'Activate' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
