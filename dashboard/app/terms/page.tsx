"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  FileText,
  ShieldCheck,
  CreditCard,
  Smartphone,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

export default function TermsPage() {
  const { data: authData } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient("/api/auth/me"),
    retry: false,
    staleTime: 60000,
  });

  const user = authData?.user;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="home-page-root site-layout min-h-screen bg-[#FAF7F2] text-[#1C1917]">
      {/* ── TOP HEADER ── */}
      <header className="app-header bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#EBE6DF] sticky top-0 z-50">
        <div className="header-inner max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link href="/" className="brand-logo flex items-center gap-2.5" aria-label="AppifyHub Home">
            <svg
              className="brand-icon"
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M16 3L3 27H11L16 17L21 27H29L16 3Z" fill="#78593D" />
              <path d="M16 11L11.5 20H20.5L16 11Z" fill="#C2A88F" />
            </svg>
            <span className="brand-text font-black text-xl tracking-tight text-[#1C1917]">AppifyHub</span>
          </Link>

          <nav className="main-nav hidden md:flex items-center gap-7 text-sm font-semibold text-[#544D45]">
            <Link href="/" className="hover:text-[#78593D] transition">Home</Link>
            <Link href="/how-it-works" className="hover:text-[#78593D] transition">How It Works</Link>
            <Link href="/themes" className="hover:text-[#78593D] transition">Themes</Link>
            <Link href="/plans" className="hover:text-[#78593D] transition">Plans</Link>
            <Link href="/support" className="hover:text-[#78593D] transition">Support</Link>
          </nav>

          <div className="header-actions flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white text-xs font-bold shadow-xs transition"
              >
                Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-2 text-xs font-bold text-[#544D45] hover:text-[#1C1917] transition"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white text-xs font-bold shadow-xs transition"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <section className="border-b border-[#EBE6DF] bg-white/70 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-bold text-[#78593D] uppercase tracking-wider mb-3">
            <FileText className="w-4 h-4 text-[#78593D]" />
            <span>Terms of Service &amp; User Agreement</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            Terms &amp; Conditions
          </h1>

          <p className="mt-3 text-sm sm:text-base text-[#665E55] leading-relaxed max-w-2xl">
            Please read these terms and conditions carefully before using the AppifyHub website-to-app conversion platform and related mobile build services.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-[#7E756B]">
            <span className="px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#EBE6DF] font-semibold text-[#544D45]">
              Effective Date: November 2026
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 font-semibold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Legally Binding Agreement
            </span>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── LEFT TABLE OF CONTENTS ── */}
          <aside className="lg:col-span-4 lg:sticky lg:top-28 space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-[#EBE6DF] shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#78593D] mb-3">
                Terms Sections
              </h3>
              <nav className="space-y-1 text-xs font-semibold text-[#544D45]">
                {[
                  { id: "acceptance", label: "1. Acceptance of Terms" },
                  { id: "services", label: "2. Description of Services" },
                  { id: "account", label: "3. Account & Credentials" },
                  { id: "payments", label: "4. Plans, Billing & Refunds" },
                  { id: "app-stores", label: "5. App Store Publishing" },
                  { id: "ip", label: "6. Intellectual Property" },
                  { id: "liability", label: "7. Limitation of Liability" },
                  { id: "termination", label: "8. Termination & Deletion" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="w-full text-left py-2 px-2.5 rounded-lg hover:bg-[#FAF7F2] hover:text-[#78593D] transition flex items-center justify-between group cursor-pointer"
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#78593D] group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-5 rounded-2xl bg-[#F7F5F0] border border-[#78593D]/20 text-xs">
              <div className="w-8 h-8 rounded-xl bg-[#78593D] text-white flex items-center justify-center mb-3">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-[#1C1917]">Need assistance?</h4>
              <p className="text-[#665E55] mt-1 leading-relaxed">
                Contact our support team for any billing or technical queries.
              </p>
              <Link
                href="/support"
                className="mt-3 inline-flex items-center gap-1 font-bold text-[#78593D] hover:underline"
              >
                <span>Support Portal</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </aside>

          {/* ── RIGHT POLICY ARTICLES ── */}
          <div className="lg:col-span-8 space-y-10">
            {/* 1. ACCEPTANCE */}
            <section id="acceptance" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                  1
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Acceptance of Terms</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  By creating an account, entering your store URL, connecting API credentials, or generating mobile application builds through AppifyHub, you agree to be bound by these Terms and Conditions and our Privacy Policy.
                </p>
                <p>
                  If you are using this service on behalf of a business, merchant, or legal entity, you represent and warrant that you possess full legal authorization to bind that entity to these terms.
                </p>
              </div>
            </section>

            {/* 2. DESCRIPTION OF SERVICES */}
            <section id="services" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-800 flex items-center justify-center font-bold">
                  2
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Description of Services</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  AppifyHub provides software tools, automated build pipelines, and design interfaces that convert web-based stores (built on WooCommerce, Shopify, or WordPress) into mobile application packages (.APK, .AAB, and .IPA).
                </p>
                <p>
                  The platform operates as a software provider. You are solely responsible for ensuring that your website content, products, and trade practices comply with applicable local laws and international ecommerce regulations.
                </p>
              </div>
            </section>

            {/* 3. ACCOUNT & CREDENTIALS */}
            <section id="account" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                  3
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Account &amp; API Credentials Security</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  You agree to provide accurate and truthful information during account registration. You are responsible for safeguarding your login password and any REST API Consumer Keys or tokens linked to your applications.
                </p>
                <p>
                  AppifyHub encrypts API keys at rest using AES-256-CBC. You agree not to input credentials belonging to websites you do not own or maintain valid administrative rights to convert.
                </p>
              </div>
            </section>

            {/* 4. BILLING & REFUNDS */}
            <section id="payments" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center font-bold">
                  4
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Plans, Billing &amp; Refund Policy</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  Paid subscription plans (e.g. Starter, Pro, Enterprise) and modular add-ons are processed securely through Razorpay in Indian Rupees (INR) or supported regional currencies.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Upgrades:</strong> When upgrading plans, credit for unused time on your current billing cycle is automatically applied toward your new tier.</li>
                  <li><strong>Refund Guarantee:</strong> We offer a 14-day technical satisfaction guarantee if our build system is unable to compile your application due to verified platform bugs that our support team cannot resolve.</li>
                </ul>
              </div>
            </section>

            {/* 5. APP STORE PUBLISHING */}
            <section id="app-stores" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
                  5
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">App Store Publishing &amp; Review Policies</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  Publishing to Google Play Store and Apple App Store requires active developer accounts maintained directly with Google and Apple.
                </p>
                <p>
                  While AppifyHub generates code bundles strictly adhering to Google Play Data Safety and Apple App Review guidelines, final app approval remains subject to the independent discretion of Google and Apple review teams.
                </p>
              </div>
            </section>

            {/* 6. INTELLECTUAL PROPERTY */}
            <section id="ip" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center font-bold">
                  6
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Intellectual Property</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  You retain 100% ownership of your trademarks, store logos, product photography, and website content. AppifyHub retains ownership of its underlying platform software, build pipelines, design system templates, and proprietary mobile architecture.
                </p>
              </div>
            </section>

            {/* 7. LIMITATION OF LIABILITY */}
            <section id="liability" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                  7
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Limitation of Liability</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  In no event shall AppifyHub, its directors, employees, or partners be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service, store server downtime, or third-party app store policy changes.
                </p>
              </div>
            </section>

            {/* 8. TERMINATION */}
            <section id="termination" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  8
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Termination &amp; Data Deletion</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  You may terminate your account or delete individual mobile app projects at any time using the self-serve 3-step deletion tool on the dashboard. Upon deletion, all associated build binaries and store credentials are permanently wiped from our systems.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="app-footer border-t border-[#EBE6DF] bg-white py-12">
        <div className="footer-inner max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7E756B]">
            <p>&copy; 2026 AppifyHub. All rights reserved.</p>
            <div className="flex items-center gap-4 font-semibold">
              <Link href="/privacy" className="hover:text-[#1C1917] hover:underline">Privacy Policy</Link>
              <span>|</span>
              <Link href="/terms" className="text-[#78593D] hover:underline">Terms &amp; Conditions</Link>
              <span>|</span>
              <Link href="/support" className="hover:text-[#1C1917] hover:underline">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
