"use client";

import React, { useState } from "react";
import {
  Cpu,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Download,
  AlertTriangle,
  FileCode,
  X,
  Play,
  Terminal,
} from "lucide-react";

interface BuildRecord {
  id: number;
  appName: string;
  appPackage: string;
  tenantName: string;
  platform: "Android APK" | "Google Play AAB" | "Apple iOS IPA";
  versionName: string;
  versionCode: number;
  status: "Ready" | "Building" | "Queued" | "Failed";
  startedAt: string;
  finishedAt: string;
  duration: string;
  artifactSize?: string;
  errorMessage?: string;
}

const BUILDS_DATA: BuildRecord[] = [
  {
    id: 104,
    appName: "Sanskriti Luxe App",
    appPackage: "com.sanskriti.store",
    tenantName: "Sanskriti Store Global",
    platform: "Android APK",
    versionName: "1.0.4",
    versionCode: 4,
    status: "Failed",
    startedAt: "Nov 19, 2026 01:10 PM",
    finishedAt: "Nov 19, 2026 01:12 PM",
    duration: "2m 14s",
    errorMessage: "Execution failed for task ':app:validateSigningRelease'. Keystore signature alias does not match current tenant profile credentials.",
  },
  {
    id: 103,
    appName: "Fashion Hub Mobile",
    appPackage: "com.fashionhub.app",
    tenantName: "Fashion Hub India",
    platform: "Google Play AAB",
    versionName: "1.0.5",
    versionCode: 5,
    status: "Ready",
    startedAt: "Nov 18, 2026 04:30 PM",
    finishedAt: "Nov 18, 2026 04:36 PM",
    duration: "5m 48s",
    artifactSize: "34.2 MB",
  },
  {
    id: 102,
    appName: "Fashion Hub Mobile",
    appPackage: "com.fashionhub.app",
    tenantName: "Fashion Hub India",
    platform: "Android APK",
    versionName: "1.0.5",
    versionCode: 5,
    status: "Ready",
    startedAt: "Nov 18, 2026 04:15 PM",
    finishedAt: "Nov 18, 2026 04:20 PM",
    duration: "4m 52s",
    artifactSize: "42.8 MB",
  },
  {
    id: 101,
    appName: "Vintage Denim Store",
    appPackage: "com.vintagedenim.mobile",
    tenantName: "Malhotra Luxury Silks",
    platform: "Android APK",
    versionName: "1.0.1",
    versionCode: 2,
    status: "Ready",
    startedAt: "Nov 16, 2026 10:00 AM",
    finishedAt: "Nov 16, 2026 10:05 AM",
    duration: "5m 10s",
    artifactSize: "38.1 MB",
  },
];

export function AdminBuilds() {
  const [builds, setBuilds] = useState<BuildRecord[]>(BUILDS_DATA);
  const [selectedError, setSelectedError] = useState<BuildRecord | null>(null);

  const retryBuild = (id: number) => {
    setBuilds(
      builds.map((b) => (b.id === id ? { ...b, status: "Building", errorMessage: undefined } : b))
    );
    setTimeout(() => {
      setBuilds(
        builds.map((b) =>
          b.id === id
            ? { ...b, status: "Ready", artifactSize: "41.5 MB", duration: "4m 10s" }
            : b
        )
      );
      alert(`Build #${id} re-queued and completed successfully!`);
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Builds
          </h1>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Builds</span>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">1,428</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Success Rate</span>
          <div className="text-xl font-black text-emerald-700 mt-1 font-mono">99.2%</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Avg Duration</span>
          <div className="text-xl font-black text-indigo-700 mt-1 font-mono">4m 32s</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Failed Builds</span>
          <div className="text-xl font-black text-rose-700 mt-1 font-mono">
            {builds.filter((b) => b.status === "Failed").length}
          </div>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-900">
            Build Queue & Artifact Vault
          </h3>
          <span className="text-xs font-bold text-slate-500">Live Status</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Build ID</th>
                <th className="px-6 py-3.5">Application</th>
                <th className="px-6 py-3.5">Platform Target</th>
                <th className="px-6 py-3.5">Version & Code</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">Artifact Size</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {builds.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs">
                    #{b.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{b.appName}</div>
                    <div className="text-xs text-slate-500 font-mono">{b.appPackage}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {b.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-700">
                    v{b.versionName} ({b.versionCode})
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        b.status === "Ready"
                          ? "bg-emerald-100 text-emerald-800"
                          : b.status === "Building"
                          ? "bg-indigo-100 text-indigo-800 animate-pulse"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">
                    {b.duration}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-700 font-semibold">
                    {b.artifactSize || "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {b.status === "Failed" && (
                        <>
                          <button
                            onClick={() => setSelectedError(b)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>Error Log</span>
                          </button>
                          <button
                            onClick={() => retryBuild(b.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry</span>
                          </button>
                        </>
                      )}

                      {b.status === "Ready" && (
                        <button
                          onClick={() => alert(`Downloading artifact for Build #${b.id}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ERROR INSPECTION MODAL ── */}
      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-rose-400" />
                <h3 className="font-extrabold text-base">
                  Build Failure Log: Build #{selectedError.id}
                </h3>
              </div>
              <button onClick={() => setSelectedError(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">Target Application</span>
                <p className="text-sm font-extrabold text-slate-900">
                  {selectedError.appName} ({selectedError.appPackage})
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">Compiler Error Output</span>
                <div className="p-4 bg-slate-950 text-rose-300 font-mono text-xs rounded-2xl overflow-x-auto leading-relaxed border border-slate-800">
                  {selectedError.errorMessage}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                <b>Recommended Resolution:</b> Check tenant keystore alias or regenerate upload key in Keystore Manager.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedError(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const id = selectedError.id;
                  setSelectedError(null);
                  retryBuild(id);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-queue Build Job</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
