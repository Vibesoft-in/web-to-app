@php
    $user = $getRecord();
    $builds = \App\Models\Build::withoutGlobalScopes()
        ->where('tenant_id', $user->tenant_id)
        ->with('app')
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
    padding: 0.2rem 0.45rem;
    border-radius: 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    background: #27272a !important;
    color: #f4f4f5 !important;
    border: 1px solid rgba(255, 255, 255, 0.15);
}
.dossier-pill-sub {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.725rem;
    font-weight: 600;
    background: #1e293b !important;
    color: #38bdf8 !important;
    border: 1px solid rgba(56, 189, 248, 0.35);
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
</style>

<div class="dossier-wrap">
    @if ($builds->isEmpty())
        <div class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center bg-gray-50/50 dark:bg-gray-800/50">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
            </div>
            <h3 class="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No Builds Triggered</h3>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">There are no compiled application binaries or build jobs recorded for this user yet.</p>
        </div>
    @else
        <div class="dossier-table-box">
            <table class="dossier-table">
                <thead class="dossier-thead">
                    <tr>
                        <th class="dossier-th">Build #</th>
                        <th class="dossier-th">Target App</th>
                        <th class="dossier-th">Status</th>
                        <th class="dossier-th">Version Details</th>
                        <th class="dossier-th">Artifact Package</th>
                        <th class="dossier-th">Execution Timing</th>
                        <th class="dossier-th" style="text-align: right;">Build Outcome</th>
                    </tr>
                </thead>
                <tbody class="dossier-tbody">
                    @foreach ($builds as $build)
                        @php
                            $statusVal = $build->status instanceof \App\Enums\BuildStatus ? $build->status->value : (string)($build->status?->value ?? $build->status);
                            $duration = ($build->started_at && $build->finished_at)
                                ? $build->started_at->diffForHumans($build->finished_at, true)
                                : null;
                        @endphp
                        <tr>
                            <td class="dossier-td">
                                <span class="dossier-title dossier-mono text-indigo-400">#BUILD-{{ $build->id }}</span>
                            </td>
                            <td class="dossier-td">
                                <div class="dossier-title">{{ $build->app?->name ?? 'App #' . $build->app_id }}</div>
                                <div class="dossier-sub dossier-mono">{{ $build->app?->package_name ?: 'Config: v' . $build->config_version }}</div>
                            </td>
                            <td class="dossier-td">
                                @if ($statusVal === 'ready')
                                    <span class="dossier-badge badge-ready">● Ready</span>
                                @elseif (in_array($statusVal, ['building', 'signing', 'preparing', 'queued']))
                                    <span class="dossier-badge badge-building">● {{ ucfirst($statusVal) }}</span>
                                @elseif (in_array($statusVal, ['failed', 'timed_out']))
                                    <span class="dossier-badge badge-danger">● {{ ucfirst($statusVal) }}</span>
                                @else
                                    <span class="dossier-badge badge-building">● {{ ucfirst($statusVal) }}</span>
                                @endif
                            </td>
                            <td class="dossier-td">
                                <div class="dossier-title dossier-mono">v{{ $build->version_name ?: '1.0.0' }}</div>
                                <span class="dossier-sub dossier-mono block">Code: {{ $build->version_code ?: '1' }}</span>
                            </td>
                            <td class="dossier-td">
                                @if ($build->artifact_path)
                                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                                        <span class="dossier-pill-sub dossier-mono" style="padding: 0.15rem 0.45rem; font-size: 0.6875rem;">
                                            {{ pathinfo($build->artifact_path, PATHINFO_EXTENSION) ? strtoupper(pathinfo($build->artifact_path, PATHINFO_EXTENSION)) : 'AAB' }}
                                        </span>
                                        <span class="dossier-mono" style="color: #cbd5e1; font-size: 0.75rem; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block;" title="{{ $build->artifact_path }}">
                                            {{ basename($build->artifact_path) }}
                                        </span>
                                    </div>
                                @else
                                    <span class="dossier-sub italic">No binary package</span>
                                @endif
                            </td>
                            <td class="dossier-td">
                                <div class="dossier-title" style="font-size: 0.75rem;">
                                    {{ $build->started_at ? $build->started_at->format('M d, Y H:i') : 'Queued' }}
                                </div>
                                @if ($duration)
                                    <div class="dossier-sub">Duration: {{ $duration }}</div>
                                @endif
                            </td>
                            <td class="dossier-td" style="text-align: right;">
                                @if ($build->error)
                                    <span class="dossier-badge badge-danger" title="{{ $build->error }}">
                                        Error: {{ substr($build->error, 0, 30) }}...
                                    </span>
                                @elseif ($statusVal === 'ready')
                                    <span class="dossier-badge badge-ready">
                                        ✓ Compiled &amp; Signed
                                    </span>
                                @else
                                    <span class="dossier-sub">—</span>
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endif
</div>
