import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:webintoapp_mobile/core/config/app_config_model.dart';
import 'package:webintoapp_mobile/core/theme/theme_engine.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ThemeEngine Unit Tests', () {
    const fallbackColor = Color(0xFF123456);

    test('parses 6-character hex strings correctly with full alpha', () {
      final color = ThemeEngine.parseColor('#E91E63', fallbackColor);
      expect(color, const Color(0xFFE91E63));
    });

    test('parses 8-character hex strings with custom alpha correctly', () {
      final color = ThemeEngine.parseColor('#80E91E63', fallbackColor);
      expect(color, const Color(0x80E91E63));
    });

    test('parses hex string without hash prefix', () {
      final color = ThemeEngine.parseColor('00FF00', fallbackColor);
      expect(color, const Color(0xFF00FF00));
    });

    test('falls back to default color on invalid hex characters', () {
      final color = ThemeEngine.parseColor('#GG1234', fallbackColor);
      expect(color, fallbackColor);
    });

    test('falls back to default color on malformed length', () {
      final color = ThemeEngine.parseColor('#FFF', fallbackColor);
      expect(color, fallbackColor);
    });

    test('falls back to default color on null value', () {
      final color = ThemeEngine.parseColor(null, fallbackColor);
      expect(color, fallbackColor);
    });

    test('builds ThemeData with custom colors and corner radius', () {
      const themeConfig = ThemeConfig(
        layout: 'theme_b',
        colors: ThemeColors(
          primary: '#10B981',
          secondary: '#1E293B',
          background: '#FAFAFA',
          surface: '#FFFFFF',
          text: '#111827',
        ),
        radius: 16.0,
        font: 'Poppins',
        nav: 'bottom',
      );

      final themeData = ThemeEngine.buildTheme(themeConfig);

      expect(themeData.useMaterial3, true);
      expect(themeData.colorScheme.primary, const Color(0xFF10B981));
      expect(themeData.scaffoldBackgroundColor, const Color(0xFFFAFAFA));
    });
  });
}
