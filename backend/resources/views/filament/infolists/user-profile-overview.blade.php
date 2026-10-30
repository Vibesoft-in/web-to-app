@php
    $user = $getRecord();
    $tenant = $user->tenant;
    $appsCount = \App\Models\App::withoutGlobalScopes()->where('tenant_id', $user->tenant_id)->count();
    $buildsCount = \App\Models\Build::withoutGlobalScopes()->where('tenant_id', $user->tenant_id)->count();
    $subsCount = \App\Models\Subscription::withoutGlobalScopes()->where('tenant_id', $user->tenant_id)->count();
    $roleVal = $user->role instanceof \App\Enums\UserRole ? $user->role->value : (string)($user->role?->value ?? $user->role);
@endphp

<style>
.dossier-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.25rem;
}
@media (max-width: 768px) {
    .dossier-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
.stat-card {
    background: #18181b;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.75rem;
    padding: 1.15rem 1.25rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
}
.stat-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #a1a1aa;
    margin-bottom: 0.35rem;
}
.stat-val {
    font-size: 1.5rem;
    font-weight: 800;
    color: #ffffff;
    line-height: 1.1;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.stat-desc {
    font-size: 0.725rem;
    color: #38bdf8;
    margin-top: 0.3rem;
}

.dossier-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
}
@media (max-width: 768px) {
    .dossier-two-col {
        grid-template-columns: 1fr;
    }
}
.dossier-panel {
    background: #18181b;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
}
.panel-heading {
    font-size: 0.95rem;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 1.15rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 0.75rem;
}
.field-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.825rem;
}
.field-row:last-child {
    border-bottom: none;
}
.field-key {
    color: #a1a1aa;
    font-weight: 500;
}
.field-val {
    color: #ffffff;
    font-weight: 600;
    text-align: right;
}

