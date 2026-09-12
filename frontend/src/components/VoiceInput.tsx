import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface VoiceInputProps {
  onResult: (text: string) => void;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onResult }) => {
  const { language, t } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusMsg(t('voiceNotSupported'));
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      // Set speech language code based on current app language
      if (language === 'te') recognition.lang = 'te-IN';
      else if (language === 'hi') recognition.lang = 'hi-IN';
      else recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMsg(t('voiceListening'));
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setStatusMsg(null);
        if (transcript) {
          onResult(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setStatusMsg(t('voiceError'));
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
      setStatusMsg(t('voiceNotSupported'));
    }
  };

  return (
    <div className="inline-flex items-center space-x-2">
      <button
        type="button"
        onClick={startListening}
        className={`p-2 rounded-full transition-all shadow-sm cursor-pointer ${
          isListening
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
        }`}
        title={t('speakToInput')}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
      {statusMsg && (
        <span className="text-xs text-slate-500 animate-fade-in font-medium">
          {statusMsg}
        </span>
      )}
    </div>
  );
};
