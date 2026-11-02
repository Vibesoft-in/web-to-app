import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:dio/io.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/mock_products.dart';

class WcCategory {
  final int id;
  final String name;
  final String slug;
  final int count;
  final String? image;

  const WcCategory({
    required this.id,
    required this.name,
    required this.slug,
    this.count = 0,
    this.image,
  });

  factory WcCategory.fromJson(Map<String, dynamic> json) {
    String? imgUrl;
    if (json['image'] is Map && json['image']['src'] is String) {
      imgUrl = json['image']['src'] as String;
    } else if (json['image'] is String) {
      imgUrl = json['image'] as String;
    }

    final rawName = (json['name'] as String?)?.trim() ?? '';
    final cleanName = rawName
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#8217;', "'")
        .replaceAll('&#8243;', '"')
        .replaceAll('&#8211;', '-')
        .replaceAll(RegExp(r'&[^;]+;'), ' ')
        .trim();

    return WcCategory(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: cleanName,
      slug: (json['slug'] as String?)?.trim() ?? '',
      count: (json['count'] as num?)?.toInt() ?? 0,
      image: imgUrl,
    );
  }
}

class WcPaymentGateway {
  final String id;
  final String title;
  final String description;
  final bool enabled;

  const WcPaymentGateway({
    required this.id,
    required this.title,
    required this.description,
    required this.enabled,
  });

  factory WcPaymentGateway.fromJson(Map<String, dynamic> json) {
    final title = (json['title'] as String?)?.trim();
    final methodTitle = (json['method_title'] as String?)?.trim();
    return WcPaymentGateway(
      id: (json['id'] as String?) ?? '',
      title: (title != null && title.isNotEmpty)
          ? title
          : ((methodTitle != null && methodTitle.isNotEmpty) ? methodTitle : 'Payment Method'),
      description: (json['description'] as String?)?.trim() ?? '',
      enabled: json['enabled'] == true,
    );
  }
}

class WcCouponValidationResult {
  final bool isValid;
  final String? message;
  final String code;
  final double discountAmount;
  final String discountType;

  const WcCouponValidationResult({
    required this.isValid,
    this.message,
    this.code = '',
    this.discountAmount = 0.0,
    this.discountType = 'fixed_cart',
  });

  double calculateDiscount(double subtotal) {
    if (!isValid || subtotal <= 0) return 0.0;
    if (discountType == 'percent') {
      return (subtotal * (discountAmount / 100.0)).clamp(0.0, subtotal);
    }
    return discountAmount.clamp(0.0, subtotal);
  }
}

class WcProduct {
  final String id;
  final String title;
  final double price;
  final double? regularPrice;
  final double? salePrice;
  final String? discount;
  final List<String> images;
  final List<String> categories;
  final List<int> categoryIds;
  final List<String> colors;
  final List<String> sizes;
  final String description;
  final String shortDescription;
  final List<String> features;
  final double rating;
  final int reviewsCount;
  final bool inStock;

  const WcProduct({
    required this.id,
    required this.title,
    required this.price,
    this.regularPrice,
    this.salePrice,
    this.discount,
    required this.images,
    required this.categories,
    required this.categoryIds,
    this.colors = const [],
    this.sizes = const [],
    this.description = '',
    this.shortDescription = '',
    this.features = const [],
    this.rating = 4.8,
    this.reviewsCount = 120,
    this.inStock = true,
  });

  String get primaryImage {
    if (images.isNotEmpty && images.first.isNotEmpty) {
      return images.first;
    }
    return 'https://livaan.in/wp-content/uploads/2025/01/1-4.png';
  }

