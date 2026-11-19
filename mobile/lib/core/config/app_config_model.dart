/// Data model representing runtime app configuration received from GET /v1/app-config.
/// Designed for forward-compatibility: unknown fields or section types are safely ignored.
class AppConfig {
  final int schemaVersion;
  final int configVersion;
  final AppMetadata app;
  final ThemeConfig theme;
  final FeatureConfig features;
  final List<HomeSection> home;
  final LinksConfig links;
  final List<String> webviewAllowedHosts;

  const AppConfig({
    required this.schemaVersion,
    required this.configVersion,
    required this.app,
    required this.theme,
    required this.features,
    required this.home,
    required this.links,
    required this.webviewAllowedHosts,
  });

  factory AppConfig.fromJson(Map<String, dynamic> json) {
    final homeList = <HomeSection>[];
    if (json['home'] is List) {
      for (final item in (json['home'] as List)) {
        if (item is Map<String, dynamic>) {
          try {
            homeList.add(HomeSection.fromJson(item));
          } catch (_) {
            // Ignore malformed individual sections without crashing
          }
        }
      }
    }

    final hosts = <String>[];
    if (json['webview_allowed_hosts'] is List) {
      for (final host in (json['webview_allowed_hosts'] as List)) {
        if (host is String && host.trim().isNotEmpty) {
          hosts.add(host.trim().toLowerCase());
        }
      }
    }

    return AppConfig(
      schemaVersion: (json['schema_version'] as num?)?.toInt() ?? 1,
      configVersion: (json['config_version'] as num?)?.toInt() ?? 1,
      app: AppMetadata.fromJson(
        json['app'] is Map<String, dynamic> ? json['app'] as Map<String, dynamic> : {},
      ),
      theme: ThemeConfig.fromJson(
        json['theme'] is Map<String, dynamic> ? json['theme'] as Map<String, dynamic> : {},
      ),
      features: FeatureConfig.fromJson(
        json['features'] is Map<String, dynamic> ? json['features'] as Map<String, dynamic> : {},
      ),
      home: homeList,
      links: LinksConfig.fromJson(
        json['links'] is Map<String, dynamic> ? json['links'] as Map<String, dynamic> : {},
      ),
      webviewAllowedHosts: hosts,
    );
  }

  Map<String, dynamic> toJson() => {
        'schema_version': schemaVersion,
        'config_version': configVersion,
        'app': app.toJson(),
        'theme': theme.toJson(),
        'features': features.toJson(),
        'home': home.map((h) => h.toJson()).toList(),
        'links': links.toJson(),
        'webview_allowed_hosts': webviewAllowedHosts,
      };

  factory AppConfig.fallback() {
    return AppConfig(
      schemaVersion: 1,
      configVersion: 1,
      app: const AppMetadata(
        name: 'Store',
        currency: 'USD',
        minVersion: '1.0.0',
        maintenance: false,
      ),
      theme: const ThemeConfig(
        layout: 'theme_a',
        colors: ThemeColors(
          primary: '#E53935',
          secondary: '#111111',
          background: '#FFFFFF',
          surface: '#F9FAFB',
          text: '#111111',
        ),
        radius: 12.0,
        font: 'Poppins',
        nav: 'bottom',
      ),
      features: const FeatureConfig(
        wishlist: true,
        otpLogin: true,
        googleLogin: true,
        notifications: true,
        reviews: false,
      ),
      home: const [
        HomeSection(
          type: 'banner',
          items: [
            BannerItem(
              image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
              link: '',
            ),
          ],
        ),
        HomeSection(type: 'categories'),
        HomeSection(type: 'product_rail', title: 'Trending Products', source: 'recent'),
      ],
      links: const LinksConfig(),
      webviewAllowedHosts: const [],
    );
  }
}

class AppMetadata {
  final String name;
  final String currency;
  final String minVersion;
  final bool maintenance;

  const AppMetadata({
    required this.name,
    required this.currency,
    required this.minVersion,
    required this.maintenance,
  });

