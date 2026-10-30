import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/data/mock_products.dart';
import '../../core/providers/shop_providers.dart';
import '../../core/services/woocommerce_service.dart';
import '../../core/widgets/empty_view.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import 'catalog_notifier.dart';
import 'widgets/product_card.dart';

class CatalogScreen extends ConsumerStatefulWidget {
  final String? initialCategory;

  const CatalogScreen({super.key, this.initialCategory});

  @override
  ConsumerState<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends ConsumerState<CatalogScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _categorySearchController = TextEditingController();
  String? _selectedCategory;
  String _categorySearchQuery = '';
  String? _selectedColor;
  String _selectedSort = 'default';
  String _selectedPriceRange = 'all';

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);

    final initial = widget.initialCategory?.trim();
    if (initial != null && initial.isNotEmpty && initial.toLowerCase() != 'all') {
      _selectedCategory = initial;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(catalogNotifierProvider.notifier).setCategory(initial);
      });
    } else {
      _selectedCategory = null;
    }
  }

  @override
  void didUpdateWidget(CatalogScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialCategory != oldWidget.initialCategory) {
      final initial = widget.initialCategory?.trim();
      if (initial != null && initial.isNotEmpty && initial.toLowerCase() != 'all') {
        setState(() {
          _selectedCategory = initial;
        });
        ref.read(catalogNotifierProvider.notifier).setCategory(initial);
      } else {
        setState(() {
          _selectedCategory = null;
        });
        ref.read(catalogNotifierProvider.notifier).setCategory(null);
      }
    }
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(catalogNotifierProvider.notifier).loadMore();
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    _categorySearchController.dispose();
    super.dispose();
  }

  void _selectCategory(String catName) {
    setState(() {
      _selectedCategory = catName;
      _searchController.clear();
    });
    ref.read(catalogNotifierProvider.notifier).setCategory(catName);
  }

  void _backToCategories() {
    setState(() {
      _selectedCategory = null;
      _searchController.clear();
      _selectedColor = null;
      _selectedSort = 'default';
      _selectedPriceRange = 'all';
    });
    ref.read(catalogNotifierProvider.notifier).setCategory(null);
    ref.read(catalogNotifierProvider.notifier).onSearchChanged('');
  }

  @override
  Widget build(BuildContext context) {
    final catalogState = ref.watch(catalogNotifierProvider);
    final wcCategoriesAsync = ref.watch(wcCategoriesProvider);
    final wcProductsAsync = ref.watch(wcProductsProvider);
    final allCategories = wcCategoriesAsync.value ?? WooCommerceService.initialCategories;
    final allProducts = wcProductsAsync.value ?? WooCommerceService.initialProducts;
    final wishlist = ref.watch(wishlistProvider);
    final cartCount = ref.watch(cartCountProvider);

    const primaryColor = Color(0xFF704FEE);
    const darkTextColor = Color(0xFF1E1B4B);

    // If a category is selected, show products of that category with back arrow
    if (_selectedCategory != null) {
      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) {
            _backToCategories();
          }
        },
        child: _buildCategoryProductsView(
          context: context,
          categoryName: _selectedCategory!,
          catalogState: catalogState,
          wishlist: wishlist,
          cartCount: cartCount,
          primaryColor: primaryColor,
          darkTextColor: darkTextColor,
          allCategories: allCategories,
          allProducts: allProducts,
        ),
      );
    }

    // Default view: ONLY CATEGORIES are displayed
    return _buildCategoriesHubView(
      context: context,
      categories: allCategories,
      products: allProducts,
      wishlist: wishlist,
      cartCount: cartCount,
      primaryColor: primaryColor,
      darkTextColor: darkTextColor,
    );
  }

  /// 1. ONLY CATEGORIES HUB VIEW
  Widget _buildCategoriesHubView({
    required BuildContext context,
    required List<WcCategory> categories,
    required List<WcProduct> products,
    required Set<String> wishlist,
    required int cartCount,
    required Color primaryColor,
    required Color darkTextColor,
  }) {
    final filtered = categories.where((c) {
      if (_categorySearchQuery.trim().isEmpty) return true;
      return c.name.toLowerCase().contains(_categorySearchQuery.toLowerCase());
    }).toList();

    // Calculate category min prices from live products
    final Map<String, double> catMinPrice = {};
    for (final p in products) {
      if (p.price <= 0) continue;
      for (final c in p.categories) {
        final key = c.toLowerCase().trim();
        if (!catMinPrice.containsKey(key) || p.price < catMinPrice[key]!) {
          catMinPrice[key] = p.price;
        }
      }
    }

    // Filter and sort categories having cheap / affordable price items
    final cheapCategories = categories.where((cat) {
      final key = cat.name.toLowerCase().trim();
      final minP = catMinPrice[key];
      return minP != null && minP <= 150;
    }).toList();

    cheapCategories.sort((a, b) {
      final pa = catMinPrice[a.name.toLowerCase().trim()] ?? 999999;
      final pb = catMinPrice[b.name.toLowerCase().trim()] ?? 999999;
      return pa.compareTo(pb);
    });

    final displayCheapCats = cheapCategories.isNotEmpty
        ? cheapCategories.take(4).toList()
        : categories.take(4).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      floatingActionButton: _buildFloatingFilterButton(context, products, categories),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: darkTextColor),
          tooltip: 'Back',
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/home');
            }
          },
        ),
        title: Text(
          'Categories',
          style: TextStyle(
            color: darkTextColor,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        centerTitle: true,
        actions: [
          _buildWishlistAction(context, wishlist, darkTextColor, primaryColor),
          const SizedBox(width: 8),
          _buildCartAction(context, cartCount, darkTextColor, primaryColor),
          const SizedBox(width: 14),
        ],
      ),
      body: filtered.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.category_outlined, size: 48, color: Colors.grey.shade400),
                  const SizedBox(height: 12),
                  Text(
                    'No categories found matching "$_categorySearchQuery"',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                  ),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(wcCategoriesProvider);
                ref.invalidate(wcProductsProvider);
              },
              child: CustomScrollView(
                slivers: [
                  // 1. Most Purchased Categories Banner (Placed before search bar at the very top)
                  if (_categorySearchQuery.trim().isEmpty)
                    SliverToBoxAdapter(
                      child: _buildMostPurchasedBanner(
                        displayCheapCats,
                        catMinPrice,
                        primaryColor,
                        darkTextColor,
                      ),
                    ),

                  // 2. Search Bar
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 6, 16, 12),
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: TextField(
                          controller: _categorySearchController,
                          onChanged: (val) {
                            setState(() {
                              _categorySearchQuery = val;
                            });
                          },
                          decoration: InputDecoration(
                            hintText: 'Search categories...',
                            hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 13.5),
                            prefixIcon: const Icon(Icons.search, size: 20, color: Color(0xFF704FEE)),
                            suffixIcon: _categorySearchController.text.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear, size: 18),
                                    onPressed: () {
                                      _categorySearchController.clear();
                                      setState(() {
                                        _categorySearchQuery = '';
                                      });
                                    },
                                  )
                                : null,
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // 3. Grid of Categories
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.82,
                        crossAxisSpacing: 14,
                        mainAxisSpacing: 16,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final cat = filtered[index];
                          return _buildCategoryCard(cat, primaryColor, darkTextColor);
                        },
                        childCount: filtered.length,
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  /// Most Purchased Categories Banner (Placed before search bar at the top)
  Widget _buildMostPurchasedBanner(
    List<WcCategory> cheapCategories,
    Map<String, double> catMinPrice,
    Color primaryColor,
    Color darkTextColor,
  ) {
    if (cheapCategories.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF0F172A),
            Color(0xFF1E1B4B),
            Color(0xFF312E81),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF704FEE).withOpacity(0.22),
            blurRadius: 16,
            offset: const Offset(0, 5),
          ),
        ],
        border: Border.all(color: const Color(0xFF704FEE).withOpacity(0.35), width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFF4757), Color(0xFFFF6B81)],
                  ),
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFFF4757).withOpacity(0.4),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.whatshot_rounded, color: Colors.white, size: 13),
                    SizedBox(width: 4),
                    Text(
                      'TOP PICKS',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'Starting @ ₹10',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'Most Purchased Categories',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            'Budget-friendly automotive lighting & replacement fuses',
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 11.5,
              fontWeight: FontWeight.w400,
            ),
          ),
          const SizedBox(height: 14),

          // 4 Category Cards in a Row
          Row(
            children: cheapCategories.asMap().entries.map((entry) {
              final cat = entry.value;
              final isLast = entry.key == cheapCategories.length - 1;
              final minP = catMinPrice[cat.name.toLowerCase().trim()];
              final priceText = minP != null ? '₹${minP.toStringAsFixed(0)}' : '₹10';

              final imgUrl = (cat.image != null && cat.image!.isNotEmpty)
                  ? cat.image!
                  : 'https://livaan.in/wp-content/uploads/2025/01/1-4.png';

              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: isLast ? 0 : 8.0),
                  child: InkWell(
                    onTap: () => _selectCategory(cat.name),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.white.withOpacity(0.2)),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.12),
                                  blurRadius: 4,
                                ),
                              ],
                            ),
                            padding: const EdgeInsets.all(3),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: CachedNetworkImage(
                                imageUrl: imgUrl,
                                fit: BoxFit.contain,
                                placeholder: (_, __) => Container(color: Colors.grey.shade100),
                                errorWidget: (_, __, ___) => const Icon(Icons.category, size: 20, color: Colors.grey),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            cat.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'From $priceText',
                            style: const TextStyle(
                              color: Color(0xFFFBBF24),
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  /// Category Card in the Categories Grid
  Widget _buildCategoryCard(
    WcCategory cat,
    Color primaryColor,
    Color darkTextColor,
  ) {
    final imgUrl = (cat.image != null && cat.image!.isNotEmpty)
        ? cat.image!
        : 'https://livaan.in/wp-content/uploads/2025/01/1-4.png';

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      elevation: 0.5,
      child: InkWell(
        onTap: () => _selectCategory(cat.name),
        borderRadius: BorderRadius.circular(18),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.grey.shade200),
          ),
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Category Image
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: CachedNetworkImage(
                      imageUrl: imgUrl,
                      fit: BoxFit.contain,
                      placeholder: (_, __) => Container(
                        color: Colors.grey.shade100,
                        child: const Center(
                          child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF704FEE)),
                          ),
                        ),
                      ),
                      errorWidget: (_, __, ___) => const Icon(
                        Icons.category_outlined,
                        size: 36,
                        color: Color(0xFF704FEE),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),

              // Category Name
              Text(
                cat.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  height: 1.2,
                  color: Color(0xFF1E1B4B),
                ),
              ),
              const SizedBox(height: 6),

              // Count Pill & Forward Arrow
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEDE9FE),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${cat.count > 0 ? cat.count : "Explore"} Products',
                      style: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF704FEE),
                      ),
                    ),
                  ),
                  Container(
                    width: 22,
                    height: 22,
                    decoration: const BoxDecoration(
                      color: Color(0xFFF3F4F6),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 10,
                      color: Color(0xFF704FEE),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 2. CATEGORY PRODUCTS VIEW (Appears when a category is tapped)
  Widget _buildCategoryProductsView({
    required BuildContext context,
    required String categoryName,
    required CatalogState catalogState,
    required Set<String> wishlist,
    required int cartCount,
    required Color primaryColor,
    required Color darkTextColor,
    required List<WcCategory> allCategories,
    required List<WcProduct> allProducts,
  }) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      floatingActionButton: _buildFloatingFilterButton(context, allProducts, allCategories),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        // Back arrow returning to the Categories list
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: darkTextColor),
          tooltip: 'Back to Categories',
          onPressed: _backToCategories,
        ),
        title: Text(
          categoryName,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: darkTextColor,
            fontSize: 16.5,
            fontWeight: FontWeight.w800,
          ),
        ),
        centerTitle: true,
        actions: [
          _buildWishlistAction(context, wishlist, darkTextColor, primaryColor),
          const SizedBox(width: 8),
          _buildCartAction(context, cartCount, darkTextColor, primaryColor),
          const SizedBox(width: 14),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 2, 16, 10),
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(14),
              ),
              child: TextField(
                controller: _searchController,
                onChanged: (val) {
                  ref.read(catalogNotifierProvider.notifier).onSearchChanged(val);
                },
                decoration: InputDecoration(
                  hintText: 'Search products in $categoryName...',
                  hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                  prefixIcon: const Icon(Icons.search, size: 20, color: Color(0xFF704FEE)),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            ref.read(catalogNotifierProvider.notifier).onSearchChanged('');
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              ),
            ),
          ),
        ),
      ),
      body: Builder(
        builder: (context) {
          // Loading state
          if (catalogState.isLoading) {
            return const LoadingView(message: 'Loading category products...');
          }

          // Error state
          if (catalogState.error != null) {
            return ErrorView(
              title: 'Unable to load products',
              message: catalogState.error!.message,
              onRetry: () => ref.read(catalogNotifierProvider.notifier).loadInitial(),
            );
          }

          // Empty state
          if (catalogState.isEmpty) {
            return EmptyView(
              title: 'No products in this category',
              message: catalogState.searchQuery.isNotEmpty
                  ? 'No products matched "${catalogState.searchQuery}". Try different keywords.'
                  : 'There are currently no products listed under "$categoryName".',
              icon: Icons.search_off_rounded,
              actionLabel: 'All Categories',
              onAction: _backToCategories,
            );
          }

          // Products Grid with active sort/filter support
          var displayedProducts = catalogState.products;
          if (_selectedPriceRange == 'under_1000') {
            displayedProducts = displayedProducts.where((p) => p.price < 1000).toList();
          } else if (_selectedPriceRange == '1000_2500') {
            displayedProducts = displayedProducts.where((p) => p.price >= 1000 && p.price <= 2500).toList();
          } else if (_selectedPriceRange == 'above_2500') {
            displayedProducts = displayedProducts.where((p) => p.price > 2500).toList();
          }
          if (_selectedSort == 'low_to_high') {
            displayedProducts = [...displayedProducts]..sort((a, b) => a.price.compareTo(b.price));
          } else if (_selectedSort == 'high_to_low') {
            displayedProducts = [...displayedProducts]..sort((a, b) => b.price.compareTo(a.price));
          }

          return RefreshIndicator(
            onRefresh: () => ref.read(catalogNotifierProvider.notifier).refresh(),
            child: GridView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16.0),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.57,
                crossAxisSpacing: 14,
                mainAxisSpacing: 16,
              ),
              itemCount: displayedProducts.length,
              itemBuilder: (context, index) {
                final product = displayedProducts[index];
                final isWish = wishlist.contains(product.id);
                return ProductCard(
                  product: product,
                  isWishlisted: isWish,
                  onWishlistTap: () {
                    ref.read(wishlistProvider.notifier).toggle(
                      product.id,
                      product: DetailedProduct(
                        id: product.id,
                        title: product.title,
                        price: product.price,
                        originalPrice: product.compareAtPrice,
                        rating: 4.8,
                        reviewsCount: 15,
                        images: product.images,
                        description: product.description,
                        colors: [],
                        features: [],
                      ),
                    );
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(!isWish ? 'Added to Wishlist' : 'Removed from Wishlist'),
                        behavior: SnackBarBehavior.floating,
                        duration: const Duration(seconds: 1),
                      ),
                    );
                  },
                  onTap: () {
                    WooCommerceService.cacheProduct(WcProduct(
                      id: product.id,
                      title: product.title,
                      price: product.price,
                      regularPrice: product.compareAtPrice,
                      images: product.images,
                      description: product.description,
                      categories: product.categories,
                      categoryIds: [],
                      colors: [],
                      sizes: [],
                      features: [],
                    ));
                    context.push('/product/${product.id}');
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildWishlistAction(BuildContext context, Set<String> wishlist, Color darkTextColor, Color primaryColor) {
    return InkWell(
      onTap: () => context.push('/wishlist'),
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
            Icon(Icons.favorite_border_rounded, size: 19, color: darkTextColor),
            if (wishlist.isNotEmpty)
              Positioned(
                top: 4,
                right: 4,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: primaryColor,
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                  child: Center(
                    child: Text(
                      '${wishlist.length}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 8,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCartAction(BuildContext context, int cartCount, Color darkTextColor, Color primaryColor) {
    return InkWell(
      onTap: () => context.push('/cart'),
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
            Icon(Icons.shopping_bag_outlined, size: 19, color: darkTextColor),
            if (cartCount > 0)
              Positioned(
                top: 4,
                right: 4,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: primaryColor,
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                  child: Center(
                    child: Text(
                      '$cartCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 8,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildFloatingFilterButton(
    BuildContext context,
    List<WcProduct> products,
    List<WcCategory> categories,
  ) {
    final hasActiveFilter = _selectedCategory != null ||
        _selectedColor != null ||
        _selectedSort != 'default' ||
        _selectedPriceRange != 'all';

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF704FEE), Color(0xFF5B3EE0)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF704FEE).withOpacity(0.4),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: () => _openFilterModal(context, products, categories),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(
                  Icons.tune_rounded,
                  color: Colors.white,
                  size: 24,
                ),
                if (hasActiveFilter)
                  Positioned(
                    top: -2,
                    right: -2,
                    child: Container(
                      width: 9,
                      height: 9,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFBBF24),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openFilterModal(
    BuildContext context,
    List<WcProduct> wcProducts,
    List<WcCategory> wcCategories,
  ) {
    String tempCategory = _selectedCategory ?? 'All';
    String? tempColor = _selectedColor;
    String tempSort = _selectedSort;
    String tempPriceRange = _selectedPriceRange;
    String categorySearchQuery = '';

    final sortOptions = [
      {'id': 'low_to_high', 'label': 'Cheapest to Expensive ↗', 'icon': Icons.trending_up_rounded},
      {'id': 'high_to_low', 'label': 'Expensive to Cheapest ↘', 'icon': Icons.trending_down_rounded},
      {'id': 'default', 'label': 'Featured', 'icon': Icons.star_rounded},
    ];

    final priceRangeOptions = [
      {'id': 'all', 'label': 'All Prices'},
      {'id': 'under_1000', 'label': 'Under ₹1,000 (Cheapest)'},
      {'id': '1000_2500', 'label': '₹1,000 - ₹2,500'},
      {'id': 'above_2500', 'label': 'Above ₹2,500 (Premium)'},
    ];

    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Categories & Filters',
      barrierColor: Colors.black.withOpacity(0.55),
      transitionDuration: const Duration(milliseconds: 280),
      pageBuilder: (dialogCtx, anim1, anim2) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            // Filter categories by search
            final allCategoryNames = [
              'All',
              ...wcCategories
                  .where((c) => c.count > 0 || wcProducts.any((p) => p.categories.any((pc) => pc.toLowerCase() == c.name.toLowerCase())))
                  .map((c) => c.name)
                  .where((n) => n.trim().isNotEmpty)
                  .toSet(),
            ];

            final filteredCategories = allCategoryNames.where((cat) {
              if (categorySearchQuery.trim().isEmpty) return true;
              return cat.toLowerCase().contains(categorySearchQuery.toLowerCase());
            }).toList();

            // Evaluate available colors for the currently selected tempCategory
            final availColorsSet = _getColorsForCategory(tempCategory, wcProducts);
            final hasColors = availColorsSet.isNotEmpty;

            if (tempColor != null && !availColorsSet.any((c) => c.toLowerCase() == tempColor!.toLowerCase())) {
              tempColor = null;
            }

            return Align(
              alignment: Alignment.centerLeft,
              child: Material(
                color: Colors.transparent,
                child: Container(
                  width: MediaQuery.of(dialogCtx).size.width * 0.85,
                  height: double.infinity,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                      topRight: Radius.circular(24),
                      bottomRight: Radius.circular(24),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black26,
                        blurRadius: 20,
                        offset: Offset(4, 0),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 1. Header with purple tune icon, "Categories" title, close button
                        Padding(
                          padding: const EdgeInsets.fromLTRB(18, 16, 14, 12),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(7),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFEDE9FE),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: const Color(0xFFDDD6FE)),
                                    ),
                                    child: const Icon(
                                      Icons.tune_rounded,
                                      size: 19,
                                      color: Color(0xFF704FEE),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  const Text(
                                    'Categories',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF1E1B4B),
                                      letterSpacing: -0.3,
                                    ),
                                  ),
                                ],
                              ),
                              GestureDetector(
                                onTap: () => Navigator.pop(dialogCtx),
                                child: Container(
                                  width: 32,
                                  height: 32,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFF1F5F9),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.close_rounded,
                                    size: 18,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // 2. Search Field
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          child: Container(
                            height: 42,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: TextField(
                              onChanged: (val) {
                                setModalState(() => categorySearchQuery = val);
                              },
                              style: const TextStyle(fontSize: 13, color: Color(0xFF1E1B4B)),
                              decoration: InputDecoration(
                                hintText: 'Search categories...',
                                hintStyle: TextStyle(fontSize: 12.5, color: Colors.grey.shade400),
                                prefixIcon: const Icon(Icons.search_rounded, size: 19, color: Color(0xFF94A3B8)),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),

                        // 3. Scrollable list: categories + colors + pricing
                        Expanded(
                          child: SingleChildScrollView(
                            physics: const BouncingScrollPhysics(),
                            padding: const EdgeInsets.only(bottom: 20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Padding(
                                  padding: const EdgeInsets.fromLTRB(18, 8, 18, 6),
                                  child: Text(
                                    'SELECT CATEGORY',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: Colors.grey.shade500,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                ),

                                ...filteredCategories.map((catName) {
                                  final isAll = catName.toLowerCase() == 'all';
                                  final isSelected = tempCategory.toLowerCase() == catName.toLowerCase();
                                  final iconData = _getCategoryIcon(catName);

                                  return Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 3),
                                    child: InkWell(
                                      onTap: () {
                                        setModalState(() {
                                          tempCategory = catName;
                                          final newColors = _getColorsForCategory(catName, wcProducts);
                                          if (tempColor != null && !newColors.any((c) => c.toLowerCase() == tempColor!.toLowerCase())) {
                                            tempColor = null;
                                          }
                                        });
                                      },
                                      borderRadius: BorderRadius.circular(14),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                        decoration: BoxDecoration(
                                          color: isSelected
                                              ? const Color(0xFFF5F3FF)
                                              : Colors.transparent,
                                          borderRadius: BorderRadius.circular(14),
                                          border: Border.all(
                                            color: isSelected
                                                ? const Color(0xFF704FEE)
                                                : Colors.grey.shade200,
                                            width: isSelected ? 1.4 : 0.8,
                                          ),
                                        ),
                                        child: Row(
                                          children: [
                                            Container(
                                              width: 36,
                                              height: 36,
                                              decoration: BoxDecoration(
                                                color: isSelected
                                                    ? const Color(0xFFEDE9FE)
                                                    : const Color(0xFFF1F5F9),
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                              child: Icon(
                                                iconData,
                                                size: 18,
                                                color: isSelected
                                                    ? const Color(0xFF704FEE)
                                                    : const Color(0xFF64748B),
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Text(
                                                isAll ? 'All Categories' : catName,
                                                style: TextStyle(
                                                  fontSize: 13.5,
                                                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                                                  color: isSelected
                                                      ? const Color(0xFF704FEE)
                                                      : const Color(0xFF1E1B4B),
                                                ),
                                              ),
                                            ),
                                            Icon(
                                              Icons.chevron_right_rounded,
                                              size: 19,
                                              color: isSelected
                                                  ? const Color(0xFF704FEE)
                                                  : Colors.grey.shade400,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  );
                                }),

                                const SizedBox(height: 16),
                                const Divider(height: 1, indent: 16, endIndent: 16, color: Color(0xFFF1F5F9)),
                                const SizedBox(height: 16),

                                // 4. Product Colors Section
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 18),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.palette_rounded, size: 16, color: Color(0xFF704FEE)),
                                      const SizedBox(width: 6),
                                      const Text(
                                        'Product Colors',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF1E1B4B),
                                        ),
                                      ),
                                      if (hasColors) ...[
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFEDE9FE),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            '${availColorsSet.length} available',
                                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF704FEE)),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 10),

                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  child: Builder(
                                    builder: (context) {
                                      if (!hasColors) {
                                        return Container(
                                          width: double.infinity,
                                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFF8FAFC),
                                            borderRadius: BorderRadius.circular(12),
                                            border: Border.all(color: const Color(0xFFE2E8F0)),
                                          ),
                                          child: Row(
                                            children: [
                                              Icon(Icons.palette_outlined, size: 18, color: Colors.grey.shade400),
                                              const SizedBox(width: 10),
                                              Expanded(
                                                child: Text(
                                                  'Colors not available for this category',
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w600,
                                                    color: Colors.grey.shade500,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      }

                                      return Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          ChoiceChip(
                                            label: const Text('All Colors'),
                                            selected: tempColor == null,
                                            onSelected: (_) => setModalState(() => tempColor = null),
                                            selectedColor: const Color(0xFF704FEE),
                                            backgroundColor: const Color(0xFFF1F5F9),
                                            labelStyle: TextStyle(
                                              color: tempColor == null ? Colors.white : const Color(0xFF1E1B4B),
                                              fontWeight: tempColor == null ? FontWeight.w700 : FontWeight.w500,
                                              fontSize: 11.5,
                                            ),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          ),
                                          ...availColorsSet.map((colName) {
                                            final isSelected = tempColor != null && tempColor!.toLowerCase() == colName.toLowerCase();
                                            final uiColor = _getColorForName(colName);

                                            return InkWell(
                                              onTap: () {
                                                setModalState(() {
                                                  tempColor = isSelected ? null : colName;
                                                });
                                              },
                                              borderRadius: BorderRadius.circular(10),
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                                decoration: BoxDecoration(
                                                  color: isSelected ? const Color(0xFFEDE9FE) : const Color(0xFFF8FAFC),
                                                  borderRadius: BorderRadius.circular(10),
                                                  border: Border.all(
                                                    color: isSelected ? const Color(0xFF704FEE) : Colors.grey.shade300,
                                                    width: isSelected ? 1.5 : 1.0,
                                                  ),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Container(
                                                      width: 13,
                                                      height: 13,
                                                      decoration: BoxDecoration(
                                                        color: uiColor,
                                                        shape: BoxShape.circle,
                                                        border: Border.all(color: Colors.grey.shade400, width: 0.5),
                                                      ),
                                                    ),
                                                    const SizedBox(width: 6),
                                                    Text(
                                                      colName,
                                                      style: TextStyle(
                                                        fontSize: 11.5,
                                                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                                        color: isSelected ? const Color(0xFF704FEE) : const Color(0xFF1E1B4B),
                                                      ),
                                                    ),
                                                    if (isSelected) ...[
                                                      const SizedBox(width: 4),
                                                      const Icon(Icons.check_rounded, size: 13, color: Color(0xFF704FEE)),
                                                    ],
                                                  ],
                                                ),
                                              ),
                                            );
                                          }),
                                        ],
                                      );
                                    },
                                  ),
                                ),

                                const SizedBox(height: 16),
                                const Divider(height: 1, indent: 16, endIndent: 16, color: Color(0xFFF1F5F9)),
                                const SizedBox(height: 16),

                                // 5. Pricing Section
                                const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 18),
                                  child: Row(
                                    children: [
                                      Icon(Icons.sell_rounded, size: 16, color: Color(0xFF704FEE)),
                                      SizedBox(width: 6),
                                      Text(
                                        'Pricing & Sort',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF1E1B4B),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 10),

                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Sort Order',
                                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade600),
                                      ),
                                      const SizedBox(height: 6),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: sortOptions.map((opt) {
                                          final id = opt['id'] as String;
                                          final label = opt['label'] as String;
                                          final isSelected = tempSort == id;

                                          return ChoiceChip(
                                            label: Text(label),
                                            selected: isSelected,
                                            onSelected: (_) => setModalState(() => tempSort = id),
                                            selectedColor: const Color(0xFF704FEE),
                                            backgroundColor: const Color(0xFFF1F5F9),
                                            labelStyle: TextStyle(
                                              color: isSelected ? Colors.white : const Color(0xFF1E1B4B),
                                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                              fontSize: 11.5,
                                            ),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          );
                                        }).toList(),
                                      ),
                                      const SizedBox(height: 12),

                                      Text(
                                        'Price Range',
                                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade600),
                                      ),
                                      const SizedBox(height: 6),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: priceRangeOptions.map((opt) {
                                          final id = opt['id'] as String;
                                          final label = opt['label'] as String;
                                          final isSelected = tempPriceRange == id;

                                          return ChoiceChip(
                                            label: Text(label),
                                            selected: isSelected,
                                            onSelected: (_) => setModalState(() => tempPriceRange = id),
                                            selectedColor: const Color(0xFF704FEE),
                                            backgroundColor: const Color(0xFFF1F5F9),
                                            labelStyle: TextStyle(
                                              color: isSelected ? Colors.white : const Color(0xFF1E1B4B),
                                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                              fontSize: 11.5,
                                            ),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          );
                                        }).toList(),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        // 6. Sticky Bottom Action Buttons
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            border: Border(top: BorderSide(color: Colors.grey.shade200)),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.04),
                                blurRadius: 8,
                                offset: const Offset(0, -2),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              TextButton(
                                onPressed: () {
                                  setModalState(() {
                                    tempCategory = 'All';
                                    tempColor = null;
                                    tempSort = 'default';
                                    tempPriceRange = 'all';
                                  });
                                },
                                style: TextButton.styleFrom(
                                  foregroundColor: const Color(0xFFEF4444),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                ),
                                child: const Text(
                                  'Reset',
                                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                ),
                              ),
                              const SizedBox(width: 8),

                              Expanded(
                                child: SizedBox(
                                  height: 44,
                                  child: ElevatedButton.icon(
                                    onPressed: () {
                                      setState(() {
                                        _selectedColor = tempColor;
                                        _selectedSort = tempSort;
                                        _selectedPriceRange = tempPriceRange;
                                        if (tempCategory.toLowerCase() == 'all') {
                                          _backToCategories();
                                        } else {
                                          _selectCategory(tempCategory);
                                        }
                                      });
                                      Navigator.pop(dialogCtx);
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Filters applied successfully! ✨'),
                                          duration: Duration(seconds: 1),
                                          behavior: SnackBarBehavior.floating,
                                          backgroundColor: Color(0xFF704FEE),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.check_rounded, size: 16),
                                    label: const Text(
                                      'Apply Filters',
                                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold),
                                    ),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF704FEE),
                                      foregroundColor: Colors.white,
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
      transitionBuilder: (dialogCtx, anim, secAnim, child) {
        return SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(-1.0, 0.0),
            end: Offset.zero,
          ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
          child: child,
        );
      },
    );
  }

  IconData _getCategoryIcon(String catName) {
    final lower = catName.toLowerCase();
    if (lower.contains('shirt') || lower.contains('top')) return Icons.checkroom_rounded;
    if (lower.contains('night') || lower.contains('suit') || lower.contains('sleep')) return Icons.bedtime_rounded;
    if (lower.contains('beach') || lower.contains('bikini') || lower.contains('swim')) return Icons.beach_access_rounded;
    if (lower.contains('satin') || lower.contains('silk')) return Icons.auto_awesome_rounded;
    if (lower.contains('women')) return Icons.woman_rounded;
    if (lower.contains('jewel') || lower.contains('ring')) return Icons.diamond_rounded;
    if (lower.contains('men')) return Icons.man_rounded;
    return Icons.category_rounded;
  }

  Set<String> _getColorsForCategory(String categoryName, List<WcProduct> products) {
    final colors = <String>{};
    final catLower = categoryName.trim().toLowerCase();
    final relevant = (catLower == 'all' || catLower.isEmpty)
        ? products
        : products.where((p) {
            return p.categories.any((c) {
              final cLower = c.toLowerCase();
              return cLower == catLower || cLower.contains(catLower) || catLower.contains(cLower);
            });
          }).toList();

    for (final p in relevant) {
      for (final col in p.colors) {
        final cTrim = col.trim();
        if (cTrim.isNotEmpty) {
          colors.add(cTrim);
        }
      }
    }
    return colors;
  }

  Color _getColorForName(String name) {
    final n = name.toLowerCase();
    if (n.contains('black')) return const Color(0xFF18181B);
    if (n.contains('white')) return const Color(0xFFFFFFFF);
    if (n.contains('navy')) return const Color(0xFF1E3A8A);
    if (n.contains('blue')) return const Color(0xFF3B82F6);
    if (n.contains('pink')) return const Color(0xFFEC4899);
    if (n.contains('purple')) return const Color(0xFF8B5CF6);
    if (n.contains('red') || n.contains('maroon')) return const Color(0xFFDC2626);
    if (n.contains('green')) return const Color(0xFF10B981);
    if (n.contains('grey') || n.contains('gray')) return const Color(0xFF6B7280);
    if (n.contains('gold') || n.contains('yellow')) return const Color(0xFFD97706);
    if (n.contains('leopard') || n.contains('brown')) return const Color(0xFFB45309);
    if (n.contains('satin')) return const Color(0xFF7C3AED);
    return const Color(0xFF704FEE);
  }
}
