import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  FileSearch, 
  Send, 
  Clock, 
  Camera, 
  HelpCircle,
  ExternalLink,
  Layers
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import { getIncidents, getIncidentById, updateIncidentStatus, getEvidenceSnapshotUrl } from '../api/incidents';

export default function Incidents({ 
  cameras = [], 
  onRefreshGlobal 
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSelectId = searchParams.get('select');

  // Filters state
  const [filterCamera, setFilterCamera] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMinConf, setFilterMinConf] = useState('');

  // Data state
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected incident details
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Status Change Confirmation Modal
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    incidentId: null,
    targetStatus: null,
    notes: '',
    isSubmitting: false,
    error: null,
  });

  const fetchIncidentList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getIncidents({
        cameraId: filterCamera,
        status: filterStatus,
        minConfidence: filterMinConf ? parseFloat(filterMinConf) / 100 : undefined,
      });
      setIncidents(data);

      // Auto-select if requested via URL or pick first
      if (initialSelectId) {
        const found = data.find(i => String(i.id) === String(initialSelectId));
        if (found) loadDetail(found.id);
        else if (data.length > 0) loadDetail(data[0].id);
      } else if (data.length > 0 && !selectedIncident) {
        loadDetail(data[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch incidents.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDetail = async (id) => {
    setIsLoadingDetail(true);
    try {
      const detail = await getIncidentById(id);
      setSelectedIncident(detail);
    } catch (err) {
      console.error('Error loading incident details:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchIncidentList();
  }, [filterCamera, filterStatus, filterMinConf]);

  const openStatusConfirm = (targetStatus) => {
    if (!selectedIncident) return;
    setStatusModal({
      isOpen: true,
      incidentId: selectedIncident.id,
      targetStatus,
      notes: '',
      isSubmitting: false,
      error: null,
    });
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setStatusModal(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const updated = await updateIncidentStatus(
        statusModal.incidentId,
        statusModal.targetStatus,
        statusModal.notes
      );

      setStatusModal(prev => ({ ...prev, isOpen: false, isSubmitting: false }));
      // Reload details and list
      await loadDetail(statusModal.incidentId);
      await fetchIncidentList();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err) {
      setStatusModal(prev => ({
        ...prev,
        isSubmitting: false,
        error: err.message || 'Failed to update incident status.',
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="border-b border-[#3E4651] pb-6">
        <span className="font-mono text-xs uppercase tracking-widest text-[#1E88E5] block mb-1">
          OPERATIONAL TRIAGE // INCIDENT RECORDS
        </span>
        <h2 className="text-2xl font-bold uppercase tracking-tight text-[#F8F9FA] font-mono">
          Incident Management & Review
        </h2>
        <p className="mt-1 text-xs text-[#A0ABBA]">
          Review computer-vision detected collision candidates, inspect bounding spatial telemetry, and record human verification.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#191E26] p-4 border border-[#3E4651] flex flex-wrap items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#A0ABBA]" />
          <span className="text-[#A0ABBA] uppercase">Camera:</span>
          <select
            value={filterCamera}
            onChange={(e) => setFilterCamera(e.target.value)}
            className="bg-[#2C323B] border border-[#3E4651] p-1.5 text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
          >
            <option value="ALL">ALL CAMERAS</option>
            {cameras.map(c => (
              <option key={c.id} value={c.id}>{c.id}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#A0ABBA] uppercase">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#2C323B] border border-[#3E4651] p-1.5 text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
          >
            <option value="ALL">ALL STATUSES</option>
            <option value="DETECTED">DETECTED (PENDING REVIEW)</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="FALSE_ALARM">FALSE ALARM</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#A0ABBA] uppercase">Min Conf (%):</span>
          <input
            type="number"
            min="0"
            max="100"
            step="5"
            placeholder="e.g. 35"
            value={filterMinConf}
            onChange={(e) => setFilterMinConf(e.target.value)}
            className="w-20 bg-[#2C323B] border border-[#3E4651] p-1.5 text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
          />
        </div>

        <button
          onClick={() => {
            setFilterCamera('ALL');
            setFilterStatus('ALL');
            setFilterMinConf('');
          }}
          className="ml-auto px-3 py-1 bg-[#2C323B] border border-[#3E4651] text-[#A0ABBA] hover:text-[#F8F9FA] transition-none uppercase"
        >
          Reset Filters
        </button>
      </div>

      {/* Main Split Content: List on Left (7 cols), Detail on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Incidents Table */}
        <div className="lg:col-span-7 bg-[#2C323B] border border-[#3E4651]">
          <div className="p-3 bg-[#191E26] border-b border-[#3E4651] text-[11px] font-mono text-[#A0ABBA] grid grid-cols-12 gap-2 uppercase tracking-wider">
            <span className="col-span-3">INCIDENT CODE</span>
            <span className="col-span-3">CLASS / CAMERA</span>
            <span className="col-span-2 text-center">CONFIDENCE</span>
            <span className="col-span-2 text-center">TIME</span>
            <span className="col-span-2 text-right">STATUS</span>
          </div>

          {isLoading ? (
            <div className="p-4">
              <LoadingSkeleton rows={5} />
            </div>
          ) : incidents.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No incidents found"
                description="No incident telemetry matches the applied filters. Try resetting the criteria or analyze a test clip."
                actionLabel="Analyze Test Video"
                onAction={() => window.location.href = '/video-analysis'}
              />
            </div>
          ) : (
            <div className="divide-y divide-[#3E4651]">
              {incidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                return (
                  <div
                    key={inc.id}
                    onClick={() => loadDetail(inc.id)}
                    className={`p-3.5 grid grid-cols-12 gap-2 items-center cursor-pointer transition-none ${
                      isSelected
                        ? 'bg-[#232830] border-l-4 border-l-[#1E88E5]'
                        : 'hover:bg-[#232830] border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="col-span-3 font-mono font-bold text-xs text-[#F8F9FA]">
                      {inc.incident_code}
                    </div>

                    <div className="col-span-3 min-w-0">
                      <div className="text-xs font-semibold text-[#FFC107] capitalize truncate">
                        {inc.accident_class.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10px] font-mono text-[#A0ABBA] truncate mt-0.5">
                        {inc.camera_id}
                      </div>
                    </div>

                    <div className="col-span-2 text-center font-mono text-xs font-bold text-[#F8F9FA]">
                      {(inc.confidence * 100).toFixed(0)}%
                    </div>

                    <div className="col-span-2 text-center font-mono text-[11px] text-[#A0ABBA]">
                      {inc.timestamp_start.toFixed(1)}s
                    </div>

                    <div className="col-span-2 text-right">
                      <StatusBadge status={inc.status} size="xs" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Incident Detail & Operator Action Side Panel */}
        <div className="lg:col-span-5 bg-[#2C323B] border border-[#3E4651] p-5">
          <div className="pb-3 border-b border-[#3E4651] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F8F9FA] font-mono">
              INCIDENT INVESTIGATION DOSSIER
            </span>
            {selectedIncident && (
              <StatusBadge status={selectedIncident.status} size="xs" />
            )}
          </div>

          {isLoadingDetail ? (
            <div className="py-8">
              <LoadingSkeleton rows={4} />
            </div>
          ) : selectedIncident ? (
            <div className="mt-4 space-y-5">
              {/* Heading */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-lg font-bold text-[#F8F9FA]">
                    {selectedIncident.incident_code}
                  </h3>
                  <span className="text-xs font-mono text-[#A0ABBA]">
                    DB ID: #{selectedIncident.id}
                  </span>
                </div>
                <div className="text-xs font-medium text-[#FFC107] capitalize mt-0.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FFC107]" />
                  <span>{selectedIncident.accident_class.replace(/_/g, ' ')}</span>
                  <span className="text-[#3E4651]">&bull;</span>
                  <span className="font-mono text-[#F8F9FA]">
                    Peak Confidence: {(selectedIncident.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Evidence Snapshot Frame */}
              <div className="bg-[#191E26] border border-[#3E4651] overflow-hidden">
                <div className="p-2 border-b border-[#3E4651] flex items-center justify-between text-[11px] font-mono text-[#A0ABBA]">
                  <span>EVIDENCE SNAPSHOT</span>
                  <Link
                    to={`/evidence?incident=${selectedIncident.id}`}
                    className="text-[#1E88E5] hover:underline flex items-center gap-1"
                  >
                    <FileSearch className="w-3 h-3" />
                    <span>HIGH-RES INSPECT</span>
                  </Link>
                </div>

                {selectedIncident.evidence_snapshot_path ? (
                  <img
                    src={getEvidenceSnapshotUrl(selectedIncident.evidence_snapshot_path)}
                    alt={`Evidence ${selectedIncident.incident_code}`}
                    className="w-full h-44 object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="176" viewBox="0 0 320 176"><rect width="320" height="176" fill="%23191E26"/><text x="50%" y="50%" fill="%23A0ABBA" font-family="monospace" font-size="12" text-anchor="middle">IMAGE UNAVAILABLE</text></svg>';
                    }}
                  />
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center p-4 text-center text-[#A0ABBA]">
                    <FileSearch className="w-8 h-8 mb-2 opacity-40" />
                    <span className="text-xs font-mono">NO EVIDENCE SAVED</span>
                  </div>
                )}

                {selectedIncident.evidence_box_json && (
                  <div className="p-2 bg-[#12161C] border-t border-[#3E4651] font-mono text-[10px] text-[#A0ABBA]">
                    BOUNDING BOX [X1, Y1, X2, Y2]: <span className="text-[#F8F9FA]">{selectedIncident.evidence_box_json}</span>
                  </div>
                )}
              </div>

              {/* Telemetry Breakdown */}
              <div className="space-y-2 py-3 border-y border-[#3E4651] text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#A0ABBA]">CAMERA:</span>
                  <span className="text-[#F8F9FA] font-bold">{selectedIncident.camera_id}</span>
                </div>
                {selectedIncident.camera && (
                  <div className="flex justify-between">
                    <span className="text-[#A0ABBA]">LOCATION:</span>
                    <span className="text-[#F8F9FA] text-right font-sans max-w-[200px] truncate">
                      {selectedIncident.camera.location}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#A0ABBA]">VIDEO TIMESTAMP:</span>
                  <span className="text-[#F8F9FA]">
                    {selectedIncident.timestamp_start.toFixed(2)}s - {selectedIncident.timestamp_end.toFixed(2)}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0ABBA]">DURATION:</span>
                  <span className="text-[#F8F9FA]">{selectedIncident.duration_sec.toFixed(2)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0ABBA]">VALIDATED HITS:</span>
                  <span className="text-[#F8F9FA]">{selectedIncident.hit_count} sampled frames</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0ABBA]">SOURCE VIDEO:</span>
                  <span className="text-[#F8F9FA] truncate max-w-[180px]">{selectedIncident.video_source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0ABBA]">DETECTED WALL-CLOCK:</span>
                  <span className="text-[#F8F9FA]">
                    {new Date(selectedIncident.detected_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Operator Action Buttons (Validated per state) */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#A0ABBA] block">
                  OPERATOR ACTION CONTROLS
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => openStatusConfirm('VERIFIED')}
                    disabled={selectedIncident.status === 'VERIFIED'}
                    className="p-2 text-center text-xs font-semibold uppercase tracking-wider bg-[#1E88E5] text-white hover:bg-[#1976D2] disabled:opacity-40 border border-[#1E88E5] transition-none flex flex-col items-center justify-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verify</span>
                  </button>

                  <button
                    onClick={() => openStatusConfirm('FALSE_ALARM')}
                    disabled={selectedIncident.status === 'FALSE_ALARM'}
                    className="p-2 text-center text-xs font-semibold uppercase tracking-wider bg-[#232830] text-[#A0ABBA] hover:text-[#F8F9FA] hover:border-[#505A68] disabled:opacity-40 border border-[#3E4651] transition-none flex flex-col items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>False Alarm</span>
                  </button>

                  <button
                    onClick={() => openStatusConfirm('RESOLVED')}
                    disabled={selectedIncident.status === 'RESOLVED'}
                    className="p-2 text-center text-xs font-semibold uppercase tracking-wider bg-[#00C853] text-[#12161C] hover:bg-[#00B048] disabled:opacity-40 border border-[#00C853] transition-none flex flex-col items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                </div>

                <div className="pt-2">
                  <Link
                    to={`/dispatch-log?incident=${selectedIncident.id}`}
                    className="w-full p-2.5 bg-[#FF6D00] text-white hover:bg-[#E65100] text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 border border-[#FF6D00]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Trigger Simulated Dispatch</span>
                  </Link>
                </div>
              </div>

              {/* Associated Dispatch History */}
              {selectedIncident.dispatch_logs && selectedIncident.dispatch_logs.length > 0 && (
                <div className="pt-3 border-t border-[#3E4651]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#A0ABBA] block mb-2">
                    SIMULATED DISPATCH AUDIT ({selectedIncident.dispatch_logs.length})
                  </span>
                  <div className="space-y-1.5">
                    {selectedIncident.dispatch_logs.map(log => (
                      <div key={log.id} className="p-2 bg-[#191E26] border border-[#3E4651] text-xs font-mono">
                        <div className="flex justify-between text-[#F8F9FA]">
                          <span className="text-[#FF6D00] font-bold">{log.dispatch_type}</span>
                          <span className="text-[10px] text-[#A0ABBA]">
                            {new Date(log.dispatched_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#A0ABBA] mt-0.5">
                          {log.recipient_agency}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-[#A0ABBA]">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-mono">Select an incident from the table to inspect telemetry and triage.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Consequential Status Updates */}
      <Modal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
        title={`Confirm Status Transition: ${statusModal.targetStatus}`}
        subtitle={`Update state for incident ID #${statusModal.incidentId}`}
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          {statusModal.error && (
            <div className="p-3 bg-[#D32F2F]/20 border border-[#D32F2F] text-xs text-[#F8F9FA]">
              {statusModal.error}
            </div>
          )}

          <div className="p-3 bg-[#191E26] border border-[#3E4651] text-xs">
            <span className="text-[#A0ABBA] block mb-1 font-mono uppercase text-[10px]">
              OPERATOR VALIDATION NOTICE
            </span>
            <p className="text-[#F8F9FA] leading-relaxed">
              Transitioning incident status modifies system telemetry and determines downstream response actions. Ensure spatial consistency and bounding evidence have been verified.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
              Operator Log Notes (Optional)
            </label>
            <textarea
              rows="3"
              value={statusModal.notes}
              onChange={(e) => setStatusModal(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Collision visually confirmed via Highway 101 evidence snapshot. Two vehicles involved."
              className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
            />
          </div>

          <div className="pt-3 border-t border-[#3E4651] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
              className="px-3 py-1.5 bg-[#232830] border border-[#3E4651] text-[#A0ABBA] hover:text-[#F8F9FA] text-xs font-mono uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={statusModal.isSubmitting}
              className="px-4 py-1.5 bg-[#1E88E5] text-white hover:bg-[#1976D2] text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
            >
              {statusModal.isSubmitting ? 'Updating...' : `Confirm ${statusModal.targetStatus}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
