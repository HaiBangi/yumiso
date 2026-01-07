"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, isVisible, onClose, duration = 3000 }: ToastProps) {
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const showTimer = setTimeout(() => setIsShowing(true), 10);
      const hideTimer = setTimeout(() => {
        setIsShowing(false);
        setTimeout(onClose, 300);
      }, duration);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    } else {
      setIsShowing(false);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !isShowing) return null;

  return (
    <div className="fixed top-4 right-4 pointer-events-none" style={{ zIndex: 'var(--z-toast)' }}>
      <div
        className={`
          pointer-events-auto
          flex items-center gap-3
          bg-gradient-to-r from-emerald-500 to-teal-500
          text-white
          px-6 py-4
          rounded-xl
          shadow-2xl
          border border-white/20
          backdrop-blur-sm
          transition-all duration-300 ease-out
          ${isShowing ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <CheckCircle2 className="h-6 w-6 text-white animate-scale-in" />
          </div>
          <p className="font-medium text-sm sm:text-base">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsShowing(false);
            setTimeout(onClose, 300);
          }}
          className="flex-shrink-0 ml-2 hover:bg-white/20 rounded-full p-1 transition-colors"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; isVisible: boolean }>({
    message: "",
    isVisible: false,
  });

  const showToast = (message: string) => {
    setToast({ message, isVisible: true });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  return { toast, showToast, hideToast };
}
