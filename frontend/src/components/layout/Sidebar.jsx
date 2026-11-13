import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Camera,
  AlertTriangle,
  PlaySquare,
  FileSearch,
  Radio,
  Settings,
  ShieldAlert
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/cameras', label: 'Cameras', icon: Camera },
  { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/video-analysis', label: 'Video Analysis', icon: PlaySquare },
  { path: '/evidence', label: 'Evidence', icon: FileSearch },
  { path: '/dispatch-log', label: 'Dispatch Log', icon: Radio },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ incidentBadgeCount = 0 }) {
  return (
    <aside className="w-64 bg-[#191E26] border-r border-[#3E4651] flex flex-col shrink-0 h-screen sticky top-0 select-none">
      {/* Product Mark & Header */}
      <div className="p-5 border-b border-[#3E4651]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#D32F2F] text-white flex items-center justify-center font-mono font-bold text-sm tracking-tighter">
            TS
          </div>
          <div>
            <div className="text-sm font-bold tracking-widest text-[#F8F9FA] uppercase">
              TRAFFIC <span className="text-[#1E88E5]">/</span> SAFETY
            </div>
            <div className="text-[10px] text-[#A0ABBA] tracking-wider uppercase font-mono">
              OPERATIONS OPS-CENTER
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-mono tracking-wider text-[#A0ABBA] uppercase">
          NAVIGATION CONTROL
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 text-xs uppercase tracking-wider font-medium transition-none border-l-2 ${
                  isActive
                    ? 'bg-[#2C323B] text-[#F8F9FA] border-[#1E88E5]'
                    : 'text-[#A0ABBA] hover:text-[#F8F9FA] hover:bg-[#232830] border-transparent'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.path === '/incidents' && incidentBadgeCount > 0 && (
                <span className="font-mono-numbers text-[10px] bg-[#D32F2F] text-white px-1.5 py-0.2">
                  {incidentBadgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Safety Guardrail Notice in Sidebar Footer */}
      <div className="p-4 border-t border-[#3E4651] bg-[#12161C]/50">
        <div className="flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-[#FFC107] shrink-0 mt-0.5" />
          <div className="text-[10px] text-[#A0ABBA] leading-tight">
            <span className="text-[#FFC107] font-semibold block uppercase tracking-wider">
              Simulation Guard
            </span>
            All dispatch triggers execute in mock containment. No live emergency CAD invoked.
          </div>
        </div>
      </div>
    </aside>
  );
}
