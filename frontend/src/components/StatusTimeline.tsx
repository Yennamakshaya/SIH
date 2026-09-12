import React from 'react';
import { CheckCircle2, Clock, Circle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../i18n/translations';

interface StatusTimelineProps {
  currentStatus: string;
}

export const procurementStageKeys: { key: string; labelKey: TranslationKey }[] = [
  { key: "Agreement Signed", labelKey: "stageAgreementSigned" },
  { key: "Slot Booked", labelKey: "stageSlotBooked" },
  { key: "Pickup Scheduled", labelKey: "stagePickupScheduled" },
  { key: "Produce Ready", labelKey: "stageProduceReady" },
  { key: "Produce Picked Up", labelKey: "stageProducePickedUp" },
  { key: "Delivered", labelKey: "stageDelivered" },
  { key: "Quality Confirmed", labelKey: "stageQualityConfirmed" },
  { key: "Payment Processing", labelKey: "stagePaymentProcessing" },
  { key: "Payment Completed", labelKey: "stagePaymentCompleted" },
  { key: "Transaction Completed", labelKey: "stageTransactionCompleted" }
];

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ currentStatus }) => {
  const { t } = useLanguage();
  const currentIndex = procurementStageKeys.findIndex(s => s.key === currentStatus);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;

  const currentStageObj = procurementStageKeys[activeIdx];
  const displayStatus = currentStageObj ? t(currentStageObj.labelKey) : currentStatus;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          {t('procurementLifecycle')}
        </h4>
        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
          {t('status')}: {displayStatus}
        </span>
      </div>

      {/* Horizontal step tracker */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center min-w-[760px] space-x-1">
          {procurementStageKeys.map((stage, idx) => {
            const isDone = idx <= activeIdx;
            const isCurrent = idx === activeIdx;

            return (
              <React.Fragment key={stage.key}>
                <div className="flex flex-col items-center flex-1 text-center min-w-[70px]">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isDone
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-200'
                        : isCurrent
                        ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] mt-1.5 leading-tight ${
                      isCurrent
                        ? 'font-extrabold text-amber-700'
                        : isDone
                        ? 'font-semibold text-emerald-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {t(stage.labelKey)}
                  </span>
                </div>

                {idx < procurementStageKeys.length - 1 && (
                  <div
                    className={`h-1 flex-1 rounded transition-colors ${
                      idx < activeIdx ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