  factory WcProduct.fromJson(Map<String, dynamic> json) {
    final imgs = <String>[];
    final seenUrls = <String>{};
    if (json['images'] is List) {
      for (final img in (json['images'] as List)) {
        String? src;
        if (img is Map && img['src'] is String && (img['src'] as String).isNotEmpty) {
          src = (img['src'] as String).trim();
        } else if (img is String && img.trim().isNotEmpty) {
          src = img.trim();
        }
        if (src != null && src.isNotEmpty && !seenUrls.contains(src)) {
          seenUrls.add(src);
          imgs.add(src);
        }
      }
    }

    final catNames = <String>[];
    final catIds = <int>[];
    if (json['categories'] is List) {
      for (final c in (json['categories'] as List)) {
        if (c is Map) {
          if (c['name'] is String) {
            final cn = (c['name'] as String)
                .replaceAll('&amp;', '&')
                .replaceAll('&quot;', '"')
                .replaceAll('&#8217;', "'")
                .replaceAll('&#8243;', '"')
                .replaceAll('&#8211;', '-')
                .replaceAll(RegExp(r'&[^;]+;'), ' ')
                .trim();
            catNames.add(cn);
          }
          if (c['id'] is num) catIds.add((c['id'] as num).toInt());
        } else if (c is String) {
          catNames.add(c);
        }
      }
    }

    // Extract colors & sizes from WooCommerce attributes (Only true color attributes)
    final colorOptions = <String>[];
    final sizeOptions = <String>[];
    if (json['attributes'] is List) {
      for (final attr in (json['attributes'] as List)) {
        if (attr is Map) {
          final name = (attr['name'] as String?)?.toLowerCase().trim() ?? '';
          final slug = (attr['slug'] as String?)?.toLowerCase().trim() ?? '';
          final options = attr['options'];
          final optList = <String>[];
          if (options is List) {
            for (final opt in options) {
              if (opt != null && opt.toString().trim().isNotEmpty) {
                optList.add(opt.toString().trim());
              }
            }
          }
          final isColorAttr = name == 'color' ||
              name == 'colour' ||
              slug == 'pa_color' ||
              slug == 'pa_colour' ||
              slug == 'color';
          final isSizeAttr = name == 'size' || slug == 'pa_size' || slug == 'size';

          if (isColorAttr) {
            colorOptions.addAll(optList);
          } else if (isSizeAttr) {
            sizeOptions.addAll(optList);
          }
        }
      }
    }

    var parsedPrice = double.tryParse(json['price']?.toString() ?? '') ?? 0.0;
    var parsedRegPrice = double.tryParse(json['regular_price']?.toString() ?? '');
    var parsedSalePrice = double.tryParse(json['sale_price']?.toString() ?? '');

    // Support WooCommerce Store API prices object (with minor units, e.g. 80000 -> 800.0)
    if (json['prices'] is Map) {
      final pMap = json['prices'] as Map;
      final minorUnit = (pMap['currency_minor_unit'] as num?)?.toInt() ?? 2;
      final factor = pow(10, minorUnit).toDouble();

      final pMinor = double.tryParse(pMap['price']?.toString() ?? '');
      final regMinor = double.tryParse(pMap['regular_price']?.toString() ?? '');
      final saleMinor = double.tryParse(pMap['sale_price']?.toString() ?? '');

      if (pMinor != null && pMinor > 0) parsedPrice = pMinor / factor;
      if (regMinor != null && regMinor > 0) parsedRegPrice = regMinor / factor;
      if (saleMinor != null && saleMinor > 0) parsedSalePrice = saleMinor / factor;
    }

    // For variable products, WooCommerce sends regular & sale prices in price_html
    final rawPriceHtml = (json['price_html'] as String?) ?? '';
    if (rawPriceHtml.isNotEmpty) {
      final cleanPriceHtml = rawPriceHtml.replaceAll(RegExp(r'&[^;]+;'), '');
      if (parsedRegPrice == null || parsedRegPrice == 0.0) {
        final delRegex = RegExp(r'<del[^>]*>[\s\S]*?([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)[\s\S]*?<\/del>');
        final m = delRegex.firstMatch(cleanPriceHtml);
        if (m != null) {
          final numStr = m.group(1)!.replaceAll(',', '');
          parsedRegPrice = double.tryParse(numStr);
        }
      }
      if (parsedSalePrice == null || parsedSalePrice == 0.0) {
        final insRegex = RegExp(r'<ins[^>]*>[\s\S]*?([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)[\s\S]*?<\/ins>');
        final m = insRegex.firstMatch(cleanPriceHtml);
        if (m != null) {
          final numStr = m.group(1)!.replaceAll(',', '');
          parsedSalePrice = double.tryParse(numStr);
        }
      }
    }

    if (parsedPrice == 0.0) {
      if (parsedSalePrice != null && parsedSalePrice > 0) {
        parsedPrice = parsedSalePrice;
      } else if (parsedRegPrice != null && parsedRegPrice > 0) {
        parsedPrice = parsedRegPrice;
      }
    }

    String? discount;
    if (parsedRegPrice != null && parsedRegPrice > parsedPrice && parsedPrice > 0) {
      final pct = (((parsedRegPrice - parsedPrice) / parsedRegPrice) * 100).round();
      discount = '-$pct%';
    }

    String cleanHtml(String html) {
      return html
          .replaceAll('&amp;', '&')
          .replaceAll('&quot;', '"')
          .replaceAll('&#8217;', "'")
          .replaceAll('&#8243;', '"')
          .replaceAll('&#8211;', '-')
          .replaceAll('&#8220;', '"')
          .replaceAll('&#8221;', '"')
          .replaceAll('&#8216;', "'")
          .replaceAll('&nbsp;', ' ')
          .replaceAll(RegExp(r'<[^>]*>'), ' ')
          .replaceAll(RegExp(r'\s+'), ' ')
          .trim();
    }

    final rawDesc = (json['description'] as String?) ?? '';
    final rawShort = (json['short_description'] as String?) ?? '';

    // Extract dynamic features: check both rawDesc and rawShort
    final extractedFeatures = <String>[];
    final combinedHtml = '$rawDesc $rawShort';
    final liMatches = RegExp(r'<li[^>]*>(.*?)<\/li>', caseSensitive: false, dotAll: true)
        .allMatches(combinedHtml);
    for (final m in liMatches) {
      final item = cleanHtml(m.group(1) ?? '');
      if (item.isNotEmpty && !extractedFeatures.contains(item) && item.length <= 160) {
        extractedFeatures.add(item);
      }
    }

    // If <li> items were not found, extract from table rows
    if (extractedFeatures.isEmpty) {
      final trMatches = RegExp(r'<tr[^>]*>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>', caseSensitive: false, dotAll: true)
          .allMatches(combinedHtml);
      for (final m in trMatches) {
        final key = cleanHtml(m.group(1) ?? '');
        final val = cleanHtml(m.group(2) ?? '');
        if (key.isNotEmpty && val.isNotEmpty && key.toLowerCase() != 'specification') {
          extractedFeatures.add('$key: $val');
        }
      }
    }

    // Fallback designer features if still empty
    if (extractedFeatures.isEmpty) {
      extractedFeatures.addAll([
        '100% Premium Quality Fabric',
        'Authentic Livaan Designer Wear',
        'Comfortable All-Day Fit',
        'Fast Shipping & Easy Returns',
      ]);
    }

    // Extract clean readable paragraphs for description
    String cleanDesc = '';
    final pMatches = RegExp(r'<p[^>]*>(.*?)<\/p>', caseSensitive: false, dotAll: true).allMatches(rawDesc);
    if (pMatches.isNotEmpty) {
      final pTexts = <String>[];
      for (final pm in pMatches) {
        final t = cleanHtml(pm.group(1) ?? '');
        final lower = t.toLowerCase();
        if (t.isNotEmpty && t != '&nbsp;' && lower != 'key features:' && lower != 'key features' && lower != 'features:') {
          pTexts.add(t);
        }
      }
      if (pTexts.isNotEmpty) {
        cleanDesc = pTexts.join('\n\n');
      }
    }

    if (cleanDesc.isEmpty) {
      final withoutLists = rawDesc.replaceAll(RegExp(r'<ul[^>]*>[\s\S]*?<\/ul>'), ' ');
      final rawCleaned = cleanHtml(withoutLists).replaceFirst(RegExp(r'^key features:\s*', caseSensitive: false), '').trim();
      if (rawCleaned.isNotEmpty) {
        cleanDesc = rawCleaned;
      }
    }

    if (cleanDesc.isEmpty && rawShort.isNotEmpty) {
      final cleanedShort = cleanHtml(rawShort).replaceFirst(RegExp(r'^key features:\s*', caseSensitive: false), '').trim();
      if (cleanedShort.isNotEmpty) {
        cleanDesc = cleanedShort;
      }
    }

    if (cleanDesc.isEmpty || cleanDesc.toLowerCase() == 'key features:' || cleanDesc.toLowerCase() == 'key features') {
      cleanDesc = 'Elevate your wardrobe with this stylish designer piece from Livaan, tailored for exceptional comfort, quality fabric and timeless elegance.';
    }

    final cleanShort = cleanHtml(rawShort);

    // Clean title from HTML entities
    final rawName = (json['name'] as String?)?.trim() ?? 'Untitled Product';
    final cleanTitle = cleanHtml(rawName);

    return WcProduct(
      id: json['id']?.toString() ?? '',
      title: cleanTitle.isNotEmpty ? cleanTitle : 'Untitled Product',
      price: parsedPrice > 0 ? parsedPrice : (parsedRegPrice ?? 800.0),
      regularPrice: parsedRegPrice,
      salePrice: parsedSalePrice,
      discount: discount,
      images: imgs.isNotEmpty ? imgs : ['https://livaan.in/wp-content/uploads/2025/01/1-4.png'],
      categories: catNames,
      categoryIds: catIds,
      colors: colorOptions,
      sizes: sizeOptions,
      description: cleanDesc,
      shortDescription: cleanShort,
      features: extractedFeatures,
      rating: double.tryParse(json['average_rating']?.toString() ?? '') ?? 4.8,
      reviewsCount: (json['rating_count'] as num?)?.toInt() ?? (json['review_count'] as num?)?.toInt() ?? 12,
      inStock: json['is_in_stock'] == true || json['stock_status'] == 'instock',
    );
  }

