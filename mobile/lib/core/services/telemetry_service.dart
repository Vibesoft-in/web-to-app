import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class TelemetryService {
  static final TelemetryService _instance = TelemetryService._internal();
  factory TelemetryService() => _instance;
  TelemetryService._internal();

  final Dio _dio = Dio();
  String? _appUlid;
  String? _backendBaseUrl;
  String? _deviceId;
  String? _currentSessionId;
  String? _currentScreen;
  DateTime? _screenEnterTime;

  void initialize({
    required String appUlid,
    required String backendBaseUrl,
    required String deviceId,
  }) {
    _appUlid = appUlid;
    _backendBaseUrl = backendBaseUrl;
    _deviceId = deviceId;
    _currentSessionId = 'sess_${DateTime.now().millisecondsSinceEpoch}_${deviceId.substring(0, deviceId.length > 6 ? 6 : deviceId.length)}';

    // Track session start
    trackEvent(eventType: 'session_start', screenName: 'Home', screenId: '/home');
  }

  Future<void> trackScreen(String screenName, String screenId) async {
    if (_currentScreen != null && _screenEnterTime != null) {
      final duration = DateTime.now().difference(_screenEnterTime!).inSeconds;
      await trackEvent(
        eventType: 'screen_view',
        screenName: _currentScreen!,
        screenId: screenId,
        previousScreen: _currentScreen,
        durationSeconds: duration,
      );
    }

    _currentScreen = screenName;
    _screenEnterTime = DateTime.now();
  }

  Future<void> trackEvent({
    required String eventType,
    String? screenName,
    String? screenId,
    String? previousScreen,
    int durationSeconds = 0,
    Map<String, dynamic>? meta,
  }) async {
    if (_appUlid == null || _backendBaseUrl == null) return;

    try {
      final payload = {
        'event_type': eventType,
        'session_id': _currentSessionId,
        'device_id': _deviceId,
        'platform': Platform.isIOS ? 'ios' : 'android',
        'screen_name': screenName ?? _currentScreen ?? 'Home',
        'screen_id': screenId ?? '/home',
        'previous_screen': previousScreen,
        'duration_seconds': durationSeconds,
        'device_model': Platform.operatingSystem,
        'os_version': Platform.operatingSystemVersion,
        'app_version': '1.0.0',
        'country': 'IN',
        'meta': meta,
        'timestamp': DateTime.now().toIso8601String(),
      };

      await _dio.post(
        '$_backendBaseUrl/api/apps/$_appUlid/telemetry/events',
        data: {'events': [payload]},
        options: Options(
          headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
          sendTimeout: const Duration(seconds: 4),
          receiveTimeout: const Duration(seconds: 4),
        ),
      );
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[TelemetryService] Failed to send telemetry: $e');
      }
    }
  }
}
