@php
    $user = $getRecord();
    $apps = \App\Models\App::withoutGlobalScopes()
        ->where('tenant_id', $user->tenant_id)
        ->with(['connection', 'configs', 'builds'])
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
.badge-woo {
    background: #3b0764 !important;
    color: #c084fc !important;
    border: 1px solid rgba(192, 132, 252, 0.35);
}
.badge-wp {
    background: #1e3a8a !important;
    color: #60a5fa !important;
    border: 1px solid rgba(96, 165, 250, 0.35);
}
.badge-shopify {
    background: #064e3b !important;
    color: #6ee7b7 !important;
    border: 1px solid rgba(110, 231, 183, 0.35);
}
.dossier-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.45rem;
    border-radius: 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    background: #27272a !important;
    color: #f4f4f5 !important;
    border: 1px solid rgba(255, 255, 255, 0.15);
}
.dossier-link {
    color: #818cf8 !important;
    text-decoration: underline;
    font-weight: 600;
}
.dossier-link:hover {
    color: #a5b4fc !important;
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
html:not(.dark) .badge-woo {
    background: #f3e8ff !important;
    color: #6b21a8 !important;
    border: 1px solid #e9d5ff;
}
html:not(.dark) .badge-wp {
    background: #dbeafe !important;
    color: #1e40af !important;
    border: 1px solid #bfdbfe;
}
html:not(.dark) .badge-shopify {
    background: #ecfdf5 !important;
    color: #065f46 !important;
    border: 1px solid #a7f3d0;
}
html:not(.dark) .dossier-chip {
    background: #f1f5f9 !important;
    color: #1e293b !important;
    border: 1px solid #cbd5e1;
}
html:not(.dark) .dossier-link {
    color: #4f46e5 !important;
}
</style>

<div class="dossier-wrap">
    @if ($apps->isEmpty())
        <div class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center bg-gray-50/50 dark:bg-gray-800/50">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            </div>
            <h3 class="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No Mobile Apps Found</h3>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">This user has not initiated any mobile app conversion yet.</p>
        </div>
    @else
        <div class="dossier-table-box">
            <table class="dossier-table">
                <thead class="dossier-thead">
                    <tr>
                        <th class="dossier-th">App Details</th>
                        <th class="dossier-th">Platform</th>
                        <th class="dossier-th">Package Identifier</th>
                        <th class="dossier-th">Connected Website</th>
                        <th class="dossier-th">Step &amp; Status</th>
                        <th class="dossier-th">Builds</th>
                        <th class="dossier-th" style="text-align: right;">Created Date</th>
                    </tr>
                </thead>
                <tbody class="dossier-tbody">
                    @foreach ($apps as $app)
                        @php
                            $conn = $app->connection;
                            $buildsCount = $app->builds->count();
                            $platformVal = $app->platform instanceof \App\Enums\Platform ? $app->platform->value : (string)$app->platform;
                            $statusVal = $app->status instanceof \App\Enums\AppStatus ? $app->status->value : (string)$app->status;
                            $stepVal = $app->setup_step instanceof \App\Enums\SetupStep ? $app->setup_step->value : (string)$app->setup_step;
                        @endphp
                        <tr>
                            <td class="dossier-td">
                                <div class="dossier-title" style="font-size: 0.95rem;">{{ $app->name }}</div>
                                <div class="dossier-sub dossier-mono">ID: #{{ $app->id }} | ULID: {{ substr($app->ulid, 0, 10) }}...</div>
                            </td>
                            <td class="dossier-td">
                                @if ($platformVal === 'woo')
                                    <span class="dossier-badge badge-woo">WooCommerce</span>
                                @elseif ($platformVal === 'wordpress')
                                    <span class="dossier-badge badge-wp">WordPress</span>
                                @elseif ($platformVal === 'shopify')
                                    <span class="dossier-badge badge-shopify">Shopify</span>
                                @else
                                    <span class="dossier-badge badge-wp">{{ strtoupper($platformVal) }}</span>
                                @endif
                            </td>
                            <td class="dossier-td dossier-mono font-medium" style="color: #cbd5e1;">
                                {{ $app->package_name ?: 'Pending Configuration' }}
                            </td>
                            <td class="dossier-td">
                                @if ($conn && $conn->store_url)
                                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                                        <a href="{{ $conn->store_url }}" target="_blank" rel="noopener noreferrer" class="dossier-link" style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block;">
                                            {{ $conn->store_url }}
                                        </a>
                                        @if ($conn->status->value === 'verified')
                                            <span class="dossier-badge badge-active" style="padding: 0.15rem 0.4rem; font-size: 0.625rem;">
                                                ✓ Verified
                                            </span>
                                        @else
                                            <span class="dossier-badge badge-pending" style="padding: 0.15rem 0.4rem; font-size: 0.625rem;">
                                                {{ ucfirst($conn->status->value) }}
                                            </span>
                                        @endif
                                    </div>
                                @else
                                    <span class="dossier-sub italic">No website connected</span>
                                @endif
                            </td>
                            <td class="dossier-td">
                                <div style="display: flex; align-items: center; gap: 0.35rem;">
                                    <span class="dossier-chip" style="text-transform: uppercase; font-size: 0.625rem;">
                                        {{ $stepVal }}
                                    </span>
                                    @if ($statusVal === 'ready' || $statusVal === 'published')
                                        <span class="dossier-badge badge-active">{{ $statusVal }}</span>
                                    @else
                                        <span class="dossier-badge badge-pending">{{ $statusVal }}</span>
                                    @endif
                                </div>
                            </td>
                            <td class="dossier-td">
                                <span class="dossier-title dossier-mono" style="color: #38bdf8;">
                                    {{ $buildsCount }}
                                    <span class="dossier-sub font-normal">build(s)</span>
                                </span>
                            </td>
                            <td class="dossier-td dossier-mono" style="text-align: right; color: #a1a1aa; font-size: 0.75rem;">
                                {{ $app->created_at ? $app->created_at->format('M d, Y H:i') : '—' }}
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endif
</div>
