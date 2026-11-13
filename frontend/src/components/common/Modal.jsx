import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#12161C]/80">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        className={`relative z-10 w-full ${maxWidth} bg-[#2C323B] border border-[#3E4651] shadow-2xl p-6 text-[#F8F9FA]`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between pb-4 border-b border-[#3E4651]">
          <div>
            <h3 className="text-base font-semibold tracking-wide text-[#F8F9FA] uppercase">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-1 text-xs text-[#A0ABBA]">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#A0ABBA] hover:text-[#F8F9FA] hover:bg-[#191E26] border border-transparent hover:border-[#3E4651] transition-none"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">
          {children}
        </div>
      </div>
    </div>
  );
}
