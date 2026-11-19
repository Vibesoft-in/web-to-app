<x-filament-widgets::widget>
    @php
        $alerts = $this->getAlerts();
    @endphp

    @if (count($alerts) > 0)
        <div class="rounded-xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-950/50 dark:bg-gray-900">
            <div class="flex items-center gap-2 mb-4">
                <span class="relative flex h-3 w-3">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <h3 class="text-base font-bold text-gray-900 dark:text-gray-100">
                    Critical Platform Alerts & Actions Requiring Attention
                </h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                @foreach ($alerts as $alert)
                    <div class="flex flex-col justify-between p-3.5 rounded-lg border {{ $alert['type'] === 'danger' ? 'bg-red-50/60 border-red-200 dark:bg-red-950/20 dark:border-red-900/40' : ($alert['type'] === 'warning' ? 'bg-amber-50/60 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40' : 'bg-blue-50/60 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40') }}">
                        <div>
                            <div class="flex items-center gap-2 mb-1.5 font-bold text-sm {{ $alert['type'] === 'danger' ? 'text-red-700 dark:text-red-400' : ($alert['type'] === 'warning' ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400') }}">
                                <span>{{ $alert['title'] }}</span>
                            </div>
                            <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                                {{ $alert['message'] }}
                            </p>
                        </div>
                        <div>
                            <a href="{{ $alert['action_url'] }}" class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded {{ $alert['type'] === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : ($alert['type'] === 'warning' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-blue-600 text-white hover:bg-blue-700') }} transition">
                                {{ $alert['action_label'] }} &rarr;
                            </a>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
    @endif
</x-filament-widgets::widget>
