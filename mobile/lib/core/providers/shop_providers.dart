import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../data/mock_products.dart';
import '../services/woocommerce_service.dart';

// User Profile Model
class UserProfile {
  final int id;
  final String name;
  final String email;
  final String username;
  final String password;
  final String phone;
  final String address;
  final String city;
  final String state;
  final String postcode;
  final String dob;
  final String age;
  final String gender;
  final String avatar;
  final bool isLoggedIn;

  const UserProfile({
    this.id = 0,
    required this.name,
    required this.email,
    this.username = '',
    this.password = '',
    this.phone = '',
    this.address = '',
    this.city = '',
    this.state = '',
    this.postcode = '',
    this.dob = '',
    this.age = '',
    this.gender = '',
    this.avatar = '',
    this.isLoggedIn = false,
  });

  UserProfile copyWith({
    int? id,
    String? name,
    String? email,
    String? username,
    String? password,
    String? phone,
    String? address,
    String? city,
    String? state,
    String? postcode,
    String? dob,
    String? age,
    String? gender,
    String? avatar,
    bool? isLoggedIn,
  }) {
    return UserProfile(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      username: username ?? this.username,
      password: password ?? this.password,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      city: city ?? this.city,
      state: state ?? this.state,
      postcode: postcode ?? this.postcode,
      dob: dob ?? this.dob,
      age: age ?? this.age,
      gender: gender ?? this.gender,
      avatar: avatar ?? this.avatar,
      isLoggedIn: isLoggedIn ?? this.isLoggedIn,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'username': username,
    'password': password,
    'phone': phone,
    'address': address,
    'city': city,
    'state': state,
    'postcode': postcode,
    'dob': dob,
    'age': age,
    'gender': gender,
    'avatar': avatar,
    'isLoggedIn': isLoggedIn,
  };

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    id: (json['id'] as num?)?.toInt() ?? 0,
    name: json['name'] as String? ?? 'Store Customer',
    email: json['email'] as String? ?? '',
    username: json['username'] as String? ?? '',
    password: json['password'] as String? ?? '',
    phone: json['phone'] as String? ?? '',
    address: json['address'] as String? ?? '',
    city: json['city'] as String? ?? '',
    state: json['state'] as String? ?? '',
    postcode: json['postcode'] as String? ?? '',
    dob: json['dob'] as String? ?? '',
    age: json['age'] as String? ?? '',
    gender: json['gender'] as String? ?? '',
    avatar: json['avatar'] as String? ?? '',
    isLoggedIn: json['isLoggedIn'] as bool? ?? false,
  );
}

// User Profile Notifier with live store database authentication and local persistence
class UserProfileNotifier extends StateNotifier<UserProfile> {
  final WooCommerceService _wcService;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  // Local persistent storage of registered users
  static final Map<String, UserProfile> _registeredUsers = {};

  UserProfileNotifier(this._wcService)
      : super(const UserProfile(
          id: 0,
          name: 'Store Customer',
          email: '',
          isLoggedIn: false,
        )) {
    _loadPersistedState();
  }