/* Light mode overrides */
html:not(.dark) .stat-card,
html:not(.dark) .dossier-panel {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
html:not(.dark) .stat-label {
    color: #64748b;
}
html:not(.dark) .stat-val {
    color: #0f172a;
}
html:not(.dark) .stat-desc {
    color: #0284c7;
}
html:not(.dark) .panel-heading {
    color: #0f172a;
    border-bottom: 1px solid #e2e8f0;
}
html:not(.dark) .field-row {
    border-bottom: 1px solid #f1f5f9;
}
html:not(.dark) .field-key {
    color: #64748b;
}
html:not(.dark) .field-val {
    color: #0f172a;
}
</style>

<div class="dossier-wrap">
    <!-- Top KPI Stat Strip -->
    <div class="dossier-grid">
        <div class="stat-card">
            <div class="stat-label">Mobile Apps</div>
            <div class="stat-val" style="color: #818cf8;">{{ $appsCount }}</div>
            <div class="stat-desc">Active store conversions</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Builds Executed</div>
            <div class="stat-val" style="color: #38bdf8;">{{ $buildsCount }}</div>
            <div class="stat-desc">Compiled .aab / .apk packages</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Active Subscriptions</div>
            <div class="stat-val" style="color: #34d399;">{{ $subsCount }}</div>
            <div class="stat-desc">Paid plan licenses</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Account Verification</div>
            <div class="stat-val" style="font-size: 1.15rem; color: {{ $user->email_verified_at ? '#34d399' : '#fb7185' }};">
                {{ $user->email_verified_at ? 'VERIFIED' : 'UNVERIFIED' }}
            </div>
            <div class="stat-desc" style="color: #a1a1aa;">
                Role: {{ strtoupper($roleVal) }}
            </div>
        </div>
    </div>

    <!-- Details Panels Side-by-Side -->
    <div class="dossier-two-col">
        <!-- Panel 1: Personal & User Credentials -->
        <div class="dossier-panel">
            <div class="panel-heading">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Personal &amp; Access Details</span>
            </div>

            <div class="field-row">
                <span class="field-key">User ID</span>
                <span class="field-val dossier-mono" style="color: #a5b4fc;">#{{ $user->id }}</span>
            </div>
            <div class="field-row">
                <span class="field-key">Full Name</span>
                <span class="field-val" style="font-size: 0.95rem;">{{ $user->name }}</span>
            </div>
            <div class="field-row">
                <span class="field-key">Mail Address</span>
                <span class="field-val dossier-mono">{{ $user->email }}</span>
            </div>
            <div class="field-row">
                <span class="field-key">Username</span>
                <span class="field-val dossier-mono" style="color: #38bdf8;">{{ $user->username }}</span>
            </div>
            <div class="field-row">
                <span class="field-key">Phone Number</span>
                <span class="field-val dossier-mono">{{ $user->phone ?: 'Not provided' }}</span>
            </div>
            <div class="field-row">
                <span class="field-key">Account Role</span>
                <span class="field-val">
                    <span class="dossier-badge {{ $roleVal === 'owner' ? 'badge-active' : 'badge-pending' }}">
                        {{ strtoupper($roleVal) }}
                    </span>
                </span>
            </div>
            <div class="field-row">
                <span class="field-key">Email Verified</span>
                <span class="field-val">
                    @if ($user->email_verified_at)
                        <span style="color: #34d399; font-weight: 600;">✓ {{ $user->email_verified_at->format('M d, Y H:i') }}</span>
                    @else
                        <span style="color: #fb7185; font-weight: 600;">✕ Pending Verification</span>
                    @endif
                </span>
            </div>
            <div class="field-row">
                <span class="field-key">Joined Platform</span>
                <span class="field-val dossier-mono">{{ $user->created_at ? $user->created_at->format('M d, Y H:i:s') : '—' }}</span>
            </div>
        </div>

        <!-- Panel 2: Organization & Tenant -->
        <div class="dossier-panel">
            <div class="panel-heading">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Organization &amp; Tenant Workspace</span>
            </div>

            <div class="field-row">
                <span class="field-key">Tenant ID</span>
                <span class="field-val dossier-mono" style="color: #a5b4fc;">#{{ $tenant?->id ?? $user->tenant_id }}</span>
            </div>
            <div class="field-row">
                <span class="field-key">Company / Workspace</span>
                <span class="field-val" style="font-size: 0.95rem;">{{ $tenant?->name ?? 'Appify HQ' }}</span>
            </div>
            <div class="field-row">
                <span class="field-key">Global Tenant ULID</span>
                <span class="field-val dossier-mono" style="font-size: 0.75rem; color: #cbd5e1;">{{ $tenant?->ulid ?? '—' }}</span>
            </div>
            <div class="field-row">
                <span class="field-key">Workspace Status</span>
                <span class="field-val">
                    <span class="dossier-badge badge-active">
                        {{ strtoupper($tenant?->status instanceof \App\Enums\TenantStatus ? $tenant->status->value : ($tenant?->status?->value ?? ($tenant?->status ?? 'ACTIVE'))) }}
                    </span>
                </span>
            </div>
            <div class="field-row">
                <span class="field-key">Apps Created</span>
                <span class="field-val dossier-mono" style="color: #38bdf8;">{{ $appsCount }} Application(s)</span>
            </div>
            <div class="field-row">
                <span class="field-key">Compiled Builds</span>
                <span class="field-val dossier-mono" style="color: #34d399;">{{ $buildsCount }} Binary Build(s)</span>
            </div>
            <div class="field-row">
                <span class="field-key">Paid Subscriptions</span>
                <span class="field-val dossier-mono" style="color: #fbbf24;">{{ $subsCount }} Plan(s)</span>
            </div>
            <div class="field-row">
                <span class="field-key">Tenant Registered</span>
                <span class="field-val dossier-mono">{{ $tenant?->created_at ? $tenant->created_at->format('M d, Y H:i') : '—' }}</span>
            </div>
        </div>
    </div>
</div>
