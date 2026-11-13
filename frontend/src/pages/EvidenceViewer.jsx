import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FileSearch, Camera, AlertTriangle, Clock, Layers, ArrowRight, ShieldCheck, Download } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import { getEvidenceSnapshotUrl } from '../api/incidents';

export default function EvidenceViewer({ 
  incidents = [] 
}) {
  const [searchParams] = useSearchParams();
  const queryIncidentId = searchParams.get('incident');

  // Filter for incidents that have evidence snapshot path
  const incidentsWithEvidence = incidents.filter(i => Boolean(i.evidence_snapshot_path));
  
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    if (incidentsWithEvidence.length > 0) {
      if (queryIncidentId) {
        const match = incidentsWithEvidence.find(i => String(i.id) === String(queryIncidentId));
        if (match) setSelectedIncident(match);
        else setSelectedIncident(incidentsWithEvidence[0]);
      } else if (!selectedIncident) {
        setSelectedIncident(incidentsWithEvidence[0]);
      }
    }
  }, [incidents, queryIncidentId]);

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="border-b border-[#3E4651] pb-6">
        <span className="font-mono text-xs uppercase tracking-widest text-[#1E88E5] block mb-1">
          FORENSIC EVIDENCE REPOSITORY
        </span>
        <h2 className="text-2xl font-bold uppercase tracking-tight text-[#F8F9FA] font-mono">
          Collision Evidence Snapshots
        </h2>
        <p className="mt-1 text-xs text-[#A0ABBA]">
          Inspect verified high-resolution frame captures extracted automatically by the temporal validator at peak collision confidence.
        </p>
      </div>

      {incidentsWithEvidence.length === 0 ? (
        <EmptyState
          title="No Evidence Snapshots Available"
          description="No incidents with saved evidence snapshots have been recorded yet. Ingest an accident video through the Video Analysis tool."
          actionLabel="Go to Video Analysis"
          onAction={() => window.location.href = '/video-analysis'}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (4 cols): Evidence Index List */}
          <div className="lg:col-span-4 bg-[#2C323B] border border-[#3E4651]">
            <div className="p-3 bg-[#191E26] border-b border-[#3E4651] text-xs font-mono uppercase tracking-wider text-[#A0ABBA] flex items-center justify-between">
              <span>AVAILABLE EVIDENCE FRAMES</span>
              <span>({incidentsWithEvidence.length})</span>
            </div>

            <div className="divide-y divide-[#3E4651] max-h-[600px] overflow-y-auto">
              {incidentsWithEvidence.map(inc => {
                const isSelected = selectedIncident?.id === inc.id;
                const snapUrl = getEvidenceSnapshotUrl(inc.evidence_snapshot_path);
                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-3 flex items-center gap-3 cursor-pointer transition-none ${
                      isSelected
                        ? 'bg-[#232830] border-l-4 border-l-[#1E88E5]'
                        : 'hover:bg-[#232830] border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="w-16 h-12 bg-[#12161C] border border-[#3E4651] shrink-0 overflow-hidden">
                      <img
                        src={snapUrl}
                        alt={inc.incident_code}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48" viewBox="0 0 64 48"><rect width="64" height="48" fill="%23191E26"/></svg>';
                        }}
                      />
                    </div>

                    <div className="min-w-0 flex-1 text-xs">
                      <div className="font-mono font-bold text-[#F8F9FA] truncate">
                        {inc.incident_code}
                      </div>
                      <div className="text-[11px] text-[#FFC107] capitalize truncate">
                        {inc.accident_class.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10px] font-mono text-[#A0ABBA] flex items-center gap-2 mt-0.5">
                        <span>{inc.camera_id}</span>
                        <span>&bull;</span>
                        <span>{inc.timestamp_start.toFixed(1)}s</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (8 cols): Large Evidence Frame Inspector */}
          <div className="lg:col-span-8 bg-[#2C323B] border border-[#3E4651] p-5 space-y-4">
            {selectedIncident ? (
              <>
                <div className="pb-3 border-b border-[#3E4651] flex items-center justify-between">
                  <div>
                    <h3 className="font-mono text-base font-bold text-[#F8F9FA]">
                      {selectedIncident.incident_code} // EVIDENCE INSPECTION
                    </h3>
                    <p className="text-xs text-[#A0ABBA] font-mono mt-0.5">
                      Extracted at video offset {selectedIncident.timestamp_start.toFixed(2)}s &bull; Peak Conf: {(selectedIncident.confidence * 100).toFixed(1)}%
                    </p>
                  </div>

                  <StatusBadge status={selectedIncident.status} size="sm" />
                </div>

                {/* Evidence Image Canvas */}
                <div className="bg-[#12161C] border border-[#3E4651] relative">
                  <img
                    src={getEvidenceSnapshotUrl(selectedIncident.evidence_snapshot_path)}
                    alt={`High-res evidence ${selectedIncident.incident_code}`}
                    className="w-full max-h-[500px] object-contain mx-auto"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="%2312161C"/><text x="50%" y="50%" fill="%23A0ABBA" font-family="monospace" font-size="14" text-anchor="middle">SNAPSHOT FILE NOT FOUND ON DISK</text></svg>';
                    }}
                  />
                  <div className="absolute top-3 left-3 bg-[#191E26]/90 border border-[#3E4651] px-2.5 py-1 text-[11px] font-mono text-[#F8F9FA]">
                    CAMERA: {selectedIncident.camera_id}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-[#191E26]/90 border border-[#3E4651] px-2.5 py-1 text-[11px] font-mono text-[#FFC107]">
                    CLASS: {selectedIncident.accident_class}
                  </div>
                </div>

                {/* Telemetry and Coordinates Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#191E26] border border-[#3E4651] text-xs font-mono">
                  <div>
                    <span className="text-[#A0ABBA] text-[10px] block uppercase">BOUNDING BOX COORDS</span>
                    <span className="text-[#F8F9FA] font-bold">
                      {selectedIncident.evidence_box_json || 'Full Frame ROI'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A0ABBA] text-[10px] block uppercase">TEMPORAL HIT COUNT</span>
                    <span className="text-[#F8F9FA] font-bold">
                      {selectedIncident.hit_count} sampled frames
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A0ABBA] text-[10px] block uppercase">SNAPSHOT DISK PATH</span>
                    <span className="text-[#F8F9FA] truncate block max-w-[150px]">
                      {selectedIncident.evidence_snapshot_path}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A0ABBA] text-[10px] block uppercase">RECORDED AT</span>
                    <span className="text-[#F8F9FA]">
                      {new Date(selectedIncident.detected_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Direct Action Link */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-[#A0ABBA]">
                    Stored locally in <code className="font-mono text-[#F8F9FA]">data/snapshots/</code>
                  </span>
                  <Link
                    to={`/incidents?select=${selectedIncident.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1E88E5] text-white hover:bg-[#1976D2] text-xs font-semibold uppercase tracking-wider transition-none"
                  >
                    <span>Triage Incident in Operations</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
