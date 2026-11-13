import React from 'react';
import { Inbox, RefreshCw } from 'lucide-react';

export default function EmptyState({ 
  title = 'No records found', 
  description = 'No telemetry or records match the current filter criteria.',
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className = ''
}) {
  return (
    <div className={`p-8 text-center bg-[#232830] border border-[#3E4651] ${className}`}>
      <div className="inline-flex items-center justify-center w-12 h-12 bg-[#191E26] border border-[#3E4651] text-[#A0ABBA] mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold uppercase tracking-wider text-[#F8F9FA]">
        {title}
      </h4>
      <p className="mt-1 text-xs text-[#A0ABBA] max-w-sm mx-auto">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider bg-[#1E88E5] text-white hover:bg-[#1976D2] border border-[#1E88E5]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
