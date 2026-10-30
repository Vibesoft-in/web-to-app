import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/app_config_model.dart';

/// Converts runtime ThemeConfig tokens into fully formed Material 3 ThemeData.
/// Validates color strings and applies safe fallbacks for missing or malformed tokens.
class ThemeEngine {
  ThemeEngine._();

  static const Color defaultPrimary = Color(0xFF704FEE);
  static const Color defaultSecondary = Color(0xFF1E1B4B);
  static const Color defaultBackground = Color(0xFFFFFFFF);
  static const Color defaultSurface = Color(0xFFF9FAFB);
  static const Color defaultText = Color(0xFF1E1B4B);

  /// Safely converts a hex string (#RRGGBB or #AARRGGBB) to a Color with fallback.
  static Color parseColor(String? hexString, Color fallback) {
    if (hexString == null) return fallback;
    var cleaned = hexString.replaceAll('#', '').trim();

    if (cleaned.length == 6) {
      cleaned = 'FF$cleaned'; // Add full opacity alpha
    }

    if (cleaned.length != 8) return fallback;

    // Validate hexadecimal characters
    final hexRegExp = RegExp(r'^[0-9a-fA-F]{8}$');
    if (!hexRegExp.hasMatch(cleaned)) return fallback;

    try {
      final value = int.parse(cleaned, radix: 16);
      return Color(value);
    } catch (_) {
      return fallback;
    }
  }

  /// Builds a Material 3 ThemeData from dynamic theme configuration
  static ThemeData buildTheme(ThemeConfig config) {
    final primary = parseColor(config.colors.primary, defaultPrimary);
    final secondary = parseColor(config.colors.secondary, defaultSecondary);
    final background = parseColor(config.colors.background, defaultBackground);
    final surface = parseColor(config.colors.surface, defaultSurface);
    final textColor = parseColor(config.colors.text, defaultText);

    final borderRadius = BorderRadius.circular(
      config.radius > 0 && config.radius <= 32 ? config.radius : 12.0,
    );

    final colorScheme = ColorScheme(
      brightness: Brightness.light,
      primary: primary,
      onPrimary: Colors.white,
      secondary: secondary,
      onSecondary: Colors.white,
      error: const Color(0xFFDC2626),
      onError: Colors.white,
      surface: surface,
      onSurface: textColor,
    );

    // Apply font family safely
    TextTheme baseTextTheme = Typography.material2021().black;
    try {
      baseTextTheme = GoogleFonts.getTextTheme(
        config.font.isNotEmpty ? config.font : 'Poppins',
        baseTextTheme,
      );
    } catch (_) {
      // Fallback to system text theme if font not found in GoogleFonts
    }

    final textTheme = baseTextTheme.apply(
      bodyColor: textColor,
      displayColor: textColor,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: surface,
        foregroundColor: textColor,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.bold,
          color: textColor,
        ),
        iconTheme: IconThemeData(color: textColor),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: borderRadius,
          side: BorderSide(color: Colors.grey.withOpacity(0.12)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: borderRadius),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          side: BorderSide(color: primary),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: borderRadius),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide(color: Colors.grey.withOpacity(0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide(color: Colors.grey.withOpacity(0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide(color: primary, width: 1.5),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: primary,
        unselectedItemColor: Colors.grey.shade500,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
    );
  }
}