  Map<String, dynamic> toMap() => {
    'id': id,
    'title': title,
    'price': price,
    'originalPrice': regularPrice,
    'discount': discount,
    'image': primaryImage,
    'images': images,
    'categories': categories,
    'colors': colors,
    'sizes': sizes,
    'features': features,
  };

  DetailedProduct toDetailedProduct() => DetailedProduct(
    id: id,
    title: title,
    price: price,
    originalPrice: regularPrice,
    rating: rating,
    reviewsCount: reviewsCount > 0 ? reviewsCount : 45,
    images: images.isNotEmpty ? images : [primaryImage],
    description: description,
    colors: colors,
    features: features.isNotEmpty
        ? features
        : [
            '100% Premium Quality Fabric',
            'Authentic Livaan Designer Wear',
            'Comfortable All-Day Fit',
            'Fast Shipping & Easy Returns',
          ],
  );
}

class WooCommerceService {
  static const String storeName = 'Livaan';
  static const String baseUrl = 'https://livaan.in/wp-json/wc/v3';
  static const String consumerKey = 'ck_0ac8ff9e2992f335f3e243abda2744ceef09877f';
  static const String consumerSecret = 'cs_21bf9715953849d58bd3a110bf77722f2bec88dc';

  static const String siteLogoUrl =
      'https://livaan.in/wp-content/uploads/2025/01/cropped-1-4-png.avif';
  static const String siteLogoWhiteUrl =
      'https://livaan.in/wp-content/uploads/2025/01/cropped-1-4-png.avif';
  static const String siteIconUrl =
      'https://livaan.in/wp-content/uploads/2025/01/cropped-1-4-png.avif';

  /// Centralized in-memory cache of all fetched products by ID
  static final Map<String, WcProduct> _productCache = {};

  static void cacheProduct(WcProduct product) {
    if (product.id.isNotEmpty) {
      _productCache[product.id] = product;
    }
  }

  static void cacheProducts(Iterable<WcProduct> products) {
    for (final p in products) {
      if (p.id.isNotEmpty) {
        _productCache[p.id] = p;
      }
    }
  }

  static WcProduct? getCachedProduct(String id) {
    final clean = id.trim();
    if (_productCache.containsKey(clean)) {
      return _productCache[clean];
    }
    for (final p in initialProducts) {
      if (p.id == clean) {
        _productCache[clean] = p;
        return p;
      }
    }
    return null;
  }

  late final Dio _dio;

