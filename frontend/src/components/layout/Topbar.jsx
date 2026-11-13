import React, { useState, useEffect } from 'react';
import { RefreshCw, Radio, AlertOctagon, Clock } from 'lucide-react';

export default function Topbar({ 
  title = 'Operations Overview', 
  isOnline = true, 
  lastRefreshed = null, 
  onRefresh, 
  isRefreshing = false 
}) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: YYYY-MM-DD HH:mm:ss UTC
      const iso = now.toISOString().replace('T', ' ').substring(0, 19);
      setCurrentTime(`${iso} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-[#191E26] border-b border-[#3E4651] sticky top-0 z-40">
      {/* Top Banner: Academic Prototype Warning */}
      <div className="bg-[#232830] border-b border-[#3E4651] px-6 py-1.5 flex items-center justify-between text-[11px] text-[#A0ABBA]">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-3.5 h-3.5 text-[#FFC107] shrink-0" />
          <span className="font-semibold text-[#FFC107] uppercase tracking-wider">
            ACADEMIC PROTOTYPE
          </span>
          <span className="text-[#3E4651]">|</span>
          <span>AI detections may be incorrect. Human verification is required. Emergency dispatch is simulated.</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#A0ABBA]">
          <Clock className="w-3 h-3 text-[#1E88E5]" />
          <span>{currentTime || 'SYNCHRONIZING CLOCK...'}</span>
        </div>
      </div>

      {/* Main Topbar Row */}
      <div className="px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#F8F9FA] uppercase font-mono">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Real API Status Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1 bg-[#12161C] border border-[#3E4651] text-[11px] font-mono">
            <span 
              className={`w-2 h-2 ${isOnline ? 'bg-[#00C853]' : 'bg-[#D32F2F]'}`}
              aria-hidden="true" 
            />
            <span className={isOnline ? 'text-[#00C853]' : 'text-[#D32F2F]'}>
              {isOnline ? 'BACKEND ONLINE' : 'BACKEND DISCONNECTED'}
            </span>
            <span className="text-[#3E4651]">|</span>
            <span className="text-[#A0ABBA]">127.0.0.1:8000</span>
          </div>

          {/* Sync status & Refresh Button */}
          <div className="flex items-center gap-2">
            {lastRefreshed && (
              <span className="text-[11px] font-mono text-[#A0ABBA]">
                SYNC: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 bg-[#2C323B] border border-[#3E4651] text-[#A0ABBA] hover:text-[#F8F9FA] hover:border-[#1E88E5] transition-none disabled:opacity-50"
              title="Refresh telemetry"
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#1E88E5]' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
