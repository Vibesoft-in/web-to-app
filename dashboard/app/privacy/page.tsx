"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { HeaderProfileMenu } from "@/components/header-profile-menu";
import {
  Shield,
  Lock,
  Database,
  Smartphone,
  Eye,
  Trash2,
  FileCheck,
  Server,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

export default function PrivacyPolicyPage() {
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
            <HeaderProfileMenu user={user} />
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <section className="border-b border-[#EBE6DF] bg-white/70 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-bold text-[#78593D] uppercase tracking-wider mb-3">
            <Shield className="w-4 h-4 text-[#78593D]" />
            <span>Legal, Privacy &amp; Data Safety</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            Privacy Policy &amp; Data Protection
          </h1>

          <p className="mt-3 text-sm sm:text-base text-[#665E55] leading-relaxed max-w-2xl">
            At AppifyHub, we treat your business information, store assets, REST API keys, and customer data with complete transparency and enterprise-grade security.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-[#7E756B]">
            <span className="px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#EBE6DF] font-semibold text-[#544D45]">
              Last Updated: November 2026
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 font-semibold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              GDPR &amp; Google Play Data Safety Compliant
            </span>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── LEFT STICKY TABLE OF CONTENTS ── */}
          <aside className="lg:col-span-4 lg:sticky lg:top-28 space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-[#EBE6DF] shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#78593D] mb-3">
                Contents &amp; Navigation
              </h3>
              <nav className="space-y-1 text-xs font-semibold text-[#544D45]">
                {[
                  { id: "overview", label: "1. Overview & Commitment" },
                  { id: "data-collection", label: "2. Information We Collect" },
                  { id: "purpose", label: "3. Purpose of Processing" },
                  { id: "security", label: "4. API Keys & Data Encryption" },
                  { id: "app-stores", label: "5. Mobile App & Store Disclosures" },
                  { id: "third-parties", label: "6. Third-Party Services" },
                  { id: "retention-deletion", label: "7. Data Retention & Deletion" },
                  { id: "user-rights", label: "8. Your Rights (GDPR / CCPA)" },
                  { id: "contact", label: "9. Contact & Data Officer" },
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

            {/* Quick Contact Card */}
            <div className="p-5 rounded-2xl bg-[#F7F5F0] border border-[#78593D]/20 text-xs">
              <div className="w-8 h-8 rounded-xl bg-[#78593D] text-white flex items-center justify-center mb-3">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-[#1C1917]">Questions about privacy?</h4>
              <p className="text-[#665E55] mt-1 leading-relaxed">
                Our security compliance team is available 24/7 to answer questions or process data requests.
              </p>
              <Link
                href="/support"
                className="mt-3 inline-flex items-center gap-1 font-bold text-[#78593D] hover:underline"
              >
                <span>Contact Security Support</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </aside>

          {/* ── RIGHT POLICY ARTICLES ── */}
          <div className="lg:col-span-8 space-y-10">
            {/* 1. OVERVIEW */}
            <section id="overview" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                  1
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Overview &amp; Our Commitment</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  AppifyHub provides an automated platform that converts online stores and content websites (WooCommerce, Shopify, and WordPress) into high-performance native iOS and Android mobile applications.
                </p>
                <p>
                  We recognize that your online storefront represents significant commercial investment and trust. We do <strong>not</strong> sell, rent, monetize, or harvest user catalogs or customer personal information. All information collected through our platform is utilized strictly to verify compatibility, configure mobile UI layouts, establish secure API connectivity, and generate your application build packages.
                </p>
              </div>
            </section>

            {/* 2. INFORMATION WE COLLECT */}
            <section id="data-collection" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-800 flex items-center justify-center font-bold">
                  2
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Information We Collect</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  During the mobile application setup workflow, we collect specific parameters required for building and configuring your app:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EBE6DF]">
                    <h4 className="font-bold text-[#1C1917] flex items-center gap-1.5 mb-1">
                      <Server className="w-4 h-4 text-[#78593D]" />
                      Store URL &amp; Platform Type
                    </h4>
                    <p className="text-xs text-[#665E55]">
                      The website domain (e.g. <code>https://yourstore.com</code>) used for SSL validation, platform compatibility, and REST endpoint matching.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EBE6DF]">
                    <h4 className="font-bold text-[#1C1917] flex items-center gap-1.5 mb-1">
                      <Lock className="w-4 h-4 text-[#78593D]" />
                      Store API Credentials
                    </h4>
                    <p className="text-xs text-[#665E55]">
                      WooCommerce Consumer Key/Secret or Shopify Storefront tokens, encrypted using AES-256-CBC at rest.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EBE6DF]">
                    <h4 className="font-bold text-[#1C1917] flex items-center gap-1.5 mb-1">
                      <Eye className="w-4 h-4 text-[#78593D]" />
                      Branding &amp; Assets
                    </h4>
                    <p className="text-xs text-[#665E55]">
                      Your application name, store logo, app icon, splash screen, and hex theme colors extracted from your website or uploaded by you.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EBE6DF]">
                    <h4 className="font-bold text-[#1C1917] flex items-center gap-1.5 mb-1">
                      <Database className="w-4 h-4 text-[#78593D]" />
                      Catalog Metadata
                    </h4>
                    <p className="text-xs text-[#665E55]">
                      Product titles, category trees, and product image links used strictly to render real-time previews inside the interactive phone emulator.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. PURPOSE OF PROCESSING */}
            <section id="purpose" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                  3
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Purpose of Processing &amp; Data Usage</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  We process the collected store and account details for the following explicit purposes:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>App Compilation &amp; Packaging:</strong> Packaging your mobile app binaries (.APK, .AAB, and .IPA) with your unique bundle identifiers and cryptographic signing certificates.
                  </li>
                  <li>
                    <strong>Real-Time API Sync:</strong> Establishing direct, low-latency communication channels between your customer mobile devices and your store backend.
                  </li>
                  <li>
                    <strong>Live Preview Calibration:</strong> Rendering your real store products and categories inside the interactive phone simulator in the Preview step.
                  </li>
                  <li>
                    <strong>Push Notifications &amp; Analytics:</strong> Enabling opt-in transactional order updates and marketing broadcasts via Firebase Cloud Messaging (FCM).
                  </li>
                </ul>
              </div>
            </section>

            {/* 4. SECURITY & ENCRYPTION */}
            <section id="security" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center font-bold">
                  4
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">API Keys &amp; Data Encryption Standards</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <div className="p-4 rounded-2xl bg-slate-900 text-white font-mono text-xs space-y-2">
                  <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    <span>ENCRYPTION ARCHITECTURE: AES-256-CBC WITH HMAC-SHA256 INTEGRITY</span>
                  </div>
                  <p className="text-slate-300">
                    All store credentials, Consumer Keys, and secrets are encrypted before database insertion and never exposed in client logs or browser responses.
                  </p>
                </div>
                <p>
                  We implement multi-layered safeguards to ensure your store endpoints and secrets remain private:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Endpoint-Specific Validation:</strong> Credentials are only ever verified and dispatched to your exact verified website domain.</li>
                  <li><strong>TLS 1.3 Transport:</strong> All data transmitted between your browser, our servers, and your store is secured with HTTPS/TLS 1.3.</li>
                  <li><strong>Role-Based Access Control:</strong> App configurations and API keys are isolated per tenant with strict database row-level scopes.</li>
                  <li><strong>Zero-Knowledge Credentials:</strong> Our frontend responses omit secrets, returning only masked verification status flags.</li>
                </ul>
              </div>
            </section>

            {/* 5. APP STORES & END-USER PRIVACY */}
            <section id="app-stores" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
                  5
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Mobile App End-User Privacy &amp; Store Compliance</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  When your customers download and use the mobile application created through AppifyHub, the mobile application functions as a direct client for your store.
                </p>
                <h4 className="font-bold text-[#1C1917]">Google Play Data Safety &amp; Apple Privacy Labels</h4>
                <p>
                  To assist you in publishing your app, our build outputs comply with Google Play Data Safety and Apple Privacy Nutritional Labels:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Device or other IDs:</strong> Used solely for push notifications (FCM tokens) if permitted by the user.</li>
                  <li><strong>Personal Information:</strong> Handled directly between your customer and your store’s native WooCommerce/Shopify checkout. AppifyHub does not intercept payment card numbers.</li>
                  <li><strong>In-App Permissions:</strong> Requested only when strictly needed (e.g. Camera for barcode scanning or Notifications for order alerts).</li>
                </ul>
              </div>
            </section>

            {/* 6. THIRD-PARTY SERVICES */}
            <section id="third-parties" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center font-bold">
                  6
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Third-Party Services &amp; Subprocessors</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  We utilize reputable enterprise infrastructure providers to compile, host, and deliver services:
                </p>
                <div className="divide-y divide-[#EBE6DF] text-xs">
                  <div className="py-2.5 flex justify-between items-center">
                    <div>
                      <strong className="text-[#1C1917] block">Razorpay Payments</strong>
                      <span className="text-[#7E756B]">PCI-DSS Level 1 compliant billing processor for subscription plans and add-ons.</span>
                    </div>
                    <span className="text-slate-500 font-mono">Payment Gateway</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <div>
                      <strong className="text-[#1C1917] block">Google Firebase</strong>
                      <span className="text-[#7E756B]">FCM infrastructure for push notification delivery to Android and iOS devices.</span>
                    </div>
                    <span className="text-slate-500 font-mono">Notifications</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <div>
                      <strong className="text-[#1C1917] block">Vercel &amp; Cloudflare</strong>
                      <span className="text-[#7E756B]">Edge hosting, DDoS mitigation, and SSL certificate management.</span>
                    </div>
                    <span className="text-slate-500 font-mono">Hosting &amp; CDN</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 7. DATA RETENTION & DELETION */}
            <section id="retention-deletion" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center font-bold">
                  7
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Data Retention &amp; Permanent Deletion</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  You maintain full ownership of your data at all times.
                </p>
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-2">
                  <h4 className="font-bold text-[#1C1917] flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Instant Self-Serve App &amp; Credential Deletion</span>
                  </h4>
                  <p className="text-xs text-[#665E55] leading-relaxed">
                    You can delete any project or draft at any time using our <strong>3-Step Verification Modal</strong> on the dashboard. Upon deletion, all associated store connections, API credentials, build artifacts (.apk, .aab, .ipa), and configuration drafts are immediately and permanently removed from our databases and storage buckets.
                  </p>
                </div>
                <p>
                  Active applications and build histories are retained while your subscription is in good standing to enable continuous cloud rebuilds and version updates.
                </p>
              </div>
            </section>

            {/* 8. USER RIGHTS */}
            <section id="user-rights" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                  8
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Your Legal Rights (GDPR &amp; CCPA)</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  Depending on your geographic location, you have the following rights regarding personal data:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Right to Access:</strong> Request a full copy of your account profile and stored configurations.</li>
                  <li><strong>Right to Rectification:</strong> Update inaccurate business or branding details directly in your account dashboard.</li>
                  <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request complete deletion of your account, billing records, and compiled binaries.</li>
                  <li><strong>Right to Data Portability:</strong> Export your theme configurations, design tokens, and build files.</li>
                </ul>
              </div>
            </section>

            {/* 9. CONTACT */}
            <section id="contact" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EBE6DF] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#78593D] text-white flex items-center justify-center font-bold">
                  9
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Contact Our Data Protection Team</h2>
              </div>
              <div className="text-sm text-[#544D45] leading-relaxed space-y-3">
                <p>
                  If you have any questions about this Privacy Policy, your store credentials, or wish to submit a formal Data Subject Request, please contact our team:
                </p>
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] text-xs space-y-1.5">
                  <p><strong>AppifyHub Privacy &amp; Data Protection Office</strong></p>
                  <p>Email: <a href="mailto:privacy@appifyhub.com" className="text-[#78593D] font-bold hover:underline">privacy@appifyhub.com</a></p>
                  <p>Support Portal: <Link href="/support" className="text-[#78593D] font-bold hover:underline">appifyhub.com/support</Link></p>
                </div>
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
              <Link href="/privacy" className="text-[#78593D] hover:underline">Privacy Policy</Link>
              <span>|</span>
              <Link href="/terms" className="hover:text-[#1C1917] hover:underline">Terms &amp; Conditions</Link>
              <span>|</span>
              <Link href="/support" className="hover:text-[#1C1917] hover:underline">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

