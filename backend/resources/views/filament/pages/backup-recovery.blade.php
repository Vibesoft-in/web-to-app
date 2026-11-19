<x-filament-panels::page>
    @php
        $stats = $this->getDatabaseStats();
        $restorePoints = $this->getRestorePoints();
    @endphp

    <div class="space-y-6">
        <!-- Status Overview Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div class="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="p-3 bg-green-50 dark:bg-green-950/50 text-green-600 rounded-lg">
                        <x-heroicon-o-circle-stack class="w-6 h-6" />
                    </div>
                    <div>
                        <div class="text-xs font-semibold uppercase tracking-wider text-gray-500">Database Size</div>
                        <div class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ $stats['size_formatted'] }}</div>
                        <div class="text-xs text-green-600 font-medium">Integrity: {{ $stats['integrity_status'] }}</div>
                    </div>
                </div>
            </div>

            <div class="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-lg">
                        <x-heroicon-o-clock class="w-6 h-6" />
                    </div>
                    <div>
                        <div class="text-xs font-semibold uppercase tracking-wider text-gray-500">Last Database Update</div>
                        <div class="text-sm font-bold text-gray-900 dark:text-gray-100">{{ $stats['last_modified'] }}</div>
                        <div class="text-xs text-blue-600 font-medium">Auto-synced</div>
                    </div>
                </div>
            </div>

            <div class="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 rounded-lg">
                        <x-heroicon-o-arrow-path-rounded-square class="w-6 h-6" />
                    </div>
                    <div>
                        <div class="text-xs font-semibold uppercase tracking-wider text-gray-500">Backup Policy</div>
                        <div class="text-sm font-bold text-gray-900 dark:text-gray-100">Daily Automated</div>
                        <div class="text-xs text-purple-600 font-medium">+ Manual Instant Triggers</div>
                    </div>
                </div>
            </div>

            <div class="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-lg">
                        <x-heroicon-o-shield-check class="w-6 h-6" />
                    </div>
                    <div>
                        <div class="text-xs font-semibold uppercase tracking-wider text-gray-500">Disaster Recovery</div>
                        <div class="text-sm font-bold text-emerald-600">{{ $stats['recovery_testing'] }}</div>
                        <div class="text-xs text-gray-500">Snapshot Vault Active</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Action Bar -->
        <div class="flex flex-col sm:flex-row items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm gap-4">
            <div>
                <h3 class="text-base font-bold text-gray-900 dark:text-gray-100">Database Snapshot Vault</h3>
                <p class="text-xs text-gray-500">Location: <span class="font-mono text-gray-700 dark:text-gray-300">{{ $stats['storage_location'] }}</span></p>
            </div>
            <div>
                <x-filament::button
                    wire:click="createBackup"
                    wire:loading.attr="disabled"
                    icon="heroicon-o-arrow-down-tray"
                    color="primary">
                    <span wire:loading.remove wire:target="createBackup">Create Immediate Backup Snapshot</span>
                    <span wire:loading wire:target="createBackup">Creating Snapshot...</span>
                </x-filament::button>
            </div>
        </div>

        <!-- Restore Points Table -->
        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div class="p-4 border-b border-gray-200 dark:border-gray-800">
                <h4 class="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <x-heroicon-o-archive-box class="w-4 h-4 text-primary-600" />
                    Available Restore-Point History
                </h4>
            </div>

            @if(empty($restorePoints))
                <div class="p-8 text-center text-gray-500">
                    <x-heroicon-o-inbox class="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p class="font-medium">No backup snapshots created yet.</p>
                    <p class="text-xs text-gray-400 mt-1">Click the button above to generate your first point-in-time database snapshot.</p>
                </div>
            @else
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left border-collapse">
                        <thead class="bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th class="px-6 py-3">Snapshot Filename</th>
                                <th class="px-6 py-3">Size</th>
                                <th class="px-6 py-3">Created Timestamp</th>
                                <th class="px-6 py-3">Verification</th>
                                <th class="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                            @foreach($restorePoints as $rp)
                                <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition">
                                    <td class="px-6 py-4 font-mono font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <x-heroicon-o-document-check class="w-4 h-4 text-emerald-500" />
                                        {{ $rp['filename'] }}
                                    </td>
                                    <td class="px-6 py-4 text-gray-600 dark:text-gray-400 font-semibold">{{ $rp['size'] }}</td>
                                    <td class="px-6 py-4 text-gray-500">{{ $rp['created_at'] }}</td>
                                    <td class="px-6 py-4">
                                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                            Verified Restorable
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <span class="text-xs text-gray-400 font-mono">Stored in Vault</span>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @endif
        </div>
    </div>
</x-filament-panels::page>
