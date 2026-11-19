"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Key,
  Database,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  RotateCcw,
  Plus,
  ArrowRight,
  UserCheck,
  Server,
  Layers,
  FileCheck,
} from "lucide-react";

interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  ip: string;
  status: "success" | "warning" | "danger";
  meta: string;
}

const AUDIT_LOGS_DATA: AuditEvent[] = [
  {
    id: "aud_1",
    actor: "admin@webintoapp.com",
    action: "impersonation.started",
    target: "Tenant #2 (Sanskriti Store Global)",
    timestamp: "Nov 19, 2026 01:25 PM",
    ip: "127.0.0.1",
    status: "warning",
    meta: "Super Admin accessed store to troubleshoot product review sync",
  },
  {
    id: "aud_2",
    actor: "system.scheduler",
    action: "database.backup_created",
    target: "backup_20261119_120000.sqlite",
    timestamp: "Nov 19, 2026 12:00 PM",
    ip: "internal",
    status: "success",
    meta: "Size: 42.8 MB • PRAGMA integrity_check: OK",
  },
  {
    id: "aud_3",
    actor: "admin@webintoapp.com",
    action: "app.config_override",
    target: "App:Fashion Hub Mobile (#1)",
    timestamp: "Nov 19, 2026 11:15 AM",
    ip: "127.0.0.1",
    status: "success",
    meta: "Assigned Luxury Boutique theme & enabled push notifications",
  },
  {
    id: "aud_4",
    actor: "admin@webintoapp.com",
    action: "payment.recovered",
    target: "Order #ORD-353212295512",
    timestamp: "Nov 19, 2026 10:40 AM",
    ip: "127.0.0.1",
    status: "success",
    meta: "Reconciled ₹14,999 manual settlement",
  },
  {
    id: "aud_5",
    actor: "system.guard",
    action: "security.sensitive_action_blocked",
    target: "Tenant #5",
    timestamp: "Nov 18, 2026 06:12 PM",
    ip: "192.168.1.10",
    status: "danger",
    meta: "Delete tenant request rejected: required MFA confirmation",
  },
];

interface BackupSnapshot {
  filename: string;
  size: string;
  createdAt: string;
  status: "Verified OK" | "Restorable";
  storageLocation: string;
}

const BACKUP_SNAPSHOTS: BackupSnapshot[] = [
  {
    filename: "backup_20261119_120000.sqlite",
    size: "42.8 MB",
    createdAt: "Today at 12:00 PM",
    status: "Verified OK",
    storageLocation: "storage/app/backups/backup_20261119_120000.sqlite",
  },
  {
    filename: "backup_20261118_000000.sqlite",
    size: "41.6 MB",
    createdAt: "Nov 18, 2026 12:00 AM",
    status: "Verified OK",
    storageLocation: "storage/app/backups/backup_20261118_000000.sqlite",
  },
  {
    filename: "backup_20261117_000000.sqlite",
    size: "40.9 MB",
    createdAt: "Nov 17, 2026 12:00 AM",
    status: "Verified OK",
    storageLocation: "storage/app/backups/backup_20261117_000000.sqlite",
  },
];

export function AdminSecurity() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [snapshots, setSnapshots] = useState(BACKUP_SNAPSHOTS);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  const handleCreateSnapshot = () => {
    setIsCreatingBackup(true);
    setTimeout(() => {
      const now = new Date();
      const newSnap: BackupSnapshot = {
        filename: `backup_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}_${now.getHours()}${now.getMinutes()}${now.getSeconds()}.sqlite`,
        size: "43.1 MB",
        createdAt: "Just now",
        status: "Verified OK",
        storageLocation: "storage/app/backups/",
      };
      setSnapshots([newSnap, ...snapshots]);
      setIsCreatingBackup(false);
      alert("Database snapshot created and verified successfully!");
    }, 1200);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Security & Backups
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold uppercase tracking-wider">
              2FA Active
            </span>
          </h1>
        </div>
      </div>

      {/* ── TOP SECURITY STATUS CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 2FA Status Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">2FA Authentication</span>
            <div className={`p-2.5 rounded-xl ${twoFactorEnabled ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-black text-slate-900">
              {twoFactorEnabled ? "Enabled" : "Disabled"}
            </span>
            <button
              onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Toggle
            </button>
          </div>
        </div>

        {/* Database Health Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Database</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-lg font-black text-slate-900 font-mono">
            42.8 MB • OK
          </div>
        </div>

        {/* Backup Frequency */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Backup Routine</span>
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-lg font-black text-slate-900">
            Daily
          </div>
        </div>

        {/* Sensitive Actions Protection */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Guarded Actions</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-lg font-black text-slate-900">
            7 Protected
          </div>
        </div>
      </div>

      {/* ── SENSITIVE ACTION POLICY OVERVIEW ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 mb-3">
          Guarded Actions (Confirmation Required)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Deleting a Tenant Organization</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Refunding Customer Payment</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Changing Subscription Plan Prices</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Impersonating Customer Account</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Changing Global API Credentials</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Disabling an Application</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Resetting Customer Password</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Restoring Point-in-time Snapshot</span>
          </div>
        </div>
      </div>

      {/* ── BACKUP & DISASTER RECOVERY VAULT ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Database Point-in-Time Restore Vault
            </h3>
            <p className="text-xs text-slate-500">
              Storage: <span className="font-mono text-slate-700">backend/storage/app/backups/</span>
            </p>
          </div>

          <button
            onClick={handleCreateSnapshot}
            disabled={isCreatingBackup}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm self-start sm:self-auto disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isCreatingBackup ? "Generating Snapshot..." : "Create Immediate Backup Snapshot"}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Snapshot Name</th>
                <th className="px-6 py-3.5">File Size</th>
                <th className="px-6 py-3.5">Creation Timestamp</th>
                <th className="px-6 py-3.5">Integrity Verification</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {snapshots.map((s) => (
                <tr key={s.filename} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    {s.filename}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-700">
                    {s.size}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {s.createdAt}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => alert(`Downloading database backup: ${s.filename}`)}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Download Snapshot
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── AUDIT LOG TIMELINE ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Platform Security & Audit Trail
            </h3>
            <p className="text-xs text-slate-500">
              Immutable chronological record of administrative interventions and security triggers
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">Showing last 5 events</span>
        </div>

        <div className="divide-y divide-slate-100">
          {AUDIT_LOGS_DATA.map((evt) => (
            <div key={evt.id} className="p-5 hover:bg-slate-50/50 transition flex items-start gap-4">
              <div
                className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                  evt.status === "danger"
                    ? "bg-rose-500 ring-4 ring-rose-100"
                    : evt.status === "warning"
                    ? "bg-amber-500 ring-4 ring-amber-100"
                    : "bg-emerald-500 ring-4 ring-emerald-100"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{evt.action}</span>
                    <span className="text-[11px] text-slate-400 font-mono">by {evt.actor}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{evt.timestamp}</span>
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-1">{evt.target}</p>
                <p className="text-xs text-slate-500 mt-0.5">{evt.meta}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
