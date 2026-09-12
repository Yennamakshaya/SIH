import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  LayoutDashboard, Sprout, PlusCircle, TrendingUp, Users, ShoppingBag, 
  FileCheck, Calendar, Truck, ArrowLeftRight, HelpCircle, Shield, BarChart3, Building2
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  const farmerLinks = [
    { to: '/farmer/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { to: '/farmer/produce', label: t('myProduce'), icon: Sprout },
    { to: '/farmer/add-produce', label: t('addProduce'), icon: PlusCircle },
    { to: '/farmer/market-prices', label: t('marketPrice'), icon: TrendingUp },
    { to: '/farmer/buyers', label: t('buyersList'), icon: Users },
    { to: '/farmer/negotiations', label: 'Offers & Negotiations', icon: ArrowLeftRight },
    { to: '/farmer/agreements', label: t('agreements'), icon: FileCheck },
    { to: '/farmer/slot-booking', label: t('slotBooking'), icon: Calendar },
    { to: '/farmer/handover', label: t('handover'), icon: Truck },
    { to: '/farmer/transactions', label: t('transactions'), icon: Shield },
    { to: '/farmer/grievance', label: t('grievance'), icon: HelpCircle },
  ];

  const buyerLinks = [
    { to: '/buyer/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { to: '/buyer/requirements', label: t('myRequirements'), icon: ShoppingBag },
    { to: '/buyer/add-requirement', label: t('addRequirement'), icon: PlusCircle },
    { to: '/buyer/search-farmers', label: t('searchFarmers'), icon: Sprout },
    { to: '/buyer/negotiations', label: 'Offers & Negotiations', icon: ArrowLeftRight },
    { to: '/buyer/agreements', label: t('agreements'), icon: FileCheck },
    { to: '/buyer/slot-booking', label: t('slotBooking'), icon: Calendar },
    { to: '/buyer/pickup-confirmation', label: 'Pickup & Quality Confirm', icon: Truck },
    { to: '/buyer/transactions', label: t('transactions'), icon: Shield },
    { to: '/buyer/grievance', label: t('grievance'), icon: HelpCircle },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { to: '/admin/farmers', label: 'Manage Farmers', icon: Sprout },
    { to: '/admin/buyers', label: 'Manage Buyers & GST', icon: Building2 },
    { to: '/admin/buyers', label: 'Verify Users', icon: Shield },
    { to: '/admin/market-data', label: 'Market Prices', icon: TrendingUp },
    { to: '/admin/market-data', label: 'APMC Markets', icon: Building2 },
    { to: '/admin/procurements', label: 'Procurement Monitoring', icon: Truck },
    { to: '/admin/transactions', label: 'Transaction Monitoring', icon: FileCheck },
    { to: '/admin/payments', label: 'Payment Monitoring', icon: Shield },
    { to: '/admin/feedback', label: 'Feedback & Ratings', icon: Users },
    { to: '/admin/grievances', label: 'Grievance Center', icon: HelpCircle },
    { to: '/admin/analytics', label: 'Platform Analytics', icon: BarChart3 },
  ];

  let links = farmerLinks;
  if (user.role === 'buyer') links = buyerLinks;
  if (user.role === 'admin') links = adminLinks;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex shadow-xl border-r border-slate-800">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          {user.role} Navigation
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
        <p className="font-bold text-slate-200">KisanLink Telangana</p>
        <p className="text-slate-400 text-[11px] mt-0.5">Direct Agricultural Marketplace & Procurement</p>
      </div>
    </aside>
  );
};
