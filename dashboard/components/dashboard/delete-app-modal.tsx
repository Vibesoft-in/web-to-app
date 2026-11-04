"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Trash2, X, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface DeleteAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: {
    ulid: string;
    name: string;
    platform?: string;
  } | null;
  onDeleted?: (ulid: string) => void;
}

export function DeleteAppModal({
  isOpen,
  onClose,
  app,
  onDeleted,
}: DeleteAppModalProps) {
  // Step 1: Type app name verification
  // Step 2: Final confirmation
  // Step 3: Successfully deleted confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [typedName, setTypedName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTypedName("");
      setIsDeleting(false);
      setErrorMessage(null);
    }
  }, [isOpen, app]);

  if (!isOpen || !app) return null;

  const appDisplayName = app.name || "Untitled App";
  const isMatch = typedName.trim().toLowerCase() === appDisplayName.trim().toLowerCase();

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatch) return;
    setStep(2);
  };

  const handleFinalDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await apiClient(`/api/apps/${app.ulid}`, {
        method: "DELETE",
      });

      // Advance to Step 3: Success popup
      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete the application. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleFinish = () => {
    onClose();
    if (onDeleted) {
      onDeleted(app.ulid);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="fixed inset-0" onClick={step === 3 ? handleFinish : onClose} />

      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative z-10 border border-slate-200 my-auto animate-in zoom-in-95 duration-200">
        {/* Close Icon (Only for Steps 1 & 2) */}
        {step !== 3 && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* ── POPUP 1: ASK USER TO WRITE THE NAME OF THE APP ── */}
        {step === 1 && (
          <form onSubmit={handleProceedToConfirm} className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded">
                Step 1 of 2: Verification
              </span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight mt-1.5">
                Delete Application
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                This action cannot be undone. All app configurations, build files, and analytics for{" "}
                <strong className="text-slate-900 font-bold">{appDisplayName}</strong> will be permanently removed.
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                To verify, please type the app name: <strong className="font-mono text-slate-900 select-all font-bold">{appDisplayName}</strong>
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Type App Name to Confirm
              </label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={appDisplayName}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100 text-xs font-medium text-slate-900 outline-none transition"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!isMatch}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
                  isMatch
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 cursor-pointer active:scale-95"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
              >
                <span>Continue</span>
              </button>
            </div>
          </form>
        )}

        {/* ── POPUP 2: CONFIRMATION POPUP ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded">
                Step 2 of 2: Final Confirmation
              </span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight mt-1.5">
                Are you absolutely sure?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                You are about to permanently delete <strong className="text-slate-900 font-bold">&quot;{appDisplayName}&quot;</strong>.
                All compiled APK/AAB binaries, live sync credentials, and app customization draft configs will be destroyed immediately.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {errorMessage}
              </div>
            )}

            <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-2xl text-[11px] text-rose-900 font-medium leading-relaxed">
              ⚠️ <strong>Warning:</strong> There is no recovery or undo option after this step.
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleFinalDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center justify-center gap-2 shadow-md shadow-rose-600/30 cursor-pointer active:scale-95 disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── POPUP 3: DELETED SUCCESS CONFIRMATION ── */}
        {step === 3 && (
          <div className="text-center py-2 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Deleted
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight mt-2">
                Application Deleted
              </h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto mt-1.5 leading-relaxed">
                <strong className="text-slate-900 font-bold">&quot;{appDisplayName}&quot;</strong> has been successfully and permanently removed from your account.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-md shadow-slate-900/20 cursor-pointer active:scale-95"
              >
                Done &amp; Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
