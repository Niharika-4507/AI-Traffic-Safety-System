import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Camera, 
  Send, 
  ArrowRight, 
  Play, 
  ShieldCheck, 
  CheckCircle2, 
  Radio, 
  Clock,
  Layers,
  FileSearch,
  ExternalLink
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import { getEvidenceSnapshotUrl } from '../api/incidents';

export default function Overview({ 
  cameras = [], 
  incidents = [], 
  dispatchLogs = [], 
  isLoading = false,
  onRefresh 
}) {
  // Derive operational metrics honestly from backend data
  const totalCameras = cameras.length;
  const activeCameras = cameras.filter(c => c.status === 'ACTIVE').length;
  const totalIncidents = incidents.length;
  const awaitingReview = incidents.filter(i => i.status === 'DETECTED').length;
  const verifiedIncidents = incidents.filter(i => i.status === 'VERIFIED' || i.status === 'DISPATCHED').length;
  const totalDispatches = dispatchLogs.length;

  // Prominent critical incident (prioritize DETECTED, or most recent)
  const priorityIncident = incidents.find(i => i.status === 'DETECTED') || incidents[0] || null;

  if (isLoading && incidents.length === 0 && cameras.length === 0) {
    return (
      <div className="space-y-6">
        <div className="border-b border-[#3E4651] pb-4">
          <div className="h-8 w-72 bg-[#2C323B] animate-pulse mb-2" />
          <div className="h-4 w-96 bg-[#232830] animate-pulse" />
        </div>
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Editorial Header Section */}
      <div className="border-b border-[#3E4651] pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#1E88E5] block mb-1">
              SYSTEM OVERVIEW // LIVE SENSOR TELEMETRY
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-[#F8F9FA] uppercase font-mono">
              Traffic Safety Operations
            </h2>
            <p className="mt-1 text-sm text-[#A0ABBA] max-w-2xl">
              Real-time road hazard detection, temporal validation engine, and simulated rapid response monitoring.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              to="/video-analysis"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider bg-[#1E88E5] text-white hover:bg-[#1976D2] border border-[#1E88E5] transition-none"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Analyze Video Stream</span>
            </Link>
            <Link
              to="/incidents"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider bg-[#2C323B] text-[#F8F9FA] hover:bg-[#232830] border border-[#3E4651] transition-none"
            >
              <span>View All Incidents</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Compact Editorial Metrics Strip (NO GRID OF CARDS) */}
        <div className="mt-6 pt-6 border-t border-[#3E4651] flex flex-wrap items-center justify-between gap-6 bg-[#191E26] p-4 border border-[#3E4651]">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-[#F8F9FA]">{totalCameras}</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A0ABBA]">Cameras Total</span>
          </div>
          <div className="h-6 w-px bg-[#3E4651] hidden sm:block" />
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-[#00C853]">{activeCameras}</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A0ABBA]">Active Feeds</span>
          </div>
          <div className="h-6 w-px bg-[#3E4651] hidden sm:block" />
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-[#F8F9FA]">{totalIncidents}</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A0ABBA]">Total Incidents</span>
          </div>
          <div className="h-6 w-px bg-[#3E4651] hidden sm:block" />
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-[#FFC107]">{awaitingReview}</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A0ABBA]">Awaiting Review</span>
          </div>
          <div className="h-6 w-px bg-[#3E4651] hidden sm:block" />
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-[#1E88E5]">{verifiedIncidents}</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A0ABBA]">Verified/Active</span>
          </div>
          <div className="h-6 w-px bg-[#3E4651] hidden sm:block" />
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-[#FF6D00]">{totalDispatches}</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A0ABBA]">Simulated Dispatches</span>
          </div>
        </div>
      </div>

      {/* Prominent Current Priority Incident Section */}
      {priorityIncident ? (
        <section className="bg-[#2C323B] border border-[#3E4651] p-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#3E4651] mb-5">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-[#D32F2F] inline-block" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#F8F9FA] font-mono">
                CURRENT OPERATIONAL PRIORITY // {priorityIncident.incident_code}
              </h3>
            </div>
            <StatusBadge status={priorityIncident.status} size="md" />
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Snapshot Evidence Thumbnail */}
            <div className="w-full lg:w-80 shrink-0 bg-[#191E26] border border-[#3E4651] overflow-hidden">
              {priorityIncident.evidence_snapshot_path ? (
                <div className="relative group">
                  <img
                    src={getEvidenceSnapshotUrl(priorityIncident.evidence_snapshot_path)}
                    alt={`Evidence ${priorityIncident.incident_code}`}
                    className="w-full h-48 object-cover border-b border-[#3E4651]"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="192" viewBox="0 0 320 192"><rect width="320" height="192" fill="%23191E26"/><text x="50%" y="50%" fill="%23A0ABBA" font-family="monospace" font-size="12" text-anchor="middle">IMAGE UNAVAILABLE</text></svg>';
                    }}
                  />
                  <div className="p-2.5 bg-[#191E26] flex items-center justify-between text-[11px] font-mono text-[#A0ABBA]">
                    <span>FRAME SNAPSHOT</span>
                    <Link 
                      to={`/evidence?incident=${priorityIncident.id}`}
                      className="text-[#1E88E5] hover:underline flex items-center gap-1"
                    >
                      <FileSearch className="w-3 h-3" />
                      <span>INSPECT</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center p-4 text-center text-[#A0ABBA]">
                  <FileSearch className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs font-mono">NO EVIDENCE SNAPSHOT</span>
                </div>
              )}
            </div>

            {/* Incident Operational Metadata */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-[#3E4651]/60">
                <div>
                  <span className="text-[10px] uppercase font-mono text-[#A0ABBA] block">CAMERA CODE</span>
                  <span className="text-sm font-mono font-bold text-[#F8F9FA]">{priorityIncident.camera_id}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-[#A0ABBA] block">COLLISION CLASS</span>
                  <span className="text-sm font-mono font-semibold text-[#FFC107] capitalize">
                    {priorityIncident.accident_class.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-[#A0ABBA] block">PEAK CONFIDENCE</span>
                  <span className="text-sm font-mono font-bold text-[#F8F9FA]">
                    {(priorityIncident.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-[#A0ABBA] block">VIDEO TIMESTAMP</span>
                  <span className="text-sm font-mono text-[#F8F9FA]">
                    {priorityIncident.timestamp_start.toFixed(2)}s - {priorityIncident.timestamp_end.toFixed(2)}s
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#A0ABBA]">
                <div className="flex items-center gap-4 font-mono text-[11px]">
                  <span>HITS: <strong className="text-[#F8F9FA]">{priorityIncident.hit_count} frames</strong></span>
                  <span>DURATION: <strong className="text-[#F8F9FA]">{priorityIncident.duration_sec.toFixed(2)}s</strong></span>
                  <span>DETECTED: <strong className="text-[#F8F9FA]">{new Date(priorityIncident.detected_at).toLocaleTimeString()}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/incidents?select=${priorityIncident.id}`}
                    className="px-3 py-1.5 bg-[#1E88E5] text-white font-semibold text-xs uppercase tracking-wider hover:bg-[#1976D2] transition-none flex items-center gap-1.5"
                  >
                    <span>Operator Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    to={`/dispatch-log?incident=${priorityIncident.id}`}
                    className="px-3 py-1.5 bg-[#232830] border border-[#3E4651] text-[#A0ABBA] hover:text-white hover:border-[#FF6D00] text-xs uppercase tracking-wider font-medium flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3 text-[#FF6D00]" />
                    <span>Simulate Dispatch</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Asymmetric Split Layout: Recent Feed & Camera Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Recent Incident Activity Feed */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#3E4651]">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#F8F9FA]">
              <Layers className="w-4 h-4 text-[#1E88E5]" />
              <span className="font-bold">Recent Incident Detections</span>
            </div>
            <Link
              to="/incidents"
              className="text-xs font-mono text-[#1E88E5] hover:underline flex items-center gap-1"
            >
              <span>ALL INCIDENTS ({incidents.length})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {incidents.length === 0 ? (
            <EmptyState
              title="No Incidents Ingested"
              description="No incident telemetry has been recorded yet. Ingest a test video via the Video Analysis tool."
              actionLabel="Run Video Analysis"
              onAction={() => window.location.href = '/video-analysis'}
            />
          ) : (
            <div className="space-y-2">
              {incidents.slice(0, 5).map((inc) => (
                <div
                  key={inc.id}
                  className="bg-[#2C323B] border border-[#3E4651] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#1E88E5] transition-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <StatusBadge status={inc.status} size="xs" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#F8F9FA]">
                          {inc.incident_code}
                        </span>
                        <span className="text-[#3E4651]">|</span>
                        <span className="font-mono text-xs text-[#A0ABBA]">
                          {inc.camera_id}
                        </span>
                      </div>
                      <div className="text-xs text-[#A0ABBA] mt-0.5 capitalize">
                        {inc.accident_class.replace(/_/g, ' ')} &bull; Conf: {(inc.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono text-[#A0ABBA]">
                    <span className="text-[11px]">T={inc.timestamp_start.toFixed(1)}s</span>
                    <Link
                      to={`/incidents?select=${inc.id}`}
                      className="px-2 py-1 bg-[#191E26] hover:bg-[#12161C] border border-[#3E4651] text-[#F8F9FA] text-[11px] uppercase tracking-wider"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Camera Status & Dispatch Summary */}
        <div className="lg:col-span-5 space-y-6">
          {/* Camera Sensor Network Status */}
          <div className="bg-[#2C323B] border border-[#3E4651] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#3E4651] mb-4">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#F8F9FA]">
                <Camera className="w-4 h-4 text-[#00C853]" />
                <span className="font-bold">Camera Feeds</span>
              </div>
              <Link
                to="/cameras"
                className="text-xs font-mono text-[#1E88E5] hover:underline"
              >
                MANAGE ({cameras.length})
              </Link>
            </div>

            <div className="space-y-2.5">
              {cameras.map((cam) => (
                <div
                  key={cam.id}
                  className="p-3 bg-[#191E26] border border-[#3E4651] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-[#F8F9FA]">{cam.id}</div>
                    <div className="text-[11px] text-[#A0ABBA] truncate max-w-[200px]">
                      {cam.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={cam.status} size="xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Simulated Dispatch Audit Feed */}
          <div className="bg-[#2C323B] border border-[#3E4651] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#3E4651] mb-4">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#F8F9FA]">
                <Radio className="w-4 h-4 text-[#FF6D00]" />
                <span className="font-bold">Recent Simulated Dispatches</span>
              </div>
              <Link
                to="/dispatch-log"
                className="text-xs font-mono text-[#1E88E5] hover:underline"
              >
                LOGS ({dispatchLogs.length})
              </Link>
            </div>

            {dispatchLogs.length === 0 ? (
              <div className="text-xs text-[#A0ABBA] font-mono p-4 text-center bg-[#191E26] border border-[#3E4651]">
                No emergency response simulations triggered yet.
              </div>
            ) : (
              <div className="space-y-2">
                {dispatchLogs.slice(0, 4).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-[#191E26] border border-[#3E4651] text-xs font-mono"
                  >
                    <div className="flex items-center justify-between text-[#F8F9FA]">
                      <span className="font-bold text-[#FF6D00]">{log.dispatch_type}</span>
                      <span className="text-[10px] text-[#A0ABBA]">
                        {new Date(log.dispatched_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#A0ABBA] mt-1 truncate">
                      To: {log.recipient_agency}
                    </div>
                    {log.notes && (
                      <div className="text-[10px] text-[#3E4651] mt-1 truncate">
                        Notes: {log.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
