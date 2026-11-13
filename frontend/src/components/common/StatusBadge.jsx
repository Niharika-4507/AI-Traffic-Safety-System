import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Send, 
  XCircle, 
  Radio, 
  Wrench, 
  HelpCircle 
} from 'lucide-react';

const STATUS_CONFIGS = {
  // Incident Statuses
  DETECTED: {
    label: 'DETECTED',
    bg: 'bg-[#FFC107]',
    text: 'text-[#12161C]',
    border: 'border-[#FFC107]',
    icon: AlertTriangle,
  },
  VERIFIED: {
    label: 'VERIFIED',
    bg: 'bg-[#D32F2F]',
    text: 'text-white',
    border: 'border-[#D32F2F]',
    icon: ShieldCheck,
  },
  DISPATCHED: {
    label: 'DISPATCHED',
    bg: 'bg-[#FF6D00]',
    text: 'text-white',
    border: 'border-[#FF6D00]',
    icon: Send,
  },
  RESOLVED: {
    label: 'RESOLVED',
    bg: 'bg-[#00C853]',
    text: 'text-[#12161C]',
    border: 'border-[#00C853]',
    icon: CheckCircle2,
  },
  FALSE_ALARM: {
    label: 'FALSE ALARM',
    bg: 'bg-[#3E4651]',
    text: 'text-[#A0ABBA]',
    border: 'border-[#505A68]',
    icon: XCircle,
  },

  // Camera Statuses
  ACTIVE: {
    label: 'ACTIVE',
    bg: 'bg-[#00C853]',
    text: 'text-[#12161C]',
    border: 'border-[#00C853]',
    icon: Radio,
  },
  INACTIVE: {
    label: 'INACTIVE',
    bg: 'bg-[#232830]',
    text: 'text-[#A0ABBA]',
    border: 'border-[#3E4651]',
    icon: XCircle,
  },
  MAINTENANCE: {
    label: 'MAINTENANCE',
    bg: 'bg-[#FFC107]',
    text: 'text-[#12161C]',
    border: 'border-[#FFC107]',
    icon: Wrench,
  },

  // Dispatch Statuses
  SIMULATED_SUCCESS: {
    label: 'SIMULATED DISPATCH',
    bg: 'bg-[#1E88E5]',
    text: 'text-white',
    border: 'border-[#1E88E5]',
    icon: Send,
  },
};

export default function StatusBadge({ status, size = 'sm', className = '' }) {
  const normStatus = (status || '').toUpperCase().trim();
  const config = STATUS_CONFIGS[normStatus] || {
    label: normStatus || 'UNKNOWN',
    bg: 'bg-[#2C323B]',
    text: 'text-[#F8F9FA]',
    border: 'border-[#3E4651]',
    icon: HelpCircle,
  };

  const Icon = config.icon;
  const sizeClasses = size === 'xs'
    ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : size === 'md'
    ? 'text-xs px-2.5 py-1 gap-1.5 font-semibold'
    : 'text-[11px] px-2 py-0.5 gap-1 font-medium';

  return (
    <span
      className={`inline-flex items-center font-mono-numbers uppercase tracking-wider border rounded-none ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      <Icon className={size === 'xs' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      <span>{config.label}</span>
    </span>
  );
}
