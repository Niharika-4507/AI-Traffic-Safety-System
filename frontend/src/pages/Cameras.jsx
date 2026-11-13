import React, { useState } from 'react';
import { Camera, Plus, Filter, MapPin, Video, AlertTriangle, Radio, Check, X } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import { registerCamera } from '../api/cameras';

export default function Cameras({ 
  cameras = [], 
  isLoading = false, 
  onRefresh 
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    location: '',
    latitude: '',
    longitude: '',
    status: 'ACTIVE',
    feed_url: 'data/test_videos/video2.mp4',
  });

  const filteredCameras = cameras.filter(cam => {
    if (statusFilter === 'ALL') return true;
    return cam.status === statusFilter;
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.id.trim() || !formData.name.trim() || !formData.location.trim()) {
      setFormError('Camera ID, Name, and Location are required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: formData.id.trim(),
        name: formData.name.trim(),
        location: formData.location.trim(),
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        status: formData.status,
        feed_url: formData.feed_url.trim() || null,
      };

      const newCam = await registerCamera(payload);
      setFormSuccess(`Camera ${newCam.id} registered successfully.`);
      if (onRefresh) onRefresh();
      setTimeout(() => {
        setIsRegisterModalOpen(false);
        setFormSuccess(null);
        setFormData({
          id: '',
          name: '',
          location: '',
          latitude: '',
          longitude: '',
          status: 'ACTIVE',
          feed_url: 'data/test_videos/video2.mp4',
        });
      }, 1000);
    } catch (err) {
      setFormError(err.message || 'Failed to register camera.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="border-b border-[#3E4651] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#1E88E5] block mb-1">
            SENSOR TELEMETRY & FEED INGESTION
          </span>
          <h2 className="text-2xl font-bold uppercase tracking-tight text-[#F8F9FA] font-mono">
            Traffic Camera Network
          </h2>
          <p className="mt-1 text-xs text-[#A0ABBA]">
            Configured roadway optical sensors, mapped physical locations, and attributed incident logs.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setFormSuccess(null);
            setIsRegisterModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider bg-[#1E88E5] text-white hover:bg-[#1976D2] border border-[#1E88E5] transition-none"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Camera</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#191E26] p-3 border border-[#3E4651]">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#A0ABBA]" />
          <span className="text-[11px] font-mono uppercase text-[#A0ABBA]">Filter Status:</span>
          {['ALL', 'ACTIVE', 'INACTIVE', 'MAINTENANCE'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider transition-none ${
                statusFilter === status
                  ? 'bg-[#2C323B] text-[#F8F9FA] border border-[#1E88E5]'
                  : 'text-[#A0ABBA] hover:text-[#F8F9FA] border border-transparent'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="text-[11px] font-mono text-[#A0ABBA]">
          SHOWING: <strong className="text-[#F8F9FA]">{filteredCameras.length}</strong> OF {cameras.length} CAMERAS
        </div>
      </div>

      {/* Structured Camera List (Asymmetric Split View) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List Table (7 cols) */}
        <div className="lg:col-span-7 bg-[#2C323B] border border-[#3E4651]">
          <div className="p-3 bg-[#191E26] border-b border-[#3E4651] text-[11px] font-mono text-[#A0ABBA] grid grid-cols-12 gap-2 uppercase tracking-wider">
            <span className="col-span-3">CAMERA ID</span>
            <span className="col-span-4">LABEL / LOCATION</span>
            <span className="col-span-3">STATUS</span>
            <span className="col-span-2 text-right">INCIDENTS</span>
          </div>

          {isLoading && cameras.length === 0 ? (
            <div className="p-4">
              <LoadingSkeleton rows={4} />
            </div>
          ) : filteredCameras.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No cameras found"
                description={`No camera nodes found matching status filter '${statusFilter}'.`}
                actionLabel="Reset Filter"
                onAction={() => setStatusFilter('ALL')}
              />
            </div>
          ) : (
            <div className="divide-y divide-[#3E4651]">
              {filteredCameras.map((cam) => {
                const isSelected = selectedCamera?.id === cam.id;
                return (
                  <div
                    key={cam.id}
                    onClick={() => setSelectedCamera(cam)}
                    className={`p-3.5 grid grid-cols-12 gap-2 items-center cursor-pointer transition-none ${
                      isSelected
                        ? 'bg-[#232830] border-l-4 border-l-[#1E88E5]'
                        : 'hover:bg-[#232830] border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="col-span-3 font-mono font-bold text-xs text-[#F8F9FA]">
                      {cam.id}
                    </div>

                    <div className="col-span-4 min-w-0">
                      <div className="text-xs font-medium text-[#F8F9FA] truncate">{cam.name}</div>
                      <div className="text-[10px] text-[#A0ABBA] truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span>{cam.location}</span>
                      </div>
                    </div>

                    <div className="col-span-3">
                      <StatusBadge status={cam.status} size="xs" />
                    </div>

                    <div className="col-span-2 text-right font-mono text-xs font-bold text-[#F8F9FA]">
                      {cam.incidents_count || 0}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Camera Detail Pane (5 cols) */}
        <div className="lg:col-span-5 bg-[#2C323B] border border-[#3E4651] p-5">
          <div className="pb-3 border-b border-[#3E4651] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F8F9FA] font-mono">
              CAMERA TELEMETRY DETAIL
            </span>
            {selectedCamera && (
              <StatusBadge status={selectedCamera.status} size="xs" />
            )}
          </div>

          {selectedCamera ? (
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-mono text-lg font-bold text-[#F8F9FA]">
                  {selectedCamera.id}
                </h3>
                <p className="text-xs text-[#A0ABBA] mt-0.5">
                  {selectedCamera.name}
                </p>
              </div>

              <div className="space-y-3 py-3 border-y border-[#3E4651] text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#A0ABBA]">PHYSICAL LOCATION:</span>
                  <span className="text-[#F8F9FA] text-right font-sans font-medium max-w-[200px]">
                    {selectedCamera.location}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0ABBA]">GPS COORDINATES:</span>
                  <span className="text-[#F8F9FA]">
                    {selectedCamera.latitude && selectedCamera.longitude
                      ? `${selectedCamera.latitude.toFixed(4)}, ${selectedCamera.longitude.toFixed(4)}`
                      : 'NOT CONFIGURED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0ABBA]">TOTAL INCIDENTS LOGGED:</span>
                  <span className="text-[#F8F9FA] font-bold">
                    {selectedCamera.incidents_count || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0ABBA]">REGISTERED AT:</span>
                  <span className="text-[#F8F9FA]">
                    {new Date(selectedCamera.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Feed classification notice */}
              <div className="p-3 bg-[#191E26] border border-[#3E4651]">
                <div className="flex items-center gap-1.5 text-xs text-[#1E88E5] font-mono font-semibold uppercase mb-1">
                  <Video className="w-3.5 h-3.5" />
                  <span>Configured Video Source</span>
                </div>
                <div className="text-[11px] font-mono text-[#F8F9FA] break-all">
                  {selectedCamera.feed_url || 'No default video source assigned'}
                </div>
                <div className="text-[10px] text-[#A0ABBA] mt-2 leading-relaxed">
                  Notice: Static test clips are used for repeatable academic evaluation. Genuine live RTSP streams will be designated LIVE when streaming infrastructure is engaged.
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-[#A0ABBA]">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-mono">Select a camera from the list to view telemetry and assigned feeds.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Camera Registration */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register Traffic Camera Sensor"
        subtitle="Provision a new roadway camera identifier and geographic coordinate metadata."
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-[#D32F2F]/20 border border-[#D32F2F] text-xs text-[#F8F9FA]">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="p-3 bg-[#00C853]/20 border border-[#00C853] text-xs text-[#F8F9FA] flex items-center gap-2">
              <Check className="w-4 h-4 text-[#00C853]" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
                Camera ID *
              </label>
              <input
                type="text"
                name="id"
                required
                value={formData.id}
                onChange={handleInputChange}
                placeholder="e.g. CAM-EAST-04"
                className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs font-mono text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs font-mono text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
              Camera Display Name *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g. East Expressway Interchange 8"
              className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
              Physical Location / Intersection *
            </label>
            <input
              type="text"
              name="location"
              required
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g. East Expressway & 8th Avenue Flyover"
              className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
                Latitude (Optional)
              </label>
              <input
                type="number"
                step="any"
                name="latitude"
                value={formData.latitude}
                onChange={handleInputChange}
                placeholder="37.7749"
                className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs font-mono text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
                Longitude (Optional)
              </label>
              <input
                type="number"
                step="any"
                name="longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                placeholder="-122.4194"
                className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs font-mono text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
              Assigned Video Feed / Test Clip Path
            </label>
            <input
              type="text"
              name="feed_url"
              value={formData.feed_url}
              onChange={handleInputChange}
              placeholder="data/test_videos/video2.mp4"
              className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs font-mono text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
            />
          </div>

          <div className="pt-3 border-t border-[#3E4651] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="px-3 py-1.5 bg-[#232830] border border-[#3E4651] text-[#A0ABBA] hover:text-[#F8F9FA] text-xs font-mono uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#1E88E5] text-white hover:bg-[#1976D2] text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Save Camera'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
