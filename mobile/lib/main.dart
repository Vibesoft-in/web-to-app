import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/env/app_env.dart';
import 'core/providers/core_providers.dart';
import 'core/routing/router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
      systemNavigationBarDividerColor: Colors.transparent,
    ),
  );
  // Keep decoded product thumbnails warm in memory to avoid re-decoding on scroll
  PaintingBinding.instance.imageCache.maximumSize = 150;
  PaintingBinding.instance.imageCache.maximumSizeBytes = 120 << 20; // 120 MB
  runApp(
    const ProviderScope(
      child: WhiteLabelApp(),
    ),
  );
}

class WhiteLabelApp extends ConsumerWidget {
  const WhiteLabelApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final theme = ref.watch(themeDataProvider);
    final config = ref.watch(appConfigProvider).valueOrNull;

    return MaterialApp.router(
      title: config?.app.name ?? AppEnv.appName,
      debugShowCheckedModeBanner: false,
      theme: theme,
      routerConfig: router,
      builder: (context, child) {
        final content = child ?? const SizedBox.shrink();
        // Avoid expensive full-screen BoxShadow & ClipRect on mobile viewports
        if (MediaQuery.sizeOf(context).width <= 480) {
          return content;
        }
        return Container(
          color: const Color(0xFFF1F5F9), // modern soft background on desktop/tablet
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 24,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ClipRect(child: content),
              ),
            ),
          ),
        );
      },
    );
  }
}
