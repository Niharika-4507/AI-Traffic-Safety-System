import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Play, 
  Cpu, 
  Clock, 
  Gauge, 
  AlertTriangle, 
  CheckCircle2, 
  FileSearch, 
  Layers, 
  ArrowRight,
  Info
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { processVideo } from '../api/video';

const SAMPLE_CLIPS = [
  {
    path: 'data/test_videos/video2.mp4',
    label: 'Clip 2: Highway 101 Collision Footage (Positive Incident)',
    defaultCamera: 'CAM-HIGHWAY-02',
    description: 'Multi-vehicle collision on highway corridor with physical vehicle impact.',
  },
  {
    path: 'data/test_videos/video1.mp4',
    label: 'Clip 1: Downtown Intersection Accident Footage',
    defaultCamera: 'CAM-DOWNTOWN-01',
    description: 'Urban intersection scenario containing a road collision incident.',
  },
  {
    path: 'data/test_videos/normal_traffic.mp4',
    label: 'Clip 3: Normal Traffic Footage (Accident-Free Control)',
    defaultCamera: 'CAM-NORTH-03',
    description: 'Accident-free traffic footage for negative-control verification.',
  },
];

export default function VideoAnalysis({ 
  cameras = [], 
  onRefreshGlobal 
}) {
  const [videoPath, setVideoPath] = useState(SAMPLE_CLIPS[0].path);
  const [cameraId, setCameraId] = useState(SAMPLE_CLIPS[0].defaultCamera);
  const [sampleFps, setSampleFps] = useState('5.0');
  const [confThreshold, setConfThreshold] = useState('0.35');
  const [temporalMinHits, setTemporalMinHits] = useState('2');
  const [temporalWindowSec, setTemporalWindowSec] = useState('1.5');
  const [saveAnnotatedVideo, setSaveAnnotatedVideo] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSelectSample = (clip) => {
    setVideoPath(clip.path);
    setCameraId(clip.defaultCamera);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!videoPath.trim()) {
      setError('Video file path is required.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await processVideo({
        video_path: videoPath.trim(),
        camera_id: cameraId.trim() || 'CAM-01',
        sample_fps: parseFloat(sampleFps),
        conf_threshold: parseFloat(confThreshold),
        temporal_min_hits: parseInt(temporalMinHits, 10),
        temporal_window_sec: parseFloat(temporalWindowSec),
        save_annotated_video: saveAnnotatedVideo,
      });

      setResult(res);
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err) {
      setError(err.message || 'Video processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="border-b border-[#3E4651] pb-6">
        <span className="font-mono text-xs uppercase tracking-widest text-[#1E88E5] block mb-1">
          COMPUTER VISION INGESTION PIPELINE
        </span>
        <h2 className="text-2xl font-bold uppercase tracking-tight text-[#F8F9FA] font-mono">
          AI Video Analysis & Incident Detection
        </h2>
        <p className="mt-1 text-xs text-[#A0ABBA]">
          Process video recordings through YOLOv8 accident taxonomy classification, frame-sampling temporal persistence validation, and automated SQLite persistence.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 cols): Parameter Configuration Form */}
        <div className="lg:col-span-5 bg-[#2C323B] border border-[#3E4651] p-5">
          <div className="pb-3 border-b border-[#3E4651] mb-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F8F9FA] font-mono">
              PIPELINE EXECUTION PARAMETERS
            </span>
            <Cpu className="w-4 h-4 text-[#1E88E5]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Clip Selector */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1.5">
                Preset Test Clip Selection
              </label>
              <div className="space-y-1.5">
                {SAMPLE_CLIPS.map(clip => (
                  <button
                    key={clip.path}
                    type="button"
                    onClick={() => handleSelectSample(clip)}
                    className={`w-full text-left p-2.5 text-xs font-mono border transition-none ${
                      videoPath === clip.path
                        ? 'bg-[#191E26] border-[#1E88E5] text-[#F8F9FA]'
                        : 'bg-[#232830] border-[#3E4651] text-[#A0ABBA] hover:text-[#F8F9FA]'
                    }`}
                  >
                    <div className="font-bold">{clip.label}</div>
                    <div className="text-[10px] text-[#A0ABBA] mt-0.5">{clip.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Video File Path */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
                Video Path (Local File System) *
              </label>
              <input
                type="text"
                required
                value={videoPath}
                onChange={(e) => setVideoPath(e.target.value)}
                placeholder="e.g. data/test_videos/video2.mp4"
                className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs font-mono text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
              />
              <span className="text-[10px] text-[#A0ABBA] mt-1 block">
                Relative to project root or absolute path on host.
              </span>
            </div>

            {/* Camera ID selection */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
                Target Camera Sensor ID *
              </label>
              <select
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs font-mono text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
              >
                {cameras.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.id} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Detection & Sampling Parameters */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#3E4651]">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
                  Sample Rate (Hz)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="30"
                  value={sampleFps}
                  onChange={(e) => setSampleFps(e.target.value)}
                  className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs font-mono text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
                  Confidence Threshold
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="1.0"
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(e.target.value)}
                  className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs font-mono text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
                  Temporal Min Hits
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={temporalMinHits}
                  onChange={(e) => setTemporalMinHits(e.target.value)}
                  className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs font-mono text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A0ABBA] mb-1">
                  Window Length (s)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="5.0"
                  value={temporalWindowSec}
                  onChange={(e) => setTemporalWindowSec(e.target.value)}
                  className="w-full bg-[#191E26] border border-[#3E4651] p-2 text-xs font-mono text-[#F8F9FA] focus:outline-none focus:border-[#1E88E5]"
                />
              </div>
            </div>

            {/* Run Button */}
            <div className="pt-3 border-t border-[#3E4651]">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full p-2.5 bg-[#1E88E5] text-white hover:bg-[#1976D2] text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 border border-[#1E88E5] disabled:opacity-50 transition-none"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isProcessing ? 'Processing Video (CPU Inference)...' : 'Execute AI Pipeline'}</span>
              </button>
            </div>
          </form>

          {/* Educational notice */}
          <div className="mt-4 p-3 bg-[#191E26] border border-[#3E4651] flex items-start gap-2 text-[11px] text-[#A0ABBA]">
            <Info className="w-4 h-4 text-[#1E88E5] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Deduplication Safeguard: If the selected video clip has already been analyzed for this camera, the engine prevents duplicate row insertion and updates peak confidence in place.
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Execution Benchmark & Result Inspection */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="p-4 bg-[#D32F2F]/20 border border-[#D32F2F] text-xs text-[#F8F9FA]">
              <div className="font-mono font-bold uppercase mb-1">Processing Error:</div>
              <div>{error}</div>
            </div>
          )}

          {isProcessing && (
            <div className="p-8 bg-[#2C323B] border border-[#3E4651] text-center space-y-4">
              <div className="w-10 h-10 border-2 border-[#1E88E5] border-t-transparent animate-spin mx-auto" />
              <div>
                <h4 className="font-mono text-sm font-bold uppercase text-[#F8F9FA]">
                  Ingesting Video & Running Temporal Validator
                </h4>
                <p className="text-xs text-[#A0ABBA] mt-1 max-w-md mx-auto leading-relaxed">
                  PyTorch CPU inference is sampling frames at {sampleFps} Hz. Processing typically takes 10 to 20 seconds depending on video length.
                </p>
              </div>
            </div>
          )}

          {result ? (
            <div className="space-y-6">
              {/* Benchmark Summary Bar */}
              <div className="bg-[#2C323B] border border-[#3E4651] p-5">
                <div className="pb-3 border-b border-[#3E4651] flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F8F9FA] font-mono">
                    PIPELINE EXECUTION TELEMETRY
                  </span>
                  <span className="text-xs font-mono text-[#00C853] font-bold">
                    COMPLETED SUCCESSFULLY
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="p-3 bg-[#191E26] border border-[#3E4651]">
                    <span className="text-[#A0ABBA] text-[10px] block uppercase">SPEED FACTOR</span>
                    <span className="text-lg font-bold text-[#00C853]">
                      {result.benchmark.effective_video_speed_factor}x
                    </span>
                    <span className="text-[10px] text-[#A0ABBA] block">Real-time</span>
                  </div>

                  <div className="p-3 bg-[#191E26] border border-[#3E4651]">
                    <span className="text-[#A0ABBA] text-[10px] block uppercase">AVG CPU INFERENCE</span>
                    <span className="text-lg font-bold text-[#F8F9FA]">
                      {result.benchmark.avg_inference_latency_ms} ms
                    </span>
                    <span className="text-[10px] text-[#A0ABBA] block">per sampled frame</span>
                  </div>

                  <div className="p-3 bg-[#191E26] border border-[#3E4651]">
                    <span className="text-[#A0ABBA] text-[10px] block uppercase">SAMPLED FRAMES</span>
                    <span className="text-lg font-bold text-[#F8F9FA]">
                      {result.benchmark.sampled_frames}
                    </span>
                    <span className="text-[10px] text-[#A0ABBA] block">of {result.benchmark.total_frames} total</span>
                  </div>

                  <div className="p-3 bg-[#191E26] border border-[#3E4651]">
                    <span className="text-[#A0ABBA] text-[10px] block uppercase">INCIDENTS FOUND</span>
                    <span className="text-lg font-bold text-[#FFC107]">
                      {result.incidents_found}
                    </span>
                    <span className="text-[10px] text-[#A0ABBA] block">
                      {result.new_incidents_created} new / {result.duplicates_prevented} dedup
                    </span>
                  </div>
                </div>
              </div>

              {/* Detected Incidents List */}
              <div className="bg-[#2C323B] border border-[#3E4651] p-5">
                <div className="pb-3 border-b border-[#3E4651] flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F8F9FA] font-mono">
                    CONFIRMED INCIDENT RECORDS ({result.incidents.length})
                  </span>
                  <Link
                    to="/incidents"
                    className="text-xs font-mono text-[#1E88E5] hover:underline"
                  >
                    GO TO INCIDENTS
                  </Link>
                </div>

                {result.incidents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#A0ABBA] font-mono bg-[#191E26] border border-[#3E4651]">
                    No incident candidates satisfied the configured temporal validation criteria.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {result.incidents.map((inc) => (
                      <div
                        key={inc.id}
                        className="p-4 bg-[#191E26] border border-[#3E4651] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#F8F9FA]">
                              {inc.incident_code}
                            </span>
                            <StatusBadge status={inc.status} size="xs" />
                          </div>
                          <span className="font-mono text-xs text-[#FFC107] font-semibold">
                            {(inc.confidence * 100).toFixed(1)}% Confidence
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs font-mono text-[#A0ABBA]">
                          <div>
                            CLASS: <strong className="text-[#F8F9FA] capitalize">{inc.accident_class.replace(/_/g, ' ')}</strong>
                          </div>
                          <div>
                            TIME: <strong className="text-[#F8F9FA]">{inc.timestamp_start.toFixed(1)}s - {inc.timestamp_end.toFixed(1)}s</strong>
                          </div>
                          <div>
                            HITS: <strong className="text-[#F8F9FA]">{inc.hit_count} frames</strong>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#3E4651] flex items-center justify-end gap-2 text-xs font-mono">
                          <Link
                            to={`/incidents?select=${inc.id}`}
                            className="px-3 py-1 bg-[#2C323B] hover:bg-[#232830] border border-[#3E4651] text-[#F8F9FA] uppercase flex items-center gap-1"
                          >
                            <span>Review Incident</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                          {inc.evidence_snapshot_path && (
                            <Link
                              to={`/evidence?incident=${inc.id}`}
                              className="px-3 py-1 bg-[#1E88E5] text-white hover:bg-[#1976D2] uppercase flex items-center gap-1"
                            >
                              <FileSearch className="w-3 h-3" />
                              <span>Inspect Snapshot</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : !isProcessing && (
            <div className="bg-[#2C323B] border border-[#3E4651] p-10 text-center text-[#A0ABBA]">
              <Cpu className="w-10 h-10 mx-auto mb-3 opacity-30 text-[#1E88E5]" />
              <h4 className="font-mono text-sm font-bold text-[#F8F9FA] uppercase mb-1">
                Awaiting Execution
              </h4>
              <p className="text-xs max-w-sm mx-auto leading-relaxed">
                Select a video clip from the left pane and click "Execute AI Pipeline" to stream telemetry and detect road hazards.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