  WooCommerceService() {
    final basicAuth = 'Basic ${base64Encode(utf8.encode('$consumerKey:$consumerSecret'))}';
    _dio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Authorization': basicAuth,
      },
    ));
    if (!kIsWeb) {
      final adapter = _dio.httpClientAdapter;
      if (adapter is IOHttpClientAdapter) {
        adapter.createHttpClient = () {
          final client = HttpClient();
          client.badCertificateCallback = (X509Certificate cert, String host, int port) => true;
          return client;
        };
      }
    }
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final q = Map<String, dynamic>.from(options.queryParameters);
          q.putIfAbsent('consumer_key', () => consumerKey);
          q.putIfAbsent('consumer_secret', () => consumerSecret);
          options.queryParameters = q;
          handler.next(options);
        },
      ),
    );
    // Seed the cache with initial products
    cacheProducts(initialProducts);
  }

  /// Seed Categories (empty by default; populated directly from WooCommerce API)
  static List<WcCategory> initialCategories = [];

  /// Seed Products (empty by default; populated directly from WooCommerce API)
  static List<WcProduct> initialProducts = [];

  void _refreshProductsInBackground() async {
    try {
      final response = await _dio.get(
        '$baseUrl/products',
        queryParameters: {
          'per_page': 100,
          'consumer_key': consumerKey,
          'consumer_secret': consumerSecret,
        },
      );
      final data = response.data;
      if (data is List) {
        final list = <WcProduct>[];
        for (final item in data) {
          if (item is Map<String, dynamic>) {
            final p = WcProduct.fromJson(item);
            if (p.price > 0 || p.images.isNotEmpty) {
              list.add(p);
            }
          }
        }
        if (list.isNotEmpty) {
          cacheProducts(list);
          initialProducts = list;
        }
      }
    } catch (_) {}
  }

  Future<List<WcCategory>> fetchCategories() async {
    try {
      final response = await _dio.get(
        '$baseUrl/products/categories',
        queryParameters: {
          'per_page': 50,
          'hide_empty': true,
          'consumer_key': consumerKey,
          'consumer_secret': consumerSecret,
        },
      );

      final data = response.data;
      if (data is List) {
        final list = <WcCategory>[];
        for (final item in data) {
          if (item is Map<String, dynamic>) {
            final cat = WcCategory.fromJson(item);
            if (cat.name.toLowerCase() != 'uncategorized' && cat.count > 0) {
              list.add(cat);
            }
          }
        }
        if (list.isNotEmpty) {
          initialCategories = list;
          return list;
        }
      }
    } catch (_) {
      // Fallback to initialCategories
    }
    return initialCategories;
  }

  Future<List<WcProduct>> fetchProducts({int? categoryId, String? search}) async {
    if (categoryId == null && (search == null || search.trim().isEmpty) && initialProducts.isNotEmpty) {
      // Silently refresh in background without delaying UI
      _refreshProductsInBackground();
      return initialProducts;
    }
    try {
      final queryParams = <String, dynamic>{
        'per_page': 100,
        'consumer_key': consumerKey,
        'consumer_secret': consumerSecret,
      };

      if (categoryId != null && categoryId > 0) {
        queryParams['category'] = categoryId;
      }

      if (search != null && search.trim().isNotEmpty) {
        queryParams['search'] = search.trim();
      }

      final response = await _dio.get(
        '$baseUrl/products',
        queryParameters: queryParams,
      );

      final data = response.data;
      if (data is List) {
        final list = <WcProduct>[];
        for (final item in data) {
          if (item is Map<String, dynamic>) {
            final p = WcProduct.fromJson(item);
            if (p.price > 0 || p.images.isNotEmpty) {
              list.add(p);
            }
          }
        }
        if (list.isNotEmpty) {
          cacheProducts(list);
          if (categoryId == null && (search == null || search.trim().isEmpty)) {
            initialProducts = list;
          }
          return list;
        }
      }
    } catch (_) {
      // Fallback
    }

    var result = List<WcProduct>.from(initialProducts);
    if (categoryId != null && categoryId > 0) {
      result = result.where((p) => p.categoryIds.contains(categoryId)).toList();
    }
    if (search != null && search.trim().isNotEmpty) {
      final q = search.trim().toLowerCase();
      result = result.where((p) => p.title.toLowerCase().contains(q)).toList();
    }
    cacheProducts(result);
    return result;
  }

  /// Fetches a single product by ID directly from WooCommerce REST API
  Future<WcProduct?> fetchProductById(String id) async {
    final cleanId = id.trim();
    if (cleanId.isEmpty) return null;

    final cached = getCachedProduct(cleanId);
    if (cached != null) return cached;

    try {
      final response = await _dio.get(
        '$baseUrl/products/$cleanId',
      );
      final data = response.data;
      if (data is Map<String, dynamic>) {
        final p = WcProduct.fromJson(data);
        cacheProduct(p);
        return p;
      }
    } catch (_) {}
    return null;
  }

  /// Searches for a customer in the WooCommerce store database by email, username, or phone
  Future<WcCustomer?> findCustomer(String query) async {
    final clean = query.trim();
    if (clean.isEmpty) return null;

    try {
      // 1. If it's an email address, try direct email query in WooCommerce database
      if (clean.contains('@')) {
        final emailRes = await _dio.get(
          '$baseUrl/customers',
          queryParameters: {
            'email': clean.toLowerCase(),
            'role': 'all',
            'consumer_key': consumerKey,
            'consumer_secret': consumerSecret,
          },
        );
        if (emailRes.data is List && (emailRes.data as List).isNotEmpty) {
          for (final item in (emailRes.data as List)) {
            if (item is Map<String, dynamic>) {
              final cust = WcCustomer.fromJson(item);
              if (cust.email.toLowerCase() == clean.toLowerCase()) {
                debugPrint('findCustomer: Found customer by email: ${cust.email} (id: ${cust.id})');
                return cust;
              }
            }
          }
        }
      }

      // 2. Search by search query (username or name)
      final response = await _dio.get(
        '$baseUrl/customers',
        queryParameters: {
          'search': clean,
          'role': 'all',
          'per_page': 50,
          'consumer_key': consumerKey,
          'consumer_secret': consumerSecret,
        },
      );

      final data = response.data;
      if (data is List && data.isNotEmpty) {
        for (final item in data) {
          if (item is Map<String, dynamic>) {
            final cust = WcCustomer.fromJson(item);
            final cleanPhone = clean.replaceAll(RegExp(r'\D'), '');
            final custPhone = cust.phone.replaceAll(RegExp(r'\D'), '');
            if (cust.email.toLowerCase() == clean.toLowerCase() ||
                cust.username.toLowerCase() == clean.toLowerCase() ||
                (cleanPhone.length >= 7 && custPhone.isNotEmpty && (custPhone.endsWith(cleanPhone) || cleanPhone.endsWith(custPhone)))) {
              debugPrint('findCustomer: Found customer by search query: ${cust.email} (id: ${cust.id})');
              return cust;
            }
          }
        }
      }

      // 3. WooCommerce search parameter does NOT search phone numbers.
      // Fetch recent customers to match phone or username directly
      final allRes = await _dio.get(
        '$baseUrl/customers',
        queryParameters: {
          'role': 'all',
          'per_page': 100,
          'consumer_key': consumerKey,
          'consumer_secret': consumerSecret,
        },
      );

      final allData = allRes.data;
      if (allData is List && allData.isNotEmpty) {
        final cleanPhone = clean.replaceAll(RegExp(r'\D'), '');
        for (final item in allData) {
          if (item is Map<String, dynamic>) {
            final cust = WcCustomer.fromJson(item);
            final custPhone = cust.phone.replaceAll(RegExp(r'\D'), '');
            if (cust.email.toLowerCase() == clean.toLowerCase() ||
                cust.username.toLowerCase() == clean.toLowerCase() ||
                (cleanPhone.length >= 7 && custPhone.isNotEmpty && (custPhone.endsWith(cleanPhone) || cleanPhone.endsWith(custPhone)))) {
              debugPrint('findCustomer: Found customer in list: ${cust.email} (id: ${cust.id})');
              return cust;
            }
          }
        }
      }
    } catch (e) {
      debugPrint('findCustomer error: $e');
    }

    return null;
  }

  /// Authenticates a customer against the store website (https://lighting.rishabhtyagi.in)
  /// Checks whether customer exists in website database and validates password.
  /// Also supports local user profile fallback for users registered in the app.
  Future<WcAuthResult> authenticateCustomer({
    required String emailOrPhone,
    required String password,
    Map<String, dynamic>? localUserData,
  }) async {
    final input = emailOrPhone.trim();
    final pwd = password.trim();

    if (input.isEmpty) {
      return WcAuthResult.error('Please enter your registered email or phone number.');
    }
    if (pwd.isEmpty) {
      return WcAuthResult.error('Please enter your password.');
    }

    // 1. Verify customer exists in the live WooCommerce database
    final matchedCust = await findCustomer(input);

    if (matchedCust == null) {
      // If not found online in WooCommerce, check local registered data
      if (localUserData != null) {
        final localPwd = localUserData['password']?.toString() ?? '';
        final localEmail = localUserData['email']?.toString().toLowerCase() ?? '';
        final localPhone = (localUserData['phone']?.toString() ?? '').replaceAll(RegExp(r'\D'), '');
        final cleanDigits = input.replaceAll(RegExp(r'\D'), '');
        final isMatch = (localEmail.isNotEmpty && localEmail == input.toLowerCase()) ||
            (cleanDigits.length >= 7 && localPhone.isNotEmpty && (localPhone.endsWith(cleanDigits) || cleanDigits.endsWith(localPhone)));

        if (isMatch) {
          if (localPwd == pwd) {
            final cust = WcCustomer(
              id: (localUserData['id'] as num?)?.toInt() ?? 0,
              email: localEmail,
              username: localUserData['username']?.toString() ?? localEmail.split('@').first,
              firstName: localUserData['name']?.toString().split(' ').first ?? 'Customer',
              lastName: localUserData['name']?.toString().split(' ').skip(1).join(' ') ?? '',
              phone: localUserData['phone']?.toString() ?? '',
            );
            return WcAuthResult.ok(cust);
          } else {
            return WcAuthResult.wrongPassword('Galat password! Kripya apna sahi password dalein.');
          }
        }
      }

      return WcAuthResult.newUser(
        'Account not found! Yeh account hamare website database mein registered nahi hai. Kripya pehle Sign Up karein.',
      );
    }

    // Customer was found in WooCommerce database!
    final resolvedLogin = matchedCust.username.isNotEmpty
        ? matchedCust.username
        : matchedCust.email;

    // 2. Authenticate customer credentials against WordPress live auth
    try {
      final authDio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        followRedirects: false,
        validateStatus: (status) => status != null && status < 500,
        headers: {
          'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      ));

      final response = await authDio.post(
        'https://livaan.in/wp-login.php',
        data: {
          'log': resolvedLogin,
          'pwd': pwd,
          'wp-submit': 'Log In',
        },
      );

      // Check cookies for logged in session
      final setCookies = response.headers['set-cookie'] ?? [];
      final hasLoginCookie = setCookies.any((c) => c.contains('wordpress_logged_in'));
      final location = response.headers['location']?.firstOrNull ?? '';

      if (response.statusCode == 302 ||
          hasLoginCookie ||
          location.contains('wp-admin') ||
          location.contains('profile.php') ||
          location.contains('my-account')) {
        // Save session cookie for Store API & cart synchronization
        if (setCookies.isNotEmpty) {
          _authCookie = setCookies.join('; ');
        }
        return WcAuthResult.ok(matchedCust);
      }

      // If resolvedLogin was username and it did not redirect, also try with email
      if (matchedCust.email.isNotEmpty && matchedCust.email != resolvedLogin) {
        final emailResponse = await authDio.post(
          'https://livaan.in/wp-login.php',
          data: {
            'log': matchedCust.email,
            'pwd': pwd,
            'wp-submit': 'Log In',
          },
        );
        final eCookies = emailResponse.headers['set-cookie'] ?? [];
        final eHasLogin = eCookies.any((c) => c.contains('wordpress_logged_in'));
        final eLoc = emailResponse.headers['location']?.firstOrNull ?? '';
        if (emailResponse.statusCode == 302 ||
            eHasLogin ||
            eLoc.contains('wp-admin') ||
            eLoc.contains('profile.php') ||
            eLoc.contains('my-account')) {
          if (eCookies.isNotEmpty) {
            _authCookie = eCookies.join('; ');
          }
          return WcAuthResult.ok(matchedCust);
        }
      }

      // Check if local registered password matches (for users who signed up in app)
      if (localUserData != null) {
        final localPwd = localUserData['password']?.toString() ?? '';
        if (localPwd.isNotEmpty && localPwd == pwd) {
          // Password matches! Sync password to WooCommerce database right now so future logins work with WordPress
          try {
            await _dio.put(
              '$baseUrl/customers/${matchedCust.id}',
              queryParameters: {
                'consumer_key': consumerKey,
                'consumer_secret': consumerSecret,
              },
              data: {'password': pwd},
            );
          } catch (_) {}
          return WcAuthResult.ok(matchedCust);
        }
      }

      // If status is 200, check the error message in the HTML body
      final body = response.data?.toString() ?? '';
      if (body.contains('The password you entered') ||
          body.contains('incorrect') ||
          body.contains('login_error') ||
          body.contains('notice-error')) {
        return WcAuthResult.wrongPassword(
          'Galat password! Kripya apna sahi password dalein ya website par password reset karein.',
        );
      }

      return WcAuthResult.wrongPassword(
        'Galat password! Kripya apna sahi password dalein.',
      );
    } catch (e) {
      debugPrint('authenticateCustomer error: $e');
      if (localUserData != null) {
        final localPwd = localUserData['password']?.toString() ?? '';
        if (localPwd.isNotEmpty && localPwd == pwd) {
          return WcAuthResult.ok(matchedCust);
        }
      }
      return WcAuthResult.error('Store server connection error: ${e.toString()}');
    }
  }

  /// Fetches enabled payment gateways configured on the WooCommerce store
  Future<List<WcPaymentGateway>> fetchPaymentGateways() async {
    try {
      final response = await _dio.get(
        '$baseUrl/payment_gateways',
        queryParameters: {
          'consumer_key': consumerKey,
          'consumer_secret': consumerSecret,
        },
      );
      if (response.data is List) {
        final list = (response.data as List)
            .whereType<Map<String, dynamic>>()
            .map((item) => WcPaymentGateway.fromJson(item))
            .where((g) => g.enabled)
            .toList();
        if (list.isNotEmpty) return list;
      }
    } catch (e) {
      debugPrint('fetchPaymentGateways error: $e');
    }
    // Fallback to active gateways on store
    return const [
      WcPaymentGateway(
        id: 'razorpay',
        title: 'UPI, Cards, NetBanking',
        description: 'Pay securely using UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, or NetBanking.',
        enabled: true,
      ),
      WcPaymentGateway(
        id: 'cod',
        title: 'Cash on delivery',
        description: 'Pay with cash upon delivery of your order.',
        enabled: true,
      ),
    ];
  }

  /// Dynamically validates a discount coupon against the WooCommerce store database
  Future<WcCouponValidationResult> validateCoupon(String code, double currentSubtotal) async {
    final clean = code.trim().toLowerCase();
    if (clean.isEmpty) {
      return const WcCouponValidationResult(isValid: false, message: 'Please enter a coupon code.');
    }
    try {
      final response = await _dio.get(
        '$baseUrl/coupons',
        queryParameters: {
          'code': clean,
          'consumer_key': consumerKey,
          'consumer_secret': consumerSecret,
        },
      );
      if (response.data is List && (response.data as List).isNotEmpty) {
        final couponData = (response.data as List).first as Map<String, dynamic>;
        final minSpend = double.tryParse(couponData['minimum_amount']?.toString() ?? '0') ?? 0.0;
        if (minSpend > 0 && currentSubtotal < minSpend) {
          return WcCouponValidationResult(
            isValid: false,
            code: clean,
            message: 'Minimum order amount for coupon "$clean" is ₹${minSpend.toStringAsFixed(0)}.',
          );
        }
        final expiry = couponData['date_expires'];
        if (expiry != null) {
          final expDate = DateTime.tryParse(expiry.toString());
          if (expDate != null && expDate.isBefore(DateTime.now())) {
            return WcCouponValidationResult(
              isValid: false,
              code: clean,
              message: 'This coupon has expired on the store.',
            );
          }
        }
        final discountType = (couponData['discount_type'] as String?) ?? 'fixed_cart';
        final amount = double.tryParse(couponData['amount']?.toString() ?? '0') ?? 0.0;
        return WcCouponValidationResult(
          isValid: true,
          code: clean.toUpperCase(),
          discountAmount: amount,
          discountType: discountType,
          message: 'Coupon "${clean.toUpperCase()}" applied successfully!',
        );
      } else {
        return WcCouponValidationResult(
          isValid: false,
          code: clean,
          message: 'Coupon "$code" is invalid or not active on store.',
        );
      }
    } catch (e) {
      debugPrint('validateCoupon error: $e');
      return WcCouponValidationResult(
        isValid: false,
        code: clean,
        message: 'Could not verify coupon with store website.',
      );
    }
  }

  /// Creates a live order directly in WooCommerce store database
  Future<Map<String, dynamic>?> createOrder({
    required int customerId,
    required String firstName,
    required String lastName,
    required String email,
    required String phone,
    required String address,
    required String city,
    required String state,
    required String postcode,
    required String paymentMethodId,
    required String paymentMethodTitle,
    required List<Map<String, dynamic>> lineItems,
    String? couponCode,
  }) async {
    try {
      final body = <String, dynamic>{
        if (customerId > 0) 'customer_id': customerId,
        'payment_method': paymentMethodId,
        'payment_method_title': paymentMethodTitle,
        'set_paid': paymentMethodId == 'cod' ? false : false,
        'billing': {
          'first_name': firstName.isNotEmpty ? firstName : 'Store',
          'last_name': lastName.isNotEmpty ? lastName : 'Customer',
          'address_1': address.isNotEmpty ? address : 'Main Road',
          'city': city.isNotEmpty ? city : 'Delhi',
          'state': state.isNotEmpty ? state : 'DL',
          'postcode': postcode.isNotEmpty ? postcode : '110001',
          'email': email,
          'phone': phone.isNotEmpty ? phone : '9876543210',
        },
        'shipping': {
          'first_name': firstName.isNotEmpty ? firstName : 'Store',
          'last_name': lastName.isNotEmpty ? lastName : 'Customer',
          'address_1': address.isNotEmpty ? address : 'Main Road',
          'city': city.isNotEmpty ? city : 'Delhi',
          'state': state.isNotEmpty ? state : 'DL',
          'postcode': postcode.isNotEmpty ? postcode : '110001',
          'country': 'IN',
        },
        'line_items': lineItems,
      };

      if (couponCode != null && couponCode.trim().isNotEmpty) {
        body['coupon_lines'] = [
          {'code': couponCode.trim()}
        ];
      }

      final response = await _dio.post(
        '$baseUrl/orders',
        queryParameters: {
          'consumer_key': consumerKey,
          'consumer_secret': consumerSecret,
        },
        data: body,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (response.data is Map<String, dynamic>) {
          return response.data as Map<String, dynamic>;
        }
      }
    } catch (e) {
      debugPrint('createOrder error: $e');
    }
    return null;
  }

  /// Fetches an order by ID or order number directly from WooCommerce for live tracking
  Future<Map<String, dynamic>?> trackOrderById(String orderId) async {
    final cleanId = orderId.replaceAll(RegExp(r'\D'), '').trim();
    if (cleanId.isEmpty) return null;
    try {
      final response = await _dio.get(
        '$baseUrl/orders/$cleanId',
        queryParameters: {
          'consumer_key': consumerKey,
          'consumer_secret': consumerSecret,
        },
      );
      if (response.statusCode == 200 && response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('trackOrderById error: $e');
    }
    return null;
  }

  /// Fetches orders for a given customer or email from WooCommerce
  Future<List<Map<String, dynamic>>> fetchCustomerOrders({int? customerId, String? email}) async {
    try {
      final q = <String, dynamic>{
        'consumer_key': consumerKey,
        'consumer_secret': consumerSecret,
        'per_page': 50,
      };
      if (customerId != null && customerId > 0) {
        q['customer'] = customerId;
      }
      final response = await _dio.get(
        '$baseUrl/orders',
        queryParameters: q,
      );
      final data = response.data;
      if (data is List) {
        final list = data.whereType<Map<String, dynamic>>().toList();
        if (email != null && email.trim().isNotEmpty && (customerId == null || customerId <= 0)) {
          final cleanEmail = email.trim().toLowerCase();
          final filtered = list.where((o) {
            final bEmail = (o['billing']?['email'] ?? '').toString().toLowerCase();
            return bEmail == cleanEmail;
          }).toList();
          if (filtered.isNotEmpty) return filtered;
        }
        return list;
      }
    } catch (e) {
      debugPrint('fetchCustomerOrders error: $e');
    }
    return [];
  }

  String? _cartNonce;
  String? _cartToken;
  String? _authCookie;

  /// Creates a new customer account in the WooCommerce store database
  Future<WcAuthResult> createCustomer({
    required String name,
    required String email,
    required String password,
    required String phone,
  }) async {
    final cleanEmail = email.trim().toLowerCase();
    final parts = name.trim().split(' ');
    final firstName = parts.first;
    final lastName = parts.length > 1 ? parts.sublist(1).join(' ') : '';
    final username = cleanEmail.split('@').first;

    try {
      final response = await _dio.post(
        '$baseUrl/customers',
        queryParameters: {
          'consumer_key': consumerKey,
          'consumer_secret': consumerSecret,
        },
        data: {
          'email': cleanEmail,
          'first_name': firstName,
          'last_name': lastName,
          'username': username,
          'password': password,
          'billing': {
            'first_name': firstName,
            'last_name': lastName,
            'email': cleanEmail,
            'phone': phone.trim(),
          },
          'shipping': {
            'first_name': firstName,
            'last_name': lastName,
            'phone': phone.trim(),
          },
        },
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = response.data;
        if (data is Map<String, dynamic>) {
          final cust = WcCustomer.fromJson(data);

          // Explicitly set customer password via PUT to guarantee WordPress sets it in wp_users
          try {
            await _dio.put(
              '$baseUrl/customers/${cust.id}',
              queryParameters: {
                'consumer_key': consumerKey,
                'consumer_secret': consumerSecret,
              },
              data: {'password': password},
            );
            debugPrint('createCustomer: Successfully synchronized password with store database for customer ${cust.id}');
          } catch (putErr) {
            debugPrint('createCustomer: PUT password error: $putErr');
          }

          return WcAuthResult.ok(cust);
        }
      }
    } on DioException catch (e) {
      final resData = e.response?.data;
      if (resData is Map) {
        final code = resData['code']?.toString() ?? '';
        final msg = resData['message']?.toString() ?? '';
        if (code.contains('existing_user_login') ||
            code.contains('registration-error') ||
            msg.contains('already registered') ||
            msg.contains('already exists')) {
          return WcAuthResult.error('This email is already registered on our store website! Please Sign In.');
        }
        return WcAuthResult.error(msg.isNotEmpty ? msg : 'Registration failed: ${e.message}');
      }
      return WcAuthResult.error('Registration failed: ${e.message}');
    } catch (e) {
      return WcAuthResult.error('Registration error: $e');
    }

    return WcAuthResult.error('Could not create account on store. Please try again.');
  }

  /// Syncs an item added to cart with the live store cart API
  Future<void> syncCartAddItem({required int productId, int quantity = 1}) async {
    try {
      if (_cartNonce == null) {
        final getRes = await _dio.get('https://livaan.in/wp-json/wc/store/v1/cart');
        _cartNonce = getRes.headers['nonce']?.firstOrNull ?? getRes.headers['x-wp-nonce']?.firstOrNull;
        _cartToken = getRes.headers['cart-token']?.firstOrNull;
      }

      final headers = <String, String>{
        'Content-Type': 'application/json',
      };
      if (_cartNonce != null) headers['Nonce'] = _cartNonce!;
      if (_cartToken != null) headers['Cart-Token'] = _cartToken!;
      if (_authCookie != null) headers['Cookie'] = _authCookie!;

      final response = await _dio.post(
        'https://livaan.in/wp-json/wc/store/v1/cart/add-item',
        data: {
          'id': productId,
          'quantity': quantity,
        },
        options: Options(headers: headers),
      );

      final newNonce = response.headers['nonce']?.firstOrNull;
      final newToken = response.headers['cart-token']?.firstOrNull;
      if (newNonce != null) _cartNonce = newNonce;
      if (newToken != null) _cartToken = newToken;
    } catch (_) {}
  }

  /// Fetches reviews for a specific product from WooCommerce REST API
  Future<List<WcReview>> fetchProductReviews(int productId) async {
    try {
      final response = await _dio.get(
        '$baseUrl/products/reviews',
        queryParameters: {
          'product': productId,
          'per_page': 50,
          'status': 'approved',
        },
      );
      if (response.statusCode == 200 && response.data is List) {
        return (response.data as List)
            .map((item) => WcReview.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      debugPrint('Error fetching reviews for product $productId: $e');
    }
    return [];
  }

  /// Submits a new review & rating for a product to WooCommerce
  Future<WcReview?> submitReview({
    required int productId,
    required String review,
    required String reviewer,
    required String reviewerEmail,
    required int rating,
  }) async {
    try {
      final response = await _dio.post(
        '$baseUrl/products/reviews',
        data: {
          'product_id': productId,
          'review': review.trim(),
          'reviewer_email': reviewerEmail.trim(),
          'rating': rating.clamp(1, 5),
        },
      );
      if ((response.statusCode == 200 || response.statusCode == 201) && response.data is Map) {
        return WcReview.fromJson(response.data as Map<String, dynamic>);
      }
    } catch (e) {
      debugPrint('Error submitting review for product $productId: $e');
    }
    return null;
  }

  /// Fetches related products from the same category
  Future<List<WcProduct>> fetchRelatedProducts({
    required int currentProductId,
    required List<int> categoryIds,
  }) async {
    try {
      if (categoryIds.isNotEmpty) {
        final catProducts = await fetchProducts(categoryId: categoryIds.first);
        final filtered = catProducts.where((p) => p.id != currentProductId.toString()).toList();
        if (filtered.isNotEmpty) return filtered;
      }
      final all = await fetchProducts();
      return all.where((p) => p.id != currentProductId.toString()).take(8).toList();
    } catch (e) {
      debugPrint('Error fetching related products: $e');
    }
    return [];
  }
}

class WcCustomer {
  final int id;
  final String email;
  final String username;
  final String firstName;
  final String lastName;
  final String phone;
  final String address;
  final String city;
  final String state;
  final String postcode;

  const WcCustomer({
    required this.id,
    required this.email,
    required this.username,
    required this.firstName,
    required this.lastName,
    this.phone = '',
    this.address = '',
    this.city = '',
    this.state = '',
    this.postcode = '',
  });

  String get displayName {
    final full = '$firstName $lastName'.trim();
    if (full.isNotEmpty) return full;
    if (username.isNotEmpty) return username;
    if (email.isNotEmpty) return email.split('@').first;
    return 'Customer';
  }

  factory WcCustomer.fromJson(Map<String, dynamic> json) {
    final billing = json['billing'] is Map ? (json['billing'] as Map) : {};
    final bFirst = (billing['first_name'] as String?)?.trim() ?? '';
    final bLast = (billing['last_name'] as String?)?.trim() ?? '';
    final fName = (json['first_name'] as String?)?.trim() ?? '';
    final lName = (json['last_name'] as String?)?.trim() ?? '';

    return WcCustomer(
      id: (json['id'] as num?)?.toInt() ?? 0,
      email: (json['email'] as String?)?.trim().toLowerCase() ?? '',
      username: (json['username'] as String?)?.trim() ?? '',
      firstName: bFirst.isNotEmpty ? bFirst : fName,
      lastName: bLast.isNotEmpty ? bLast : lName,
      phone: (billing['phone'] as String?)?.trim() ?? '',
      address: (billing['address_1'] as String?)?.trim() ?? '',
      city: (billing['city'] as String?)?.trim() ?? '',
      state: (billing['state'] as String?)?.trim() ?? '',
      postcode: (billing['postcode'] as String?)?.trim() ?? '',
    );
  }
}

class WcAuthResult {
  final bool success;
  final bool isNewUser;
  final String? message;
  final WcCustomer? customer;

  const WcAuthResult({
    required this.success,
    this.isNewUser = false,
    this.message,
    this.customer,
  });

  factory WcAuthResult.ok(WcCustomer customer) =>
      WcAuthResult(success: true, customer: customer);

  factory WcAuthResult.newUser(String message) =>
      WcAuthResult(success: false, isNewUser: true, message: message);

  factory WcAuthResult.wrongPassword(String message) =>
      WcAuthResult(success: false, isNewUser: false, message: message);

  factory WcAuthResult.error(String message) =>
      WcAuthResult(success: false, isNewUser: false, message: message);
}

class WcReview {
  final int id;
  final int productId;
  final String reviewer;
  final String reviewerEmail;
  final String review;
  final int rating;
  final String dateCreated;
  final bool verified;
  final String? reviewerAvatar;

  const WcReview({
    required this.id,
    required this.productId,
    required this.reviewer,
    required this.reviewerEmail,
    required this.review,
    required this.rating,
    required this.dateCreated,
    this.verified = false,
    this.reviewerAvatar,
  });

  factory WcReview.fromJson(Map<String, dynamic> json) {
    String cleanReview = (json['review'] as String?) ?? '';
    cleanReview = cleanReview
        .replaceAll(RegExp(r'<[^>]*>'), ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#8217;', "'")
        .replaceAll('&#8243;', '"')
        .replaceAll('&#8211;', '-')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();

    String? avatar;
    if (json['reviewer_avatar_urls'] is Map) {
      final avatars = json['reviewer_avatar_urls'] as Map;
      avatar = (avatars['48'] ?? avatars['96'] ?? avatars['24']) as String?;
    }

    return WcReview(
      id: (json['id'] as num?)?.toInt() ?? 0,
      productId: (json['product_id'] as num?)?.toInt() ?? 0,
      reviewer: (json['reviewer'] as String?)?.trim().isNotEmpty == true
          ? (json['reviewer'] as String).trim()
          : 'Verified Customer',
      reviewerEmail: (json['reviewer_email'] as String?)?.trim() ?? '',
      review: cleanReview,
      rating: (json['rating'] as num?)?.toInt() ?? 5,
      dateCreated: (json['date_created'] as String?) ?? '',
      verified: json['verified'] as bool? ?? false,
      reviewerAvatar: avatar,
    );
  }
}

// Global Providers
final wcServiceProvider = Provider<WooCommerceService>((ref) {
  return WooCommerceService();
});

final wcCategoriesProvider = FutureProvider<List<WcCategory>>((ref) async {
  final service = ref.watch(wcServiceProvider);
  return service.fetchCategories();
});

final wcProductsProvider = FutureProvider<List<WcProduct>>((ref) async {
  final service = ref.watch(wcServiceProvider);
  return service.fetchProducts();
});

// Currently selected category filter: 'All', 'Cat1', 'Cat2', 'Cat3', etc.
final selectedCategoryFilterProvider = StateProvider<String>((ref) => 'All');

// Filtered products based on selectedCategoryFilterProvider
final filteredWcProductsProvider = Provider<List<WcProduct>>((ref) {
  final productsAsync = ref.watch(wcProductsProvider);
  final allProducts = productsAsync.value ?? WooCommerceService.initialProducts;
  final selectedCat = ref.watch(selectedCategoryFilterProvider);

  if (selectedCat == 'All' || selectedCat.isEmpty) {
    return allProducts;
  }

  return allProducts.where((p) {
    return p.categories.any((c) => c.toLowerCase() == selectedCat.toLowerCase());
  }).toList();
});

final wcPaymentGatewaysProvider = FutureProvider<List<WcPaymentGateway>>((ref) async {
  final service = ref.watch(wcServiceProvider);
  return service.fetchPaymentGateways();
});
