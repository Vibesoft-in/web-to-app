/// App environment variables injected via `--dart-define` at build-time.
///
/// CRITICAL SECURITY RULE:
/// NEVER hardcode secrets or credentials in this file.
/// Only public identifiers (APP_KEY, API_BASE_URL) are allowed.
class AppEnv {
  AppEnv._();

  static const String appKey = String.fromEnvironment(
    'APP_KEY',
    defaultValue: '',
  );

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.webintoapp.com',
  );

  static const String appName = String.fromEnvironment(
    'APP_NAME',
    defaultValue: 'Livaan',
  );

  static const String appVersion = String.fromEnvironment(
    'APP_VERSION',
    defaultValue: '1.0.0',
  );

  static const String appBuildNumber = String.fromEnvironment(
    'APP_BUILD_NUMBER',
    defaultValue: '1',
  );

  static bool get isConfigured => appKey.isNotEmpty;
}
