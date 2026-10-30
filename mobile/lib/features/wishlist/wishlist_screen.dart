import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/data/mock_products.dart';
import '../../core/providers/shop_providers.dart';
import '../../core/services/woocommerce_service.dart';

class WishlistScreen extends ConsumerStatefulWidget {
  const WishlistScreen({super.key});

  @override
  ConsumerState<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends ConsumerState<WishlistScreen> {
  final Map<String, DetailedProduct> _asyncFetchedProducts = {};
  final Set<String> _inFlightFetches = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAndFetchMissing();
    });
  }

  void _checkAndFetchMissing() {
    final wishlistedIds = ref.read(wishlistProvider);
    final allWc = ref.read(wcProductsProvider).value ?? WooCommerceService.initialProducts;
    final cachedWishlist = ref.read(wishlistProvider.notifier).cachedProducts;

    for (final rawId in wishlistedIds) {
      final id = rawId.trim();
      // Ignore legacy test IDs from earlier sessions
      if (id == '20' || id == '21' || id == '22' || id == '19') continue;

      if (_asyncFetchedProducts.containsKey(id) || _inFlightFetches.contains(id)) continue;

      // Check if already in WooCommerceService cache
      final cached = WooCommerceService.getCachedProduct(id);
      if (cached != null) {
        _asyncFetchedProducts[id] = cached.toDetailedProduct();
        continue;
      }

      // Check in initial/loaded products
      final inWc = allWc.where((p) => p.id == id).firstOrNull;
      if (inWc != null) {
        _asyncFetchedProducts[id] = inWc.toDetailedProduct();
        continue;
      }

      // Check in wishlist notifier cache
      if (cachedWishlist.containsKey(id)) {
        _asyncFetchedProducts[id] = cachedWishlist[id]!;
        continue;
      }

      // Fetch from WooCommerce API
      _inFlightFetches.add(id);
      WooCommerceService().fetchProductById(id).then((p) {
        if (mounted && p != null) {
          setState(() {
            _asyncFetchedProducts[id] = p.toDetailedProduct();
            _inFlightFetches.remove(id);
          });
        }
      }).catchError((_) {
        if (mounted) {
          setState(() {
            _inFlightFetches.remove(id);
          });
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final rawWishlistIds = ref.watch(wishlistProvider);
    // Filter out legacy mock shirts if any were previously saved
    final wishlistedIds = rawWishlistIds
        .where((id) => id != '20' && id != '21' && id != '22' && id != '19')
        .toList();

    final cartCount = ref.watch(cartCountProvider);
    final unreadNotifCount = ref.watch(unreadNotificationsCountProvider);
    final productsAsync = ref.watch(wcProductsProvider);
    final allWc = productsAsync.value ?? WooCommerceService.initialProducts;
    final cachedWishlist = ref.watch(wishlistProvider.notifier).cachedProducts;

    const primaryColor = Color(0xFF704FEE);
    const darkTextColor = Color(0xFF1E1B4B);

    // Resolve products
    final List<DetailedProduct?> wishlistedProducts = [];
    for (final id in wishlistedIds) {
      if (_asyncFetchedProducts.containsKey(id)) {
        wishlistedProducts.add(_asyncFetchedProducts[id]);
        continue;
      }
      final cached = WooCommerceService.getCachedProduct(id);
      if (cached != null) {
        wishlistedProducts.add(cached.toDetailedProduct());
        continue;
      }
      final inAll = allWc.where((p) => p.id == id).firstOrNull;
      if (inAll != null) {
        wishlistedProducts.add(inAll.toDetailedProduct());
        continue;
      }
      if (cachedWishlist.containsKey(id)) {
        wishlistedProducts.add(cachedWishlist[id]);
        continue;
      }
      final fromMock = getProductById(id);
      if (fromMock != null) {
        wishlistedProducts.add(fromMock);
        continue;
      }
      // If not yet resolved, trigger fetch and add null placeholder
      wishlistedProducts.add(null);
      if (!_inFlightFetches.contains(id)) {
        _inFlightFetches.add(id);
        WooCommerceService().fetchProductById(id).then((p) {
          if (mounted && p != null) {
            setState(() {
              _asyncFetchedProducts[id] = p.toDetailedProduct();
              _inFlightFetches.remove(id);
            });
          }
        }).catchError((_) {
          if (mounted) {
            setState(() {
              _inFlightFetches.remove(id);
            });
          }
        });
      }
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: darkTextColor),
          tooltip: 'Back',
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/home');
            }
          },
        ),
        title: const Text(
          'My Wishlist',
          style: TextStyle(
            color: darkTextColor,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        centerTitle: true,
        actions: [
          // Notification Bell with LIVE dynamic badge
          _buildHeaderIconButton(
            icon: Icons.notifications_none_rounded,
            badgeCount: unreadNotifCount > 0 ? unreadNotifCount : null,
            onTap: () => context.push('/notifications'),
          ),
          const SizedBox(width: 8),

          // Add to Cart Icon with live badge
          _buildHeaderIconButton(
            icon: Icons.shopping_bag_outlined,
            badgeCount: cartCount > 0 ? cartCount : null,
            onTap: () => context.push('/cart'),
          ),
          const SizedBox(width: 14),
        ],
      ),
      body: SafeArea(
        child: wishlistedIds.isEmpty
            ? _buildEmptyWishlist(context, primaryColor, darkTextColor)
            : SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Items Count Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${wishlistedIds.length} Saved Items',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: darkTextColor,
                          ),
                        ),
                        Text(
                          'Tap heart to remove',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // 2-Column Responsive Grid of Wishlist Items
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: wishlistedIds.length,
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 14,
                        mainAxisSpacing: 18,
                        childAspectRatio: 0.68,
                      ),
                      itemBuilder: (context, index) {
                        final product = index < wishlistedProducts.length ? wishlistedProducts[index] : null;
                        if (product == null) {
                          return _buildLoadingWishlistCard();
                        }
                        return _buildWishlistCard(context, product, primaryColor, darkTextColor);
                      },
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildLoadingWishlistCard() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
              ),
              child: const Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF704FEE)),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(10.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 14,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  height: 14,
                  width: 60,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWishlistCard(
    BuildContext context,
    DetailedProduct product,
    Color primaryColor,
    Color darkTextColor,
  ) {
    final image = product.images.isNotEmpty
        ? product.images.first
        : 'https://livaan.in/wp-content/uploads/2025/01/1-4.png';

    return GestureDetector(
      onTap: () => context.push('/product/${product.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image with Heart Toggle
          Expanded(
            child: Stack(
              children: [
                Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: CachedNetworkImage(
                      imageUrl: image,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(color: Colors.grey.shade100),
                      errorWidget: (_, __, ___) => const Icon(Icons.image, color: Colors.grey),
                    ),
                  ),
                ),
                // Red Filled Heart Icon (Tap to Remove)
                Positioned(
                  top: 8,
                  right: 8,
                  child: GestureDetector(
                    onTap: () {
                      ref.read(wishlistProvider.notifier).toggle(product.id);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Removed "${product.title}" from wishlist'),
                          behavior: SnackBarBehavior.floating,
                          duration: const Duration(seconds: 1),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.08),
                            blurRadius: 6,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.favorite_rounded,
                        color: Color(0xFFEF4444),
                        size: 16,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Product Title
          Text(
            product.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: darkTextColor,
            ),
          ),
          const SizedBox(height: 3),

          // Price & Add to Cart button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '₹${product.price.toStringAsFixed(product.price % 1 == 0 ? 0 : 2)}',
                style: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF704FEE),
                ),
              ),
              InkWell(
                onTap: () {
                  ref.read(cartItemsProvider.notifier).addItem(
                    id: product.id,
                    title: product.title,
                    price: product.price,
                    image: image,
                  );
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Added "${product.title}" to Cart! 🛍️'),
                      behavior: SnackBarBehavior.floating,
                      backgroundColor: const Color(0xFF059669),
                      duration: const Duration(seconds: 1),
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: const BoxDecoration(
                    color: Color(0xFFEDE9FE),
                    borderRadius: BorderRadius.all(Radius.circular(8)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.shopping_cart_outlined, size: 13, color: Color(0xFF704FEE)),
                      SizedBox(width: 4),
                      Text(
                        'Cart',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF704FEE),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderIconButton({
    required IconData icon,
    int? badgeCount,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(icon, size: 19, color: const Color(0xFF1E1B4B)),
            if (badgeCount != null && badgeCount > 0)
              Positioned(
                top: 4,
                right: 4,
                child: Container(
                  padding: const EdgeInsets.all(3.5),
                  decoration: const BoxDecoration(
                    color: Color(0xFF704FEE),
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(minWidth: 15, minHeight: 15),
                  child: Center(
                    child: Text(
                      '$badgeCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 8.5,
                        fontWeight: FontWeight.bold,
                        height: 1,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyWishlist(
    BuildContext context,
    Color primaryColor,
    Color darkTextColor,
  ) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: const BoxDecoration(
                color: Color(0xFFEDE9FE),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.favorite_rounded,
                size: 48,
                color: Color(0xFF704FEE),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Your Wishlist is Empty',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: darkTextColor,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Explore products and tap the heart icon to save your favorite items here.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13.5,
                color: Colors.grey.shade600,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go('/home'),
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: const Text(
                'Explore Products',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
