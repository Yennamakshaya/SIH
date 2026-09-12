import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  ArrowLeftRight, CheckCircle2, XCircle, Send, MessageSquare, Sparkles, 
  Building2, User as UserIcon, TrendingUp, Truck, Shield, AlertCircle, ArrowRight, RefreshCw, Clock
} from 'lucide-react';
import axios from 'axios';

export const NegotiationsPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetOfferId = searchParams.get('offer_id');

  const [offers, setOffers] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Counter offer form state
  const [counterPrice, setCounterPrice] = useState<number>(31);
  const [counterQty, setCounterQty] = useState<number>(500);
  const [counterMsg, setCounterMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isFarmer = user?.role === 'farmer';
  const isBuyer = user?.role === 'buyer';
  const selectedOfferIdRef = useRef<number | null>(null);

  const fetchOffers = (selectId?: number, isBackground = false) => {
    if (!isBackground) setLoading(true);
    axios.get('/api/workflow/offers')
      .then(res => {
        const data = res.data || [];
        setOffers(data);
        if (data.length > 0) {
          const currentTargetId = selectId || selectedOfferIdRef.current || (targetOfferId ? Number(targetOfferId) : null);
          let found = null;
          if (currentTargetId) {
            found = data.find((o: any) => o.id === currentTargetId || o.negotiation_id === `NEG-${currentTargetId.toString().padStart(4, '0')}`);
          }
          const activeOffer = found || data[0];
          setSelectedOffer(activeOffer);
          selectedOfferIdRef.current = activeOffer.id;
          
          if (!isBackground) {
            setCounterPrice(activeOffer.price_per_kg || 31);
            setCounterQty(activeOffer.quantity || 500);
          }
        } else {
          setSelectedOffer(null);
          selectedOfferIdRef.current = null;
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!isBackground) setLoading(false);
      });
  };

  useEffect(() => {
    fetchOffers();

    // Auto-poll every 4 seconds so farmer and buyer see each other's offers in real-time
    const pollTimer = setInterval(() => {
      fetchOffers(selectedOfferIdRef.current || undefined, true);
    }, 4000);

    return () => clearInterval(pollTimer);
  }, [targetOfferId]);

  const handleSelectOffer = (offer: any) => {
    setSelectedOffer(offer);
    selectedOfferIdRef.current = offer.id;
    setCounterPrice(offer.price_per_kg);
    setCounterQty(offer.quantity);
    setErrorMsg(null);
  };

  // Dynamic calculations for current counter inputs
  const dynamicGross = Math.round(counterPrice * counterQty);
  const dynamicTransport = selectedOffer?.transport_cost || 1500;
  const dynamicStorage = selectedOffer?.storage_cost || 0;
  const dynamicNet = Math.max(0, dynamicGross - dynamicTransport - dynamicStorage);
  const dynamicNetPerKg = counterQty > 0 ? (dynamicNet / counterQty).toFixed(2) : counterPrice;

  const handleSendCounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer) return;
    if (!counterPrice || counterPrice <= 0) {
      setErrorMsg("Please enter a valid price per kg greater than ₹0.");
      return;
    }
    if (!counterQty || counterQty <= 0) {
      setErrorMsg("Please enter a valid quantity greater than 0 kg.");
      return;
    }

    setErrorMsg(null);
    setActionLoading(true);

    axios.post(`/api/workflow/offers/${selectedOffer.id}/counter`, {
      offer_id: selectedOffer.id,
      price_per_kg: Number(counterPrice),
      quantity: Number(counterQty),
      message: counterMsg.trim() || `Counter offer: ₹${counterPrice}/kg for ${counterQty} kg (${isFarmer ? 'Farmer' : 'Buyer'})`
    })
    .then(res => {
      setCounterMsg('');
      fetchOffers(selectedOffer.id);
    })
    .catch(err => {
      setErrorMsg(err.response?.data?.detail || "Failed to submit counter offer.");
    })
    .finally(() => setActionLoading(false));
  };

  const handleAcceptOffer = () => {
    if (!selectedOffer) return;
    if (!window.confirm(`Are you sure you want to accept the offer at ₹${selectedOffer.price_per_kg}/kg for ${selectedOffer.quantity} kg? This will generate a Digital Agreement.`)) {
      return;
    }

    setActionLoading(true);
    axios.post(`/api/workflow/offers/${selectedOffer.id}/accept`)
      .then(res => {
        alert("Negotiation Accepted! Digital Agreement generated.");
        if (isFarmer) {
          navigate(`/farmer/agreement/${res.data.agreement_id}`);
        } else {
          navigate('/buyer/agreements');
        }
      })
      .catch(err => {
        alert("Error accepting offer: " + (err.response?.data?.detail || "Please try again."));
      })
      .finally(() => setActionLoading(false));
  };

  const handleRejectOffer = () => {
    if (!selectedOffer) return;
    if (!window.confirm("Are you sure you want to decline/reject this negotiation?")) {
      return;
    }

    setActionLoading(true);
    axios.post(`/api/workflow/offers/${selectedOffer.id}/reject`)
      .then(() => {
        fetchOffers(selectedOffer.id);
      })
      .catch(err => {
        alert("Error rejecting offer: " + (err.response?.data?.detail || "Please try again."));
      })
      .finally(() => setActionLoading(false));
  };

  const isOfferAccepted = selectedOffer?.status?.toUpperCase() === 'ACCEPTED';
  const isOfferRejected = selectedOffer?.status?.toUpperCase() === 'REJECTED';
  const isMyTurn = selectedOffer?.is_my_turn && !isOfferAccepted && !isOfferRejected;
  const negotiationCode = selectedOffer?.negotiation_code || (selectedOffer?.id ? `NEG-${selectedOffer.id.toString().padStart(4, '0')}` : 'NEG-0001');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-emerald-600" />
            {t('priceNegotiationTitle')}
          </h1>
          <p className="text-xs text-slate-500">
            {isFarmer 
              ? t('farmerNegotiationDesc') 
              : t('buyerNegotiationDesc')}
          </p>
        </div>

        <button
          onClick={() => fetchOffers(selectedOffer?.id)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t('refreshThread')}</span>
        </button>
      </div>

      {/* Main Grid: Left Negotiations List, Right Negotiation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Active Negotiations List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('activeNegotiations')} ({offers.length})</h3>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading...
            </div>
          ) : offers.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 space-y-3">
              <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-500 font-medium">{t('noActiveNegotiations')}</p>
              {isFarmer ? (
                <button
                  onClick={() => navigate('/farmer/buyers')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors inline-flex items-center gap-1"
                >
                  <span>{t('goToBuyersList')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/buyer/search-farmers')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors inline-flex items-center gap-1"
                >
                  <span>{t('searchFarmersBtn')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {offers.map(o => {
                const isSelected = selectedOffer?.id === o.id;
                const statusUpper = o.status?.toUpperCase();
                let badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
                let statusText = o.turn_status || o.status;

                if (statusUpper === 'ACCEPTED') {
                  badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                  statusText = t('statusAccepted');
                } else if (statusUpper === 'REJECTED') {
                  badgeClass = 'bg-red-100 text-red-800 border-red-300';
                  statusText = t('statusRejected');
                } else if (o.is_my_turn) {
                  badgeClass = isFarmer ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold' : 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold';
                  statusText = t('statusActionRequired');
                } else {
                  badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                  statusText = isFarmer ? t('statusWaitingBuyer') : t('statusWaitingFarmer');
                }

                const cardCode = o.negotiation_code || `NEG-${o.id.toString().padStart(4, '0')}`;

                return (
                  <div
                    key={o.id}
                    onClick={() => handleSelectOffer(o)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? isFarmer
                          ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-200 shadow-sm'
                          : 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-200 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-sm text-slate-900">{o.crop_name}</h4>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">
                            {cardCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isFarmer ? `${t('buyerRole')}: ${o.buyer_company}` : `${t('farmerRole')}: ${o.farmer_name}`}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                        {statusText}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{t('latestOffer')}</span>
                        <p className="font-black text-emerald-700">₹{o.price_per_kg}/kg</p>
                        <span className="text-[10px] text-slate-500">From: {o.latest_offer_from || (o.current_offer_by === 'farmer' ? t('farmerRole') : t('buyerRole'))}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{t('totalQuantity')}</span>
                        <p className="font-bold text-slate-800">{o.quantity} kg</p>
                        <span className="text-[10px] text-slate-400">{o.updated_at || o.created_at}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Negotiation Workspace */}
        <div className="lg:col-span-2">
          {selectedOffer ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
              
              {/* Header: Key Negotiation Information Bar */}
              <div className="border-b border-slate-100 pb-4 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="text-[11px] bg-slate-900 text-white font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {t('negotiationId')}: {negotiationCode}
                    </span>
                    <h2 className="text-xl font-black text-slate-900 mt-1">
                      {t('priceNegotiationTitle')}: {selectedOffer.crop_name} ({selectedOffer.quantity} kg)
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                      isOfferAccepted 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                        : isOfferRejected
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : isMyTurn
                        ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}>
                      {t('status')}: {isOfferAccepted ? t('statusAccepted') : isOfferRejected ? t('statusRejected') : isMyTurn ? t('statusActionRequired') : (isFarmer ? t('statusWaitingBuyer') : t('statusWaitingFarmer'))}
                    </span>
                  </div>
                </div>

                {/* Key Details Strip */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">{t('farmerSeller')}</span>
                    <p className="font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
                      <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{selectedOffer.farmer_name}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">{selectedOffer.farmer_location}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">{t('buyerProcurer')}</span>
                    <p className="font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{selectedOffer.buyer_company}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">{selectedOffer.buyer_location}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">{t('benchmark')}</span>
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                      ₹{selectedOffer.market_price_benchmark || 28}/kg
                    </p>
                    <p className="text-[11px] text-slate-500">{t('liveModalRate')}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">{t('latestOfferRate')}</span>
                    <p className="font-black text-emerald-700 text-base mt-0.5">
                      ₹{selectedOffer.price_per_kg}/kg
                    </p>
                    <p className="text-[11px] text-slate-500">{t('grossValue')}: ₹{selectedOffer.total_value?.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Turn Banner */}
              {!isOfferAccepted && !isOfferRejected && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
                  isMyTurn 
                    ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <Clock className={`w-5 h-5 flex-shrink-0 ${isMyTurn ? 'text-amber-600' : 'text-slate-400'}`} />
                  <div>
                    <p className="font-black text-sm">
                      {isMyTurn ? t('statusActionRequired') : (isFarmer ? t('statusWaitingBuyer') : t('statusWaitingFarmer'))}
                    </p>
                    <p className="mt-0.5">
                      {isMyTurn 
                        ? `The latest offer of ₹${selectedOffer.price_per_kg}/kg for ${selectedOffer.quantity} kg was submitted by ${selectedOffer.latest_offer_from || (selectedOffer.current_offer_by === 'farmer' ? 'Farmer' : 'Buyer')}. You may accept, reject, or propose a counter-offer.`
                        : `Your offer of ₹${selectedOffer.price_per_kg}/kg for ${selectedOffer.quantity} kg has been delivered. Waiting for response.`}
                    </p>
                  </div>
                </div>
              )}

              {/* AI Net Realisation Recommendation Card */}
              <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200/80 p-4 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    {t('aiTargetPrice')}
                  </span>
                  <span className="text-xs font-black text-emerald-900 bg-white/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    Target: ₹{selectedOffer.ai_target_price || selectedOffer.price_per_kg}/kg
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {selectedOffer.ai_explanation?.[language] || selectedOffer.ai_explanation?.en || selectedOffer.ai_explanation || "Based on current market price, buyer offer, transportation cost and expected net realisation."}
                </p>
              </div>

              {/* Offer Financial Calculation Box (Live Dynamic Breakdown) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  {t('financialBreakdown')}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">{t('expectedPrice')}</span>
                    <p className="font-extrabold text-slate-900 text-sm">₹{counterPrice}/kg</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">{t('quantity')}</span>
                    <p className="font-bold text-slate-900 text-sm">{counterQty} kg</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">{t('grossValue')}</span>
                    <p className="font-bold text-slate-900 text-sm">₹{dynamicGross.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">{t('transportCost')}</span>
                    <p className="font-bold text-red-600 text-sm">- ₹{dynamicTransport.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-emerald-100 p-3 rounded-lg border border-emerald-300 flex items-center justify-between">
                  <div>
                    <span className="text-emerald-950 font-bold uppercase text-[10px]">{t('netRealisationToFarmer')}</span>
                    <p className="text-xs text-emerald-800">{t('netRealisationFormula')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-950">₹{dynamicNet.toLocaleString()}</p>
                    <p className="text-[11px] font-bold text-emerald-800">{t('netRealisation')} ₹{dynamicNetPerKg}/kg</p>
                  </div>
                </div>
              </div>

              {/* Negotiation Chat / Chronological Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    {t('negotiationHistory')}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-semibold">{selectedOffer.negotiations?.length || 0} {t('messagesLogged')}</span>
                </div>

                <div className="bg-slate-100/70 rounded-xl p-4 space-y-3 max-h-72 overflow-y-auto border border-slate-200">
                  {selectedOffer.negotiations?.map((n: any, idx: number) => {
                    const isLast = idx === selectedOffer.negotiations.length - 1;
                    const isFromFarmer = n.sender_role === 'farmer';

                    return (
                      <div
                        key={n.id || idx}
                        className={`flex flex-col ${isFromFarmer ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl text-xs space-y-1.5 shadow-sm border ${
                            isFromFarmer
                              ? 'bg-emerald-800 text-white rounded-tl-none border-emerald-700'
                              : 'bg-white text-slate-900 rounded-tr-none border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 text-[10px] opacity-80 border-b border-white/20 pb-1">
                            <span className="font-bold flex items-center gap-1">
                              {isFromFarmer ? <UserIcon className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                              {n.sender_name} ({n.sender_role?.toUpperCase()})
                            </span>
                            <span>{n.created_at || "Just now"}</span>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-0.5">
                            <p className="font-black text-sm">
                              Proposed: ₹{n.price_per_kg}/kg ({n.quantity} kg)
                            </p>
                            {isLast && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 uppercase tracking-wide shadow-sm">
                                {t('latestOffer')}
                              </span>
                            )}
                          </div>

                          {n.message && (
                            <p className={`text-xs ${isFromFarmer ? 'text-emerald-100' : 'text-slate-600'} leading-relaxed`}>
                              "{n.message}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Section based on Negotiation Status */}
              {isOfferAccepted ? (
                <div className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-md">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-emerald-950 text-base">{t('negotiationAgreed')}</h3>
                      <p className="text-xs text-emerald-800">
                        {t('finalAgreedPrice')}: <span className="font-extrabold">₹{selectedOffer.price_per_kg}/kg</span> ({selectedOffer.quantity} kg) | {t('netRealisation')}: <span className="font-extrabold">₹{selectedOffer.net_realisation?.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end border-t border-emerald-200/80">
                    <button
                      onClick={() => {
                        if (isFarmer) {
                          if (selectedOffer.agreement_id) {
                            navigate(`/farmer/agreement/${selectedOffer.agreement_id}`);
                          } else {
                            navigate('/farmer/agreements');
                          }
                        } else {
                          navigate('/buyer/agreements');
                        }
                      }}
                      className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <Shield className="w-4 h-4" />
                      <span>{t('viewAndSignAgreement')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : isOfferRejected ? (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center space-y-1">
                  <p className="font-bold text-red-900 text-sm flex items-center justify-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-600" />
                    {t('negotiationClosed')}
                  </p>
                  <p className="text-xs text-red-700">{t('negotiationClosedDesc')}</p>
                </div>
              ) : (
                /* Active Negotiation Form */
                <form onSubmit={handleSendCounter} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                      {t('submitOfferHeader')}
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {t('enterProposedDetails')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">{t('proposedPrice')} *</label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        min="1"
                        value={counterPrice}
                        onChange={(e) => setCounterPrice(Number(e.target.value))}
                        className="w-full mt-1 p-2.5 text-sm bg-white border border-slate-300 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700">{t('quantity')} (kg) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={counterQty}
                        onChange={(e) => setCounterQty(Number(e.target.value))}
                        className="w-full mt-1 p-2.5 text-sm bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">{t('negotiationNote')}</label>
                    <input
                      type="text"
                      value={counterMsg}
                      onChange={(e) => setCounterMsg(e.target.value)}
                      placeholder={t('notePlaceholder')}
                      className="w-full mt-1 p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t('sendCounterOffer')}</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleAcceptOffer}
                      className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('acceptLatestOffer')}</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleRejectOffer}
                      className="py-3 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{t('declineReject')}</span>
                    </button>
                  </div>
                </form>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 text-sm border border-slate-200 space-y-2">
              <p>{t('selectNegotiationPrompt')}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default NegotiationsPage;
