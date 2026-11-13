import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Overview from './pages/Overview';
import Cameras from './pages/Cameras';
import Incidents from './pages/Incidents';
import VideoAnalysis from './pages/VideoAnalysis';
import EvidenceViewer from './pages/EvidenceViewer';
import DispatchLog from './pages/DispatchLog';
import Settings from './pages/Settings';

import { getHealth } from './api/health';
import { getCameras } from './api/cameras';
import { getIncidents } from './api/incidents';
import { getDispatchLogs } from './api/dispatch';

export default function App() {
  const [isOnline, setIsOnline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Global Telemetry State
  const [cameras, setCameras] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [dispatchLogs, setDispatchLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGlobalData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Verify health
      await getHealth();
      setIsOnline(true);

      // 2. Fetch parallel telemetry
      const [camsData, incsData, logsData] = await Promise.all([
        getCameras(),
        getIncidents({ limit: 100 }),
        getDispatchLogs({ limit: 100 }),
      ]);

      setCameras(camsData);
      setIncidents(incsData);
      setDispatchLogs(logsData);
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('Backend synchronization warning:', err.message);
      setIsOnline(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalData();
    // Optional periodic refresh every 30s
    const timer = setInterval(fetchGlobalData, 30000);
    return () => clearInterval(timer);
  }, [fetchGlobalData]);

  const pendingIncidentsCount = incidents.filter(i => i.status === 'DETECTED').length;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <Layout
              isOnline={isOnline}
              lastRefreshed={lastRefreshed}
              onRefresh={fetchGlobalData}
              isRefreshing={isRefreshing}
              pendingIncidentsCount={pendingIncidentsCount}
            />
          }
        >
          <Route
            index
            element={
              <Overview
                cameras={cameras}
                incidents={incidents}
                dispatchLogs={dispatchLogs}
                isLoading={isLoading}
                onRefresh={fetchGlobalData}
              />
            }
          />
          <Route
            path="cameras"
            element={
              <Cameras
                cameras={cameras}
                isLoading={isLoading}
                onRefresh={fetchGlobalData}
              />
            }
          />
          <Route
            path="incidents"
            element={
              <Incidents
                cameras={cameras}
                onRefreshGlobal={fetchGlobalData}
              />
            }
          />
          <Route
            path="video-analysis"
            element={
              <VideoAnalysis
                cameras={cameras}
                onRefreshGlobal={fetchGlobalData}
              />
            }
          />
          <Route
            path="evidence"
            element={
              <EvidenceViewer
                incidents={incidents}
              />
            }
          />
          <Route
            path="dispatch-log"
            element={
              <DispatchLog
                incidents={incidents}
                dispatchLogs={dispatchLogs}
                isLoading={isLoading}
                onRefreshGlobal={fetchGlobalData}
              />
            }
          />
          <Route
            path="settings"
            element={
              <Settings
                isOnline={isOnline}
                onRefreshGlobal={fetchGlobalData}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
