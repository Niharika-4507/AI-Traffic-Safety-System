import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Send, 
  ShieldAlert, 
  Radio, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Filter, 
  FileText,
  Ambulance,
  Shield,
  Flame,
  Car
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import { createSimulatedDispatch } from '../api/dispatch';

const DISPATCH_SERVICES = [
  { type: 'AMBULANCE', label: 'Emergency Medical Services (EMS)', icon: Ambulance, defaultAgency: 'Metro Trauma EMS Unit 4' },
  { type: 'POLICE', label: 'Highway Patrol / Traffic Police', icon: Shield, defaultAgency: 'State Highway Patrol Sector 9' },
  { type: 'FIRE_RESCUE', label: 'Heavy Rescue & Fire Suppression', icon: Flame, defaultAgency: 'Municipal Fire & Rescue Squad 12' },
  { type: 'TRAFFIC_CONTROL', label: 'DOT Traffic Management & Towing', icon: Car, defaultAgency: 'Regional DOT Incident Response Team' },
];

export default function DispatchLog({ 
  incidents = [], 
  dispatchLogs = [], 
  isLoading = false, 
  onRefreshGlobal 
}) {
  const [searchParams] = useSearchParams();
  const queryIncidentId = searchParams.get('incident');

  // Form State
  const [targetIncidentId, setTargetIncidentId] = useState(queryIncidentId || (incidents[0]?.id ? String(incidents[0].id) : ''));
  const [dispatchType, setDispatchType] = useState('AMBULANCE');
  const [recipientAgency, setRecipientAgency] = useState('Metro Trauma EMS Unit 4');
  const [dispatchNotes, setDispatchNotes] = useState('');

  // Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  const selectedIncident = incidents.find(i => String(i.id) === String(targetIncidentId));

  const handleServiceSelect = (service) => {
    setDispatchType(service.type);
    setRecipientAgency(service.defaultAgency);
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!targetIncidentId) {
      setSubmitError('Please select a target incident to dispatch.');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await createSimulatedDispatch({
        incident_id: parseInt(targetIncidentId, 10),
        dispatch_type: dispatchType,
        recipient_agency: recipientAgency.trim() || 'Simulated Emergency Center',
        notes: dispatchNotes.trim() || undefined,
      });

      setSubmitSuccess(`Simulated dispatch #${res.id} successfully recorded for incident #${res.incident_id}.`);
      setIsConfirmModalOpen(false);
      if (onRefreshGlobal) onRefreshGlobal();
      setDispatchNotes('');
    } catch (err) {
      setSubmitError(err.message || 'Failed to record simulated dispatch.');
      setIsConfirmModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="border-b border-[#3E4651] pb-6">
        <span className="font-mono text-xs uppercase tracking-widest text-[#FF6D00] block mb-1">
          RAPID RESPONSE // SIMULATED INCIDENT ESCALATION
        </span>
        <h2 className="text-2xl font-bold uppercase tracking-tight text-[#F8F9FA] font-mono">
          Simulated Emergency Dispatch
        </h2>
        <p className="mt-1 text-xs text-[#A0ABBA]">
          Audit log and simulated dispatch execution for verified roadway collisions. All notification triggers execute in containment.
        </p>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-4 bg-[#191E26] border-l-4 border-l-[#FFC107] border border-[#3E4651] flex items-start gap-3 text-xs">
        <ShieldAlert className="w-5 h-5 text-[#FFC107] shrink-0 mt-0.5" />
        <div>
          <span className="font-mono font-bold uppercase tracking-wider text-[#FFC107] block mb-0.5">
            CONTAINMENT SAFETY POLICY ENFORCED
          </span>
          <p className="text-[#A0ABBA] leading-relaxed">
            Emergency response actions are strictly simulated. No external networks, real-world 911 centers, SMS gateways, or public safety CAD systems are accessed.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 cols): Trigger Dispatch Form */}
        <div className="lg:col-span-5 bg-[#2C323B] border border-[#3E4651] p-5">
          <div className="pb-3 border-b border-[#3E4651] mb-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F8F9FA] font-mono">
              INITIATE SIMULATED DISPATCH
            </span>
            <Send className="w-4 h-4 text-[#FF6D00]" />
          </div>

          {submitError && (
            <div className="p-3 mb-4 bg-[#D32F2F]/20 border border-[#D32F2F] text-xs text-[#F8F9FA]">
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="p-3 mb-4 bg-[#00C853]/20 border border-[#00C853] text-xs text-[#F8F9FA] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00C853]" />
              <span>{submitSuccess}</span>
            </div>
          )}

          <form onSubmit={handleOpenConfirm} className="space-y-4">
            {/* Target Incident Selection */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
                Target Incident *
              </label>
              {incidents.length === 0 ? (
                <div className="p-2 text-xs font-mono text-[#A0ABBA] bg-[#191E26] border border-[#3E4651]">
                  No incidents recorded in database. Ingest video first.
                </div>
              ) : (
                <select
                  value={targetIncidentId}
                  onChange={(e) => setTargetIncidentId(e.target.value)}
                  className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs font-mono text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
                >
                  {incidents.map(inc => (
                    <option key={inc.id} value={inc.id}>
                      {inc.incident_code} — {inc.accident_class} ({inc.camera_id}, Status: {inc.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected Incident Telemetry Summary */}
            {selectedIncident && (
              <div className="p-3 bg-[#191E26] border border-[#3E4651] text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#A0ABBA]">CURRENT STATUS:</span>
                  <StatusBadge status={selectedIncident.status} size="xs" />
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0ABBA]">CONFIDENCE:</span>
                  <span className="text-[#F8F9FA]">{(selectedIncident.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0ABBA]">CAMERA:</span>
                  <span className="text-[#F8F9FA]">{selectedIncident.camera_id}</span>
                </div>
              </div>
            )}

            {/* Service Type Selection */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1.5">
                Dispatch Service Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DISPATCH_SERVICES.map(svc => {
                  const Icon = svc.icon;
                  const isSelected = dispatchType === svc.type;
                  return (
                    <button
                      key={svc.type}
                      type="button"
                      onClick={() => handleServiceSelect(svc)}
                      className={`p-2.5 text-left text-xs font-mono border transition-none flex items-center gap-2 ${
                        isSelected
                          ? 'bg-[#191E26] border-[#FF6D00] text-[#F8F9FA]'
                          : 'bg-[#232830] border-[#3E4651] text-[#A0ABBA] hover:text-[#F8F9FA]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#FF6D00]' : 'text-[#A0ABBA]'}`} />
                      <span className="font-bold text-[11px]">{svc.type}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Agency */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
                Recipient Agency (Simulated Destination) *
              </label>
              <input
                type="text"
                required
                value={recipientAgency}
                onChange={(e) => setRecipientAgency(e.target.value)}
                placeholder="e.g. Metro Trauma EMS Unit 4"
                className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs font-mono text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
              />
            </div>

            {/* Operator Notes */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
                Dispatch Instructions / Operator Notes
              </label>
              <textarea
                rows="2"
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="e.g. Multi-vehicle incident detected on Highway 101. Requesting priority ambulance staging."
                className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
              />
            </div>

            {/* Submit CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={incidents.length === 0}
                className="w-full p-2.5 bg-[#FF6D00] text-white hover:bg-[#E65100] text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 border border-[#FF6D00] disabled:opacity-50 transition-none"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Simulated Dispatch</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (7 cols): Real Dispatch Audit Trail */}
        <div className="lg:col-span-7 bg-[#2C323B] border border-[#3E4651]">
          <div className="p-4 bg-[#191E26] border-b border-[#3E4651] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F8F9FA] font-mono">
              SIMULATED DISPATCH AUDIT LOG
            </span>
            <span className="text-xs font-mono text-[#A0ABBA]">
              {dispatchLogs.length} LOGGED ACTIONS
            </span>
          </div>

          {isLoading ? (
            <div className="p-4">
              <LoadingSkeleton rows={4} />
            </div>
          ) : dispatchLogs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No Dispatch Events Logged"
                description="No simulated emergency response events have been executed yet. Select an incident from the left pane to simulate a dispatch."
              />
            </div>
          ) : (
            <div className="divide-y divide-[#3E4651]">
              {dispatchLogs.map((log) => (
                <div key={log.id} className="p-4 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#FF6D00]">{log.dispatch_type}</span>
                      <span className="text-[#3E4651]">|</span>
                      <span className="text-[#F8F9FA]">INCIDENT ID #{log.incident_id}</span>
                    </div>

                    <StatusBadge status="SIMULATED_SUCCESS" size="xs" />
                  </div>

                  <div className="text-[#A0ABBA] text-[11px]">
                    RECIPIENT: <strong className="text-[#F8F9FA]">{log.recipient_agency}</strong>
                  </div>

                  {log.notes && (
                    <div className="p-2 bg-[#191E26] border border-[#3E4651] text-[#A0ABBA] text-[11px] font-sans">
                      "{log.notes}"
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-[#A0ABBA] pt-1">
                    <span>DISPATCH LOG #{log.id}</span>
                    <span>TIMESTAMP: {new Date(log.dispatched_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Simulated Emergency Dispatch"
        subtitle="Review mock response parameters prior to execution."
      >
        <div className="space-y-4">
          <div className="p-3 bg-[#191E26] border border-[#3E4651] text-xs font-mono space-y-2">
            <div>TARGET INCIDENT: <strong className="text-[#F8F9FA]">{selectedIncident?.incident_code}</strong></div>
            <div>DISPATCH SERVICE: <strong className="text-[#FF6D00]">{dispatchType}</strong></div>
            <div>RECIPIENT: <strong className="text-[#F8F9FA]">{recipientAgency}</strong></div>
            {dispatchNotes && <div>NOTES: <span className="text-[#A0ABBA] font-sans">"{dispatchNotes}"</span></div>}
          </div>

          <div className="p-3 bg-[#FFC107]/10 border border-[#FFC107] text-xs text-[#FFC107] leading-relaxed">
            Safety Reminder: This action records a simulated event into the local database and will transition the incident status to DISPATCHED. No real-world 911 units are deployed.
          </div>

          <div className="pt-3 border-t border-[#3E4651] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(false)}
              className="px-3 py-1.5 bg-[#232830] border border-[#3E4651] text-[#A0ABBA] hover:text-[#F8F9FA] text-xs font-mono uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#FF6D00] text-white hover:bg-[#E65100] text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Simulation Dispatch'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
