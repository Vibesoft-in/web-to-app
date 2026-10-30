@php
    $user = $getRecord();
    $subscriptions = \App\Models\Subscription::withoutGlobalScopes()
        ->where('tenant_id', $user->tenant_id)
        ->with(['plan', 'app'])
        ->latest()
        ->get();
@endphp

<style>
.dossier-wrap {
    width: 100%;
}
.dossier-table-box {
    border-radius: 0.75rem;
    overflow-x: auto;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: #18181b;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.25);
}
.dossier-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;
    line-height: 1.4;
    text-align: left;
}
.dossier-thead {
    background: #27272a !important;
    border-bottom: 2px solid rgba(255, 255, 255, 0.15);
}
.dossier-th {
    padding: 0.85rem 1rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #e4e4e7 !important;
}
.dossier-tbody tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    transition: background-color 0.15s ease;
}
.dossier-tbody tr:hover {
    background: rgba(255, 255, 255, 0.04);
}
.dossier-tbody tr:last-child {
    border-bottom: none;
}
.dossier-td {
    padding: 0.85rem 1rem;
    color: #f4f4f5 !important;
    vertical-align: middle;
}
.dossier-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: #ffffff !important;
}
.dossier-sub {
    font-size: 0.75rem;
    color: #a1a1aa !important;
    margin-top: 0.15rem;
}
.dossier-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.dossier-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.65rem;
    border-radius: 9999px;
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1.2;
}
.badge-active, .badge-ready, .badge-success {
    background: #064e3b !important;
    color: #34d399 !important;
    border: 1px solid rgba(52, 211, 153, 0.35);
}
.badge-pending, .badge-building, .badge-warning {
    background: #78350f !important;
    color: #fbbf24 !important;
    border: 1px solid rgba(251, 191, 36, 0.35);
}
.badge-failed, .badge-canceled, .badge-danger {
    background: #881337 !important;
    color: #fb7185 !important;
    border: 1px solid rgba(251, 113, 133, 0.35);
}
.dossier-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    background: #27272a !important;
    color: #f4f4f5 !important;
    border: 1px solid rgba(255, 255, 255, 0.15);
}
.dossier-pill-sub {
    display: inline-block;
    padding: 0.25rem 0.55rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    background: #1e293b !important;
    color: #38bdf8 !important;
    border: 1px solid rgba(56, 189, 248, 0.35);
}
.dossier-date-main {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #f4f4f5 !important;
}
.dossier-date-sub {
    font-size: 0.75rem;
    color: #34d399 !important;
    margin-top: 0.15rem;
}
.dossier-date-expired {
    font-size: 0.75rem;
    color: #fb7185 !important;
    margin-top: 0.15rem;
}