  factory AppMetadata.fromJson(Map<String, dynamic> json) {
    return AppMetadata(
      name: (json['name'] as String?)?.trim().isNotEmpty == true
          ? json['name'] as String
          : 'Store',
      currency: (json['currency'] as String?)?.toUpperCase() ?? 'USD',
      minVersion: (json['min_version'] as String?) ?? '1.0.0',
      maintenance: json['maintenance'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'currency': currency,
        'min_version': minVersion,
        'maintenance': maintenance,
      };
}

class ThemeColors {
  final String primary;
  final String secondary;
  final String background;
  final String surface;
  final String text;

  const ThemeColors({
    required this.primary,
    required this.secondary,
    required this.background,
    required this.surface,
    required this.text,
  });

  factory ThemeColors.fromJson(Map<String, dynamic> json) {
    return ThemeColors(
      primary: (json['primary'] as String?) ?? '#4F46E5',
      secondary: (json['secondary'] as String?) ?? '#1E293B',
      background: (json['background'] as String?) ?? '#FFFFFF',
      surface: (json['surface'] as String?) ?? '#F8FAFC',
      text: (json['text'] as String?) ?? '#0F172A',
    );
  }

  Map<String, dynamic> toJson() => {
        'primary': primary,
        'secondary': secondary,
        'background': background,
        'surface': surface,
        'text': text,
      };
}

class ThemeConfig {
  final String layout;
  final ThemeColors colors;
  final double radius;
  final String font;
  final String nav;

  const ThemeConfig({
    required this.layout,
    required this.colors,
    required this.radius,
    required this.font,
    required this.nav,
  });

  factory ThemeConfig.fromJson(Map<String, dynamic> json) {
    return ThemeConfig(
      layout: (json['layout'] as String?) ?? 'theme_a',
      colors: ThemeColors.fromJson(
        json['colors'] is Map<String, dynamic> ? json['colors'] as Map<String, dynamic> : {},
      ),
      radius: (json['radius'] as num?)?.toDouble() ?? 12.0,
      font: (json['font'] as String?) ?? 'Poppins',
      nav: (json['nav'] as String?) ?? 'bottom',
    );
  }

  Map<String, dynamic> toJson() => {
        'layout': layout,
        'colors': colors.toJson(),
        'radius': radius,
        'font': font,
        'nav': nav,
      };
}

class FeatureConfig {
  final bool wishlist;
  final bool otpLogin;
  final bool googleLogin;
  final bool notifications;
  final bool reviews;

  const FeatureConfig({
    required this.wishlist,
    required this.otpLogin,
    required this.googleLogin,
    required this.notifications,
    required this.reviews,
  });

  factory FeatureConfig.fromJson(Map<String, dynamic> json) {
    return FeatureConfig(
      wishlist: json['wishlist'] != false,
      otpLogin: json['otp_login'] != false,
      googleLogin: json['google_login'] != false,
      notifications: json['notifications'] != false,
      reviews: json['reviews'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
        'wishlist': wishlist,
        'otp_login': otpLogin,
        'google_login': googleLogin,
        'notifications': notifications,
        'reviews': reviews,
      };
}

class BannerItem {
  final String image;
  final String link;

  const BannerItem({required this.image, required this.link});

  factory BannerItem.fromJson(Map<String, dynamic> json) {
    return BannerItem(
      image: (json['image'] as String?) ?? '',
      link: (json['link'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'image': image,
        'link': link,
      };
}

class HomeSection {
  final String type;
  final String? title;
  final String? source;
  final List<BannerItem> items;
  final Map<String, dynamic> raw;

  const HomeSection({
    required this.type,
    this.title,
    this.source,
    this.items = const [],
    this.raw = const {},
  });

  factory HomeSection.fromJson(Map<String, dynamic> json) {
    final type = (json['type'] as String?)?.toLowerCase() ?? 'unknown';
    final bannerItems = <BannerItem>[];

    if (json['items'] is List) {
      for (final it in (json['items'] as List)) {
        if (it is Map<String, dynamic>) {
          bannerItems.add(BannerItem.fromJson(it));
        }
      }
    }

    return HomeSection(
      type: type,
      title: json['title'] as String?,
      source: json['source'] as String?,
      items: bannerItems,
      raw: json,
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type,
        if (title != null) 'title': title,
        if (source != null) 'source': source,
        if (items.isNotEmpty) 'items': items.map((i) => i.toJson()).toList(),
      };
}

class LinksConfig {
  final String? privacy;
  final String? terms;
  final String? supportPhone;

  const LinksConfig({this.privacy, this.terms, this.supportPhone});

  factory LinksConfig.fromJson(Map<String, dynamic> json) {
    return LinksConfig(
      privacy: json['privacy'] as String?,
      terms: json['terms'] as String?,
      supportPhone: json['support_phone'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        if (privacy != null) 'privacy': privacy,
        if (terms != null) 'terms': terms,
        if (supportPhone != null) 'support_phone': supportPhone,
      };
}
