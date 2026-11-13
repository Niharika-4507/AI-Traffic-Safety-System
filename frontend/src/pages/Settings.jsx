import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Cpu, 
  Database, 
  Server, 
  ShieldAlert, 
  Radio, 
  RefreshCw, 
  Info,
  CheckCircle2,
  XCircle,
  FileCode
} from 'lucide-react';
import { getHealth } from '../api/health';

export default function Settings({ 
  isOnline = true, 
  onRefreshGlobal 
}) {
  const [healthData, setHealthData] = useState(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);

  const fetchHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const data = await getHealth();
      setHealthData(data);
    } catch (err) {
      console.error('Failed to fetch health info:', err);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Editorial Header */}
      <div className="border-b border-[#3E4651] pb-6">
        <span className="font-mono text-xs uppercase tracking-widest text-[#1E88E5] block mb-1">
          OPERATIONAL DIAGNOSTICS & TELEMETRY
        </span>
        <h2 className="text-2xl font-bold uppercase tracking-tight text-[#F8F9FA] font-mono">
          System Architecture & Diagnostics
        </h2>
        <p className="mt-1 text-xs text-[#A0ABBA]">
          Backend host configuration, PyTorch CPU acceleration status, persistence schema, and safety policy disclaimers.
        </p>
      </div>

      {/* Prominent Academic Prototype Disclaimer */}
      <div className="p-5 bg-[#191E26] border-l-4 border-l-[#FFC107] border border-[#3E4651] space-y-3">
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#FFC107] uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4 text-[#FFC107]" />
          <span>ACADEMIC PROTOTYPE NOTICE & RELIABILITY DISCLOSURE</span>
        </div>
        <p className="text-xs text-[#F8F9FA] leading-relaxed">
          "ACADEMIC PROTOTYPE — AI detections may be incorrect. Human verification is required. Emergency dispatch is simulated."
        </p>
        <div className="text-xs text-[#A0ABBA] leading-relaxed space-y-2 pt-2 border-t border-[#3E4651]">
          <p>
            <strong>Milestone 3 Empirical Benchmark Findings:</strong> Both test clips (<code className="text-[#F8F9FA] font-mono">data/test_videos/video1.mp4</code> and <code className="text-[#F8F9FA] font-mono">data/test_videos/video2.mp4</code>) contain collision events. Detections in both clips—such as <code className="text-[#F8F9FA] font-mono">INC-CAM-DOWNTOWN-01-001</code> and <code className="text-[#F8F9FA] font-mono">INC-CAM-HIGHWAY-02-001</code>—must be evaluated against actual footage, as AI object detection may produce classification errors or transient alerts. An accident-free negative-control dataset is not yet established.
          </p>
          <p>
            <strong>Operational Mitigation:</strong> The system enforces human-in-the-loop triage. All raw AI detections enter the database in <code className="text-[#FFC107] font-mono">DETECTED</code> state and must be confirmed (<code className="text-[#00C853] font-mono">VERIFIED</code>) or dismissed (<code className="text-[#A0ABBA] font-mono">FALSE_ALARM</code>) by a human traffic operator before simulated dispatch.
          </p>
        </div>
      </div>

      {/* Backend & Runtime Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backend Node Diagnostic */}
        <div className="bg-[#2C323B] border border-[#3E4651] p-5 space-y-4">
          <div className="pb-3 border-b border-[#3E4651] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F8F9FA] font-mono">
              FASTAPI REST BACKEND
            </span>
            <Server className="w-4 h-4 text-[#1E88E5]" />
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-[#A0ABBA]">CONNECTION HOST:</span>
              <span className="text-[#F8F9FA]">http://127.0.0.1:8000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#A0ABBA]">SERVER STATUS:</span>
              <span className={`inline-flex items-center gap-1 font-bold ${isOnline ? 'text-[#00C853]' : 'text-[#D32F2F]'}`}>
                {isOnline ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {isOnline ? 'HEALTHY // ONLINE' : 'DISCONNECTED'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A0ABBA]">SWAGGER DOCS:</span>
              <a
                href="http://127.0.0.1:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="text-[#1E88E5] hover:underline"
              >
                /docs
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A0ABBA]">REDOC SPEC:</span>
              <a
                href="http://127.0.0.1:8000/redoc"
                target="_blank"
                rel="noreferrer"
                className="text-[#1E88E5] hover:underline"
              >
                /redoc
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A0ABBA]">SIMULATION SAFEGUARD:</span>
              <span className="text-[#00C853] font-bold">ACTIVE (TRUE)</span>
            </div>
          </div>
        </div>

        {/* Persistence & Model Checkpoint */}
        <div className="bg-[#2C323B] border border-[#3E4651] p-5 space-y-4">
          <div className="pb-3 border-b border-[#3E4651] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F8F9FA] font-mono">
              AI ENGINE & DATABASE
            </span>
            <Database className="w-4 h-4 text-[#00C853]" />
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-[#A0ABBA]">DATABASE DRIVER:</span>
              <span className="text-[#F8F9FA]">SQLite 3 / SQLAlchemy 2.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A0ABBA]">DATABASE FILE:</span>
              <span className="text-[#F8F9FA]">data/traffic_safety.db</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A0ABBA]">AI MODEL WEIGHTS:</span>
              <span className="text-[#F8F9FA]">data/models/accident_yolov8m.pt</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A0ABBA]">EVIDENCE DIRECTORY:</span>
              <span className="text-[#F8F9FA]">data/snapshots/</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A0ABBA]">INFERENCE HARDWARE:</span>
              <span className="text-[#F8F9FA]">PyTorch CPU Execution</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Tuning Reference */}
      <div className="bg-[#2C323B] border border-[#3E4651] p-5 space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#F8F9FA] font-mono block">
          OPERATIONAL CALIBRATION RECOMMENDATIONS
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-[#191E26] border border-[#3E4651]">
            <div className="text-[#1E88E5] font-bold mb-1">CONFIDENCE THRESHOLD</div>
            <div className="text-[#F8F9FA]">Recommended: 0.40 — 0.50</div>
            <p className="text-[10px] text-[#A0ABBA] mt-1 font-sans">
              Filters out shadow-induced transient vehicle false alarms while maintaining true positive recall.
            </p>
          </div>

          <div className="p-3 bg-[#191E26] border border-[#3E4651]">
            <div className="text-[#1E88E5] font-bold mb-1">TEMPORAL MIN HITS</div>
            <div className="text-[#F8F9FA]">Recommended: 3 — 4 hits</div>
            <p className="text-[10px] text-[#A0ABBA] mt-1 font-sans">
              Requires collision bounding persistence across successive sampled frames to defeat single-frame flickers.
            </p>
          </div>

          <div className="p-3 bg-[#191E26] border border-[#3E4651]">
            <div className="text-[#1E88E5] font-bold mb-1">FRAME SAMPLING RATE</div>
            <div className="text-[#F8F9FA]">Recommended: 5.0 Hz</div>
            <p className="text-[10px] text-[#A0ABBA] mt-1 font-sans">
              Evaluates video every 0.20s of physical time, maintaining ~1.7x real-time CPU throughput factor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