/* Light mode support */
html:not(.dark) .dossier-table-box {
    border: 1px solid #e2e8f0;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
html:not(.dark) .dossier-thead {
    background: #f8fafc !important;
    border-bottom: 2px solid #e2e8f0;
}
html:not(.dark) .dossier-th {
    color: #334155 !important;
}
html:not(.dark) .dossier-tbody tr {
    border-bottom: 1px solid #f1f5f9;
}
html:not(.dark) .dossier-tbody tr:hover {
    background: #f8fafc;
}
html:not(.dark) .dossier-td {
    color: #1e293b !important;
}
html:not(.dark) .dossier-title {
    color: #0f172a !important;
}
html:not(.dark) .dossier-sub {
    color: #64748b !important;
}
html:not(.dark) .badge-active, html:not(.dark) .badge-ready, html:not(.dark) .badge-success {
    background: #dcfce7 !important;
    color: #166534 !important;
    border: 1px solid #bbf7d0;
}
html:not(.dark) .badge-pending, html:not(.dark) .badge-building, html:not(.dark) .badge-warning {
    background: #fef3c7 !important;
    color: #92400e !important;
    border: 1px solid #fde68a;
}
html:not(.dark) .badge-failed, html:not(.dark) .badge-canceled, html:not(.dark) .badge-danger {
    background: #ffe4e6 !important;
    color: #9f1239 !important;
    border: 1px solid #fecdd3;
}
html:not(.dark) .dossier-chip {
    background: #f1f5f9 !important;
    color: #1e293b !important;
    border: 1px solid #cbd5e1;
}
html:not(.dark) .dossier-pill-sub {
    background: #e0f2fe !important;
    color: #0369a1 !important;
    border: 1px solid #bae6fd;
}
html:not(.dark) .dossier-date-main {
    color: #0f172a !important;
}
html:not(.dark) .dossier-date-sub {
    color: #15803d !important;
}
html:not(.dark) .dossier-date-expired {
    color: #be123c !important;
}
</style>

<div class="dossier-wrap">
    @if ($subscriptions->isEmpty())
        <div class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center bg-gray-50/50 dark:bg-gray-800/50">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
            </div>
            <h3 class="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No Subscriptions or Payments</h3>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">This user has not purchased any paid subscription plans or add-ons yet.</p>
        </div>
    @else
        <div class="dossier-table-box">
            <table class="dossier-table">
                <thead class="dossier-thead">
                    <tr>
                        <th class="dossier-th">Subscription</th>
                        <th class="dossier-th">Plan Details</th>
                        <th class="dossier-th">Associated App</th>
                        <th class="dossier-th">Payment Status</th>
                        <th class="dossier-th">Gateway Reference</th>
                        <th class="dossier-th">Period End / Expiry</th>
                        <th class="dossier-th" style="text-align: right;">Included Features</th>
                    </tr>
                </thead>
                <tbody class="dossier-tbody">
                    @foreach ($subscriptions as $sub)
                        @php
                            $plan = $sub->plan;
                            $priceFormatted = $plan ? '₹' . number_format($plan->price_monthly / 100, 0) : '—';
                            $isActive = $sub->status === 'active' && ($sub->current_period_end ? $sub->current_period_end->isFuture() : true);
                            $features = $plan?->features ?? [];
                        @endphp
                        <tr>
                            <td class="dossier-td">
                                <span class="dossier-title dossier-mono text-indigo-400">#SUB-{{ $sub->id }}</span>
                                <span class="dossier-sub block dossier-mono">Created: {{ $sub->created_at ? $sub->created_at->format('M d, Y') : '—' }}</span>
                            </td>
                            <td class="dossier-td">
                                <div class="dossier-title" style="font-size: 0.95rem;">{{ $plan?->name ?? 'Custom Plan' }}</div>
                                <div class="dossier-mono font-semibold" style="color: #34d399; margin-top: 0.2rem; font-size: 0.85rem;">
                                    {{ $priceFormatted }} <span class="dossier-sub font-normal">/ billing cycle</span>
                                </div>
                            </td>
                            <td class="dossier-td">
                                @if ($sub->app)
                                    <div class="dossier-title">{{ $sub->app->name }}</div>
                                    <span class="dossier-sub dossier-mono block">App ID: #{{ $sub->app_id }}</span>
                                @else
                                    <span class="dossier-sub italic">Account-Wide / All Apps</span>
                                @endif
                            </td>
                            <td class="dossier-td">
                                @if ($isActive)
                                    <span class="dossier-badge badge-active">● Active</span>
                                @elseif ($sub->status === 'past_due')
                                    <span class="dossier-badge badge-pending">● Past Due</span>
                                @elseif (in_array($sub->status, ['canceled', 'expired']))
                                    <span class="dossier-badge badge-failed">● {{ ucfirst($sub->status) }}</span>
                                @else
                                    <span class="dossier-badge badge-pending">● {{ ucfirst($sub->status) }}</span>
                                @endif
                            </td>
                            <td class="dossier-td">
                                @if ($sub->razorpay_sub_id)
                                    <span class="dossier-pill-sub dossier-mono">
                                        {{ $sub->razorpay_sub_id }}
                                    </span>
                                @else
                                    <span class="dossier-sub italic">Direct Order / Admin Granted</span>
                                @endif
                            </td>
                            <td class="dossier-td">
                                @if ($sub->current_period_end)
                                    <div class="dossier-date-main">{{ $sub->current_period_end->format('M d, Y H:i') }}</div>
                                    @if ($sub->current_period_end->isFuture())
                                        <div class="dossier-date-sub">Renews in {{ $sub->current_period_end->diffForHumans() }}</div>
                                    @else
                                        <div class="dossier-date-expired">Expired {{ $sub->current_period_end->diffForHumans() }}</div>
                                    @endif
                                @else
                                    <span class="dossier-sub">Lifetime / Indefinite</span>
                                @endif
                            </td>
                            <td class="dossier-td" style="text-align: right;">
                                <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: flex-end; max-width: 240px; margin-left: auto;">
                                    @foreach ($features as $key => $val)
                                        @if ($val === true)
                                            <span class="dossier-chip">
                                                {{ str_replace('_', ' ', $key) }}
                                            </span>
                                        @endif
                                    @endforeach
                                </div>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endif
</div>
