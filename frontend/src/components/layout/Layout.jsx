import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const PAGE_TITLES = {
  '/': 'Traffic Safety Operations Overview',
  '/cameras': 'Camera Sensor Monitoring & Registration',
  '/incidents': 'Incident Management & Triage',
  '/video-analysis': 'AI Video Incident Ingestion',
  '/evidence': 'Evidence Snapshot Repository',
  '/dispatch-log': 'Simulated Emergency Dispatch Logs',
  '/settings': 'System Diagnostics & Configuration',
};

export default function Layout({ 
  isOnline = true, 
  lastRefreshed = null, 
  onRefresh, 
  isRefreshing = false,
  pendingIncidentsCount = 0 
}) {
  const location = useLocation();
  const currentTitle = PAGE_TITLES[location.pathname] || 'Traffic Safety Operations';

  return (
    <div className="flex min-h-screen bg-[#12161C] text-[#F8F9FA]">
      <Sidebar incidentBadgeCount={pendingIncidentsCount} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title={currentTitle}
          isOnline={isOnline}
          lastRefreshed={lastRefreshed}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
