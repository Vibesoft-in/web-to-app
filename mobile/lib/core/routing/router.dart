import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/intro_auth_screen.dart';
import '../../features/cart/cart_screen.dart';
import '../../features/catalog/catalog_screen.dart';
import '../../features/checkout/checkout_webview.dart';
import '../../features/home/home_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/orders/orders_screen.dart';
import '../../features/orders/order_tracking_updates_screen.dart';
import '../../features/product/product_details_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/search/search_screen.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/wishlist/wishlist_screen.dart';
import '../../layouts/main_layout.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorHome = GlobalKey<NavigatorState>();
final _shellNavigatorCatalog = GlobalKey<NavigatorState>();
final _shellNavigatorWishlist = GlobalKey<NavigatorState>();
final _shellNavigatorProfile = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/splash',
    routes: [
      GoRoute(
        path: '/',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/splash',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/intro',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const IntroAuthScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return MainLayout(navigationShell: navigationShell);
        },
        branches: [
          // Tab 0: Home
          StatefulShellBranch(
            navigatorKey: _shellNavigatorHome,
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          // Tab 1: Categories / Catalog
          StatefulShellBranch(
            navigatorKey: _shellNavigatorCatalog,
            routes: [
              GoRoute(
                path: '/catalog',
                builder: (context, state) {
                  final cat = state.uri.queryParameters['category'];
                  final maxPriceStr = state.uri.queryParameters['maxPrice'];
                  final sort = state.uri.queryParameters['sort'];
                  final maxPrice = maxPriceStr != null ? double.tryParse(maxPriceStr) : null;
                  return CatalogScreen(
                    initialCategory: cat,
                    maxPrice: maxPrice,
                    initialSort: sort,
                  );
                },
              ),
            ],
          ),
          // Tab 2: Wishlist
          StatefulShellBranch(
            navigatorKey: _shellNavigatorWishlist,
            routes: [
              GoRoute(
                path: '/wishlist',
                builder: (context, state) => const WishlistScreen(),
              ),
            ],
          ),
          // Tab 3: Profile
          StatefulShellBranch(
            navigatorKey: _shellNavigatorProfile,
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/catalog-offer',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final cat = state.uri.queryParameters['category'];
          final maxPriceStr = state.uri.queryParameters['maxPrice'];
          final sort = state.uri.queryParameters['sort'];
          final maxPrice = maxPriceStr != null ? double.tryParse(maxPriceStr) : null;
          return CatalogScreen(
            initialCategory: cat,
            maxPrice: maxPrice,
            initialSort: sort,
          );
        },
      ),
      GoRoute(
        path: '/search',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final q = state.uri.queryParameters['q'];
          return SearchScreen(initialQuery: q);
        },
      ),
      GoRoute(
        path: '/cart',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const CartScreen(),
      ),
      GoRoute(
        path: '/product/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return ProductDetailsScreen(productId: id);
        },
      ),
      GoRoute(
        path: '/checkout',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final url = state.uri.queryParameters['url'] ?? '';
          return CheckoutWebviewScreen(checkoutUrl: url);
        },
      ),
      GoRoute(
        path: '/orders',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final id = state.uri.queryParameters['orderId'];
          return OrdersScreen(initialOrderId: id);
        },
      ),
      GoRoute(
        path: '/order-tracking-updates',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final order = state.extra as Map<String, dynamic>? ?? {};
          return OrderTrackingUpdatesScreen(order: order);
        },
      ),
      GoRoute(
        path: '/notifications',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const NotificationsScreen(),
      ),
    ],
  );
});