  Future<void> _loadPersistedState() async {
    try {
      final cachedUsersJson = await _storage.read(key: 'cached_registered_users_v2');
      if (cachedUsersJson != null && cachedUsersJson.isNotEmpty) {
        final decoded = jsonDecode(cachedUsersJson);
        if (decoded is Map<String, dynamic>) {
          decoded.forEach((key, val) {
            if (val is Map<String, dynamic>) {
              final p = UserProfile.fromJson(val);
              _registeredUsers[key.toLowerCase()] = p;
              final cleanPhone = p.phone.replaceAll(RegExp(r'\D'), '');
              if (cleanPhone.length >= 7) {
                _registeredUsers[cleanPhone] = p;
              }
            }
          });
        }
      }

      final currentUserJson = await _storage.read(key: 'current_user_profile_v2');
      if (currentUserJson != null && currentUserJson.isNotEmpty) {
        final decoded = jsonDecode(currentUserJson);
        if (decoded is Map<String, dynamic>) {
          final savedUser = UserProfile.fromJson(decoded);
          if (savedUser.isLoggedIn && savedUser.email.isNotEmpty) {
            state = savedUser;
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading persisted user state: $e');
    }
  }

  Future<void> _persistUsers() async {
    try {
      final mapToSave = <String, dynamic>{};
      _registeredUsers.forEach((key, profile) {
        mapToSave[key.toLowerCase()] = profile.toJson();
      });
      await _storage.write(
        key: 'cached_registered_users_v2',
        value: jsonEncode(mapToSave),
      );
    } catch (e) {
      debugPrint('Error persisting registered users: $e');
    }
  }

  Future<void> _persistCurrentSession(UserProfile profile) async {
    try {
      await _storage.write(
        key: 'current_user_profile_v2',
        value: jsonEncode(profile.toJson()),
      );
    } catch (e) {
      debugPrint('Error persisting current session: $e');
    }
  }

  /// Checks if an email is already registered in local database or store
  Future<bool> isEmailRegistered(String email) async {
    final clean = email.trim().toLowerCase();
    if (_registeredUsers.containsKey(clean)) return true;
    final cust = await _wcService.findCustomer(clean);
    return cust != null;
  }

  /// Registers a new user into database.
  /// Checks against live store database as well.
  /// Returns null on success, or an error string on failure.
  Future<String?> register({
    required String name,
    required String email,
    required String password,
    required String phone,
    String dob = '',
    required String age,
    required String gender,
  }) async {
    final cleanName = name.trim();
    final cleanEmail = email.trim().toLowerCase();
    final cleanPwd = password.trim();

    if (cleanName.isEmpty) {
      return 'Please enter your full name.';
    }
    if (cleanEmail.isEmpty || !cleanEmail.contains('@')) {
      return 'Please enter a valid email address.';
    }
    if (cleanPwd.length < 4) {
      return 'Password must be at least 4 characters long.';
    }

    // 1. Check if email already registered on live WooCommerce store
    try {
      final existingStoreCustomer = await _wcService.findCustomer(cleanEmail);
      if (existingStoreCustomer != null) {
        return 'This email is already registered on our store website! Please Sign In with your existing password.';
      }
    } catch (_) {}

    // 2. Check local database
    if (_registeredUsers.containsKey(cleanEmail)) {
      return 'This email is already registered in our database. Please Sign In.';
    }

    // 3. Register customer directly into live WooCommerce store database
    final wcResult = await _wcService.createCustomer(
      name: cleanName,
      email: cleanEmail,
      password: cleanPwd,
      phone: phone.trim(),
    );

    if (!wcResult.success) {
      return wcResult.message ?? 'Failed to register account with store. Please try again.';
    }

    final cust = wcResult.customer;
    final profile = UserProfile(
      id: cust?.id ?? (DateTime.now().millisecondsSinceEpoch ~/ 1000),
      name: cleanName,
      email: cleanEmail,
      username: cust?.username ?? cleanEmail.split('@').first,
      password: cleanPwd,
      phone: phone.trim(),
      dob: dob.trim(),
      age: age.trim(),
      gender: gender.trim(),
      isLoggedIn: true,
    );

    _registeredUsers[cleanEmail] = profile;
    final cleanPhone = profile.phone.replaceAll(RegExp(r'\D'), '');
    if (cleanPhone.length >= 7) {
      _registeredUsers[cleanPhone] = profile;
    }
    await _persistUsers();
    await _persistCurrentSession(profile);

    state = profile;
    return null; // Registration success
  }

  /// Authenticates user against store website (lighting.rishabhtyagi.in) and local database.
  /// Returns WcAuthResult indicating success, new user, or wrong password.
  Future<WcAuthResult> login({
    required String emailOrPhone,
    required String password,
  }) async {
    final input = emailOrPhone.trim();
    final pwd = password.trim();

    if (input.isEmpty) {
      return WcAuthResult.error('Please enter your registered email or phone number.');
    }
    if (pwd.isEmpty) {
      return WcAuthResult.error('Please enter your password.');
    }

    // Lookup local profile if available
    final cleanDigits = input.replaceAll(RegExp(r'\D'), '');
    UserProfile? localProfile = _registeredUsers[input.toLowerCase()];
    if (localProfile == null && cleanDigits.length >= 7) {
      localProfile = _registeredUsers[cleanDigits];
      if (localProfile == null) {
        for (final p in _registeredUsers.values) {
          final pDigits = p.phone.replaceAll(RegExp(r'\D'), '');
          if (pDigits.isNotEmpty && (pDigits.endsWith(cleanDigits) || cleanDigits.endsWith(pDigits))) {
            localProfile = p;
            break;
          }
        }
      }
    }

    // Authenticate directly against the live store website database and local fallback
    final storeResult = await _wcService.authenticateCustomer(
      emailOrPhone: input,
      password: pwd,
      localUserData: localProfile?.toJson(),
    );

    if (storeResult.success && storeResult.customer != null) {
      final cust = storeResult.customer!;
      final profile = UserProfile(
        id: cust.id,
        name: cust.displayName.isNotEmpty ? cust.displayName : (localProfile?.name ?? 'Store Customer'),
        email: cust.email.isNotEmpty ? cust.email : (localProfile?.email ?? input),
        username: cust.username.isNotEmpty ? cust.username : (localProfile?.username ?? ''),
        password: pwd,
        phone: cust.phone.isNotEmpty ? cust.phone : (localProfile?.phone ?? ''),
        address: cust.address.isNotEmpty ? cust.address : (localProfile?.address ?? ''),
        city: cust.city.isNotEmpty ? cust.city : (localProfile?.city ?? ''),
        state: cust.state.isNotEmpty ? cust.state : (localProfile?.state ?? ''),
        postcode: cust.postcode.isNotEmpty ? cust.postcode : (localProfile?.postcode ?? ''),
        dob: localProfile?.dob ?? '',
        age: localProfile?.age ?? '',
        gender: localProfile?.gender ?? '',
        isLoggedIn: true,
      );

      state = profile;
      if (profile.email.isNotEmpty) {
        _registeredUsers[profile.email.toLowerCase()] = profile;
      }
      final phDigits = profile.phone.replaceAll(RegExp(r'\D'), '');
      if (phDigits.length >= 7) {
        _registeredUsers[phDigits] = profile;
      }
      await _persistUsers();
      await _persistCurrentSession(profile);

      return storeResult;
    }

    return storeResult;
  }

  void updateProfile({
    String? name,
    String? phone,
    String? dob,
    String? age,
    String? gender,
    String? address,
    String? city,
    String? state,
    String? postcode,
    String? avatar,
  }) {
    final updated = this.state.copyWith(
      name: name,
      phone: phone,
      dob: dob,
      age: age,
      gender: gender,
      address: address,
      city: city,
      state: state,
      postcode: postcode,
      avatar: avatar,
    );
    this.state = updated;
    if (updated.email.isNotEmpty) {
      _registeredUsers[updated.email.toLowerCase()] = updated;
    }
    final phDigits = updated.phone.replaceAll(RegExp(r'\D'), '');
    if (phDigits.length >= 7) {
      _registeredUsers[phDigits] = updated;
    }
    _persistUsers();
    _persistCurrentSession(updated);
  }

  void logout() {
    state = const UserProfile(
      id: 0,
      name: 'Store Customer',
      email: '',
      isLoggedIn: false,
    );
    _storage.delete(key: 'current_user_profile_v2');
  }
}

final userProfileProvider =
    StateNotifierProvider<UserProfileNotifier, UserProfile>((ref) {
  final wcService = ref.watch(wcServiceProvider);
  return UserProfileNotifier(wcService);
});

// Wishlist IDs StateNotifier with in-memory product cache
class WishlistNotifier extends StateNotifier<Set<String>> {
  final Map<String, DetailedProduct> _productDetailsCache = {};

  WishlistNotifier() : super(<String>{});

  Map<String, DetailedProduct> get cachedProducts => _productDetailsCache;

  void cacheProduct(DetailedProduct product) {
    if (product.id.isNotEmpty) {
      _productDetailsCache[product.id] = product;
    }
  }

  void toggle(String id, {DetailedProduct? product, WcProduct? wcProduct}) {
    final cleanId = id.trim();
    if (cleanId.isEmpty) return;

    if (product != null) {
      _productDetailsCache[cleanId] = product;
      WooCommerceService.cacheProduct(WcProduct(
        id: product.id,
        title: product.title,
        price: product.price,
        regularPrice: product.originalPrice,
        images: product.images,
        description: product.description,
        features: product.features,
        categories: [],
        categoryIds: [],
        colors: product.colors,
        sizes: [],
        rating: product.rating,
        reviewsCount: product.reviewsCount,
      ));
    } else if (wcProduct != null) {
      _productDetailsCache[cleanId] = wcProduct.toDetailedProduct();
      WooCommerceService.cacheProduct(wcProduct);
    }

    if (state.contains(cleanId)) {
      state = {...state}..remove(cleanId);
    } else {
      state = {...state, cleanId};
    }
  }

  void clear() {
    state = <String>{};
    _productDetailsCache.clear();
  }

  bool isWishlisted(String id) => state.contains(id.trim());
}

final wishlistProvider =
    StateNotifierProvider<WishlistNotifier, Set<String>>((ref) {
  return WishlistNotifier();
});

// Cart Item Model
class CartItem {
  final String id;
  final String title;
  final double price;
  final String image;
  int quantity;
  final String selectedColor;

  CartItem({
    required this.id,
    required this.title,
    required this.price,
    required this.image,
    this.quantity = 1,
    this.selectedColor = '',
  });

  CartItem copyWith({
    int? quantity,
  }) {
    return CartItem(
      id: id,
      title: title,
      price: price,
      image: image,
      quantity: quantity ?? this.quantity,
      selectedColor: selectedColor,
    );
  }
}

// Cart Items StateNotifier
class CartItemsNotifier extends StateNotifier<List<CartItem>> {
  final WooCommerceService? _wcService;

  CartItemsNotifier([this._wcService]) : super(const []);

  void addItem({
    required String id,
    required String title,
    required double price,
    required String image,
    int quantity = 1,
    String selectedColor = '',
  }) {
    final existingIndex = state.indexWhere((item) => item.id == id);
    if (existingIndex >= 0) {
      final updated = [...state];
      updated[existingIndex] = updated[existingIndex].copyWith(
        quantity: updated[existingIndex].quantity + quantity,
      );
      state = updated;
    } else {
      state = [
        ...state,
        CartItem(
          id: id,
          title: title,
          price: price,
          image: image,
          quantity: quantity,
          selectedColor: selectedColor,
        ),
      ];
    }

    // Live sync with store website cart
    final pId = int.tryParse(id);
    if (pId != null && pId > 0 && _wcService != null) {
      _wcService.syncCartAddItem(productId: pId, quantity: quantity);
    }
  }

  void incrementQuantity(String id) {
    state = state.map((item) {
      if (item.id == id) {
        return item.copyWith(quantity: item.quantity + 1);
      }
      return item;
    }).toList();
  }

  void decrementQuantity(String id) {
    final item = state.firstWhere((i) => i.id == id, orElse: () => state.first);
    if (item.quantity > 1) {
      state = state.map((i) {
        if (i.id == id) {
          return i.copyWith(quantity: i.quantity - 1);
        }
        return i;
      }).toList();
    } else {
      removeItem(id);
    }
  }

  void removeItem(String id) {
    state = state.where((item) => item.id != id).toList();
  }

  void clearCart() {
    state = [];
  }
}

final cartItemsProvider =
    StateNotifierProvider<CartItemsNotifier, List<CartItem>>((ref) {
  final wcService = ref.watch(wcServiceProvider);
  return CartItemsNotifier(wcService);
});

// Dynamically computed total item count
final cartCountProvider = Provider<int>((ref) {
  final items = ref.watch(cartItemsProvider);
  return items.fold<int>(0, (sum, item) => sum + item.quantity);
});

// Notification Model
class AppNotification {
  final String id;
  final String title;
  final String message;
  final String time;
  final IconData icon;
  final Color iconBgColor;
  final Color iconColor;
  final bool isRead;

  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.time,
    required this.icon,
    required this.iconBgColor,
    required this.iconColor,
    this.isRead = false,
  });

  AppNotification copyWith({
    String? id,
    String? title,
    String? message,
    String? time,
    IconData? icon,
    Color? iconBgColor,
    Color? iconColor,
    bool? isRead,
  }) {
    return AppNotification(
      id: id ?? this.id,
      title: title ?? this.title,
      message: message ?? this.message,
      time: time ?? this.time,
      icon: icon ?? this.icon,
      iconBgColor: iconBgColor ?? this.iconBgColor,
      iconColor: iconColor ?? this.iconColor,
      isRead: isRead ?? this.isRead,
    );
  }
}

// Notifications StateNotifier (Persists state across navigation)
class NotificationsNotifier extends StateNotifier<List<AppNotification>> {
  NotificationsNotifier()
      : super([
          const AppNotification(
            id: 'notif_1',
            title: 'Special 20% OFF Flash Sale! ⚡',
            message:
                'Big discounts on Ultra Blue Halogen Lamps, LED Fog Lamps and car jump starters!',
            time: '10 mins ago',
            icon: Icons.flash_on_rounded,
            iconBgColor: Color(0xFFEDE9FE),
            iconColor: Color(0xFF704FEE),
            isRead: false,
          ),
          const AppNotification(
            id: 'notif_2',
            title: 'Welcome to Formula Rally Store! 👋',
            message:
                'Your account is ready. Discover genuine automotive lighting products and fast delivery.',
            time: '1 hour ago',
            icon: Icons.storefront_rounded,
            iconBgColor: Color(0xFFFEF3C7),
            iconColor: Color(0xFFD97706),
            isRead: false,
          ),
          const AppNotification(
            id: 'notif_3',
            title: 'Order Dispatched #FR-2026 📦',
            message:
                'Your lighting product has been packed with care and handed over to our courier partner.',
            time: 'Yesterday',
            icon: Icons.local_shipping_rounded,
            iconBgColor: Color(0xFFD1FAE5),
            iconColor: Color(0xFF059669),
            isRead: true,
          ),
          const AppNotification(
            id: 'notif_4',
            title: 'Wishlist Item Price Drop ❤️',
            message:
                'Great news! An item from your saved favorites is currently available on sale.',
            time: '2 days ago',
            icon: Icons.favorite_rounded,
            iconBgColor: Color(0xFFFCE7F3),
            iconColor: Color(0xFFDB2777),
            isRead: true,
          ),
        ]);

  void markAllAsRead() {
    state = state.map((n) => n.copyWith(isRead: true)).toList();
  }

  void markAsRead(String id) {
    state = state.map((n) => n.id == id ? n.copyWith(isRead: true) : n).toList();
  }

  void clearAll() {
    state = [];
  }

  void removeNotification(String id) {
    state = state.where((n) => n.id != id).toList();
  }
}

final notificationsProvider =
    StateNotifierProvider<NotificationsNotifier, List<AppNotification>>((ref) {
  return NotificationsNotifier();
});

// Live count of unread notifications
final unreadNotificationsCountProvider = Provider<int>((ref) {
  final notifs = ref.watch(notificationsProvider);
  return notifs.where((n) => !n.isRead).length;
});

