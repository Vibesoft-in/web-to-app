import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/data/mock_products.dart';
import '../../core/providers/shop_providers.dart';
import '../../core/services/woocommerce_service.dart';
import '../../core/widgets/bottom_notification.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import 'catalog_notifier.dart';
import 'models/product_model.dart';

class CatalogScreen extends ConsumerStatefulWidget {
  final String? initialCategory;
  final double? maxPrice;
  final String? initialSort;

  const CatalogScreen({
    super.key,
    this.initialCategory,
    this.maxPrice,
    this.initialSort,
  });

  @override
  ConsumerState<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends ConsumerState<CatalogScreen> {
  final ScrollController _productsScrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();

  /// Currently selected category in the left navigation rail (Hierarchical stores)
  /// -1 represents "Trending Now"
  int _selectedRailId = -1;
  WcCategory? _selectedRootCategory;

  /// Currently active subcategory when viewing products in right pane (Hierarchical stores)
  WcCategory? _activeSubcategory;

  /// Currently selected category in flat stores (Stores with NO subcategories)
  WcCategory? _selectedFlatCategory;

  double? _maxPrice;
  String _searchQuery = '';
  String _selectedSort = 'default';
  bool _initializedWithCategory = false;

  @override
  void initState() {
    super.initState();
    _productsScrollController.addListener(_onProductsScroll);
    if (widget.maxPrice != null) {
      _maxPrice = widget.maxPrice;
    }
    if (widget.initialSort != null && widget.initialSort!.isNotEmpty) {
      _selectedSort = widget.initialSort!;
    }
    if (widget.initialCategory != null && widget.initialCategory!.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _applyInitialCategory(widget.initialCategory);
      });
    }
  }

  @override
  void didUpdateWidget(CatalogScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.maxPrice != oldWidget.maxPrice) {
      setState(() => _maxPrice = widget.maxPrice);
    }
    if (widget.initialSort != oldWidget.initialSort && widget.initialSort != null) {
      setState(() => _selectedSort = widget.initialSort!);
    }
    if (widget.initialCategory != oldWidget.initialCategory) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _applyInitialCategory(widget.initialCategory);
      });
    }
  }

  void _applyInitialCategory(String? categoryName) {
    if (categoryName == null || categoryName.trim().isEmpty || categoryName.toLowerCase() == 'all') {
      setState(() {
        _selectedRailId = -1;
        _selectedRootCategory = null;
        _activeSubcategory = null;
        _selectedFlatCategory = null;
      });
      return;
    }

    final allCategories = ref.read(wcCategoriesProvider).value ?? WooCommerceService.initialCategories;
    final clean = categoryName.trim().toLowerCase();
    final hasHierarchicalSubcategories = allCategories.any((c) => c.parent != 0 && c.parent != c.id);

    WcCategory findMatch(List<WcCategory> list) {
      if (list.isEmpty) return const WcCategory(id: 0, name: '', slug: '');

      // 1. Exact name or slug match
      for (final c in list) {
        final cName = c.name.toLowerCase().trim();
        final cSlug = c.slug.toLowerCase().trim();
        if (cName == clean || cSlug == clean) return c;
      }

      // 2. Substring containment
      for (final c in list) {
        final cName = c.name.toLowerCase().trim();
        if (cName.contains(clean) || clean.contains(cName)) return c;
      }

      // 3. Normalized keyword / semantic matching
      // e.g. "Designer Shirts", "Casual Shirts" -> "Women Shirt"
      if (clean.contains('shirt') || clean.contains('top') || clean.contains('dobby')) {
        for (final c in list) {
          if (c.name.toLowerCase().contains('shirt')) return c;
        }
      }
      // e.g. "Satin Night Suits", "Nightwear Sets" -> "Woman Night Suit"
      if (clean.contains('night') || clean.contains('sleep') || clean.contains('capri')) {
        for (final c in list) {
          if (c.name.toLowerCase().contains('night')) return c;
        }
      }
      // e.g. "Velvet & Satin Fits", "Formal Satins" -> "Woman Satin Shirt"
      if (clean.contains('satin') || clean.contains('velvet') || clean.contains('formal')) {
        for (final c in list) {
          if (c.name.toLowerCase().contains('satin')) return c;
        }
      }
      // e.g. "Beach & Bikinis", "Resort & Beachwear", "Resort Wear" -> "Beach Wear"
      if (clean.contains('beach') || clean.contains('bikini') || clean.contains('swim') || clean.contains('resort')) {
        for (final c in list) {
          if (c.name.toLowerCase().contains('beach') || c.name.toLowerCase().contains('bikini')) return c;
        }
      }
      // e.g. "Bohemian Jewelry", "Jewelry" -> "Bohemian Jewellery"
      if (clean.contains('jewel') || clean.contains('ring') || clean.contains('earring')) {
        for (final c in list) {
          if (c.name.toLowerCase().contains('jewel')) return c;
        }
      }
      // e.g. "Gift And Combo", "Combos" -> "Gift And Combo"
      if (clean.contains('combo') || clean.contains('gift')) {
        for (final c in list) {
          if (c.name.toLowerCase().contains('combo') || c.name.toLowerCase().contains('gift')) return c;
        }
      }
      if (clean == 'women' || clean.contains('women')) {
        for (final c in list) {
          if (c.name.toLowerCase() == 'women') return c;
        }
      }
      if (clean == 'men' || clean.contains('men')) {
        for (final c in list) {
          if (c.name.toLowerCase() == 'men') return c;
        }
      }

      return const WcCategory(id: 0, name: '', slug: '');
    }

    // ================= Scenario 2: Flat store (Only categories and products) =================
    if (!hasHierarchicalSubcategories) {
      final match = findMatch(allCategories);
      if (match.id > 0) {
        setState(() {
          _selectedFlatCategory = match;
          _searchController.clear();
          _searchQuery = '';
        });
        ref.read(catalogNotifierProvider.notifier).setCategory(match.name);
      }
      return;
    }

    // ================= Scenario 1: Hierarchical store (Category with subcategories) =================
    // 1. Check if it matches a subcategory
    final subcategories = allCategories.where((c) => c.parent != 0 && c.parent != c.id).toList();
    final subMatch = findMatch(subcategories);

    if (subMatch.id > 0) {
      final parentMatch = allCategories.firstWhere(
        (c) => c.id == subMatch.parent,
        orElse: () => const WcCategory(id: 0, name: '', slug: ''),
      );

      setState(() {
        _selectedRailId = parentMatch.id > 0 ? parentMatch.id : subMatch.id;
        _selectedRootCategory = parentMatch.id > 0 ? parentMatch : subMatch;
        _activeSubcategory = subMatch;
        _searchController.clear();
        _searchQuery = '';
      });
      ref.read(catalogNotifierProvider.notifier).setCategory(subMatch.name);
      return;
    }

    // 2. Check if it matches a root category
    final rootCategories = allCategories.where((c) => c.parent == 0).toList();
    final rootMatch = findMatch(rootCategories);

    if (rootMatch.id > 0) {
      final hasSub = allCategories.any((c) => c.parent == rootMatch.id && c.id != rootMatch.id);
      setState(() {
        _selectedRailId = rootMatch.id;
        _selectedRootCategory = rootMatch;
        _activeSubcategory = null;
        _searchController.clear();
        _searchQuery = '';
      });
      if (!hasSub) {
        ref.read(catalogNotifierProvider.notifier).setCategory(rootMatch.name);
      }
    }
  }

  void _onProductsScroll() {
    if (_productsScrollController.position.pixels >=
        _productsScrollController.position.maxScrollExtent - 200) {
      ref.read(catalogNotifierProvider.notifier).loadMore();
    }
  }

  @override
  void dispose() {
    _productsScrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  /// Selection handler for left sidebar rail (Hierarchical stores)
  void _onSelectRailItem(WcCategory? rootCat, List<WcCategory> allCategories) {
    if (rootCat == null) {
      // "Trending Now" clicked
      setState(() {
        _selectedRailId = -1;
        _selectedRootCategory = null;
        _activeSubcategory = null;
        _searchController.clear();
        _searchQuery = '';
      });
      return;
    }

    final hasSubcategories = allCategories.any((c) => c.parent == rootCat.id && c.id != rootCat.id);

    setState(() {
      _selectedRailId = rootCat.id;
      _selectedRootCategory = rootCat;
      _activeSubcategory = null;
      _searchController.clear();
      _searchQuery = '';
    });

    if (!hasSubcategories) {
      // If it doesn't have subcategories, immediately fetch its products!
      ref.read(catalogNotifierProvider.notifier).setCategory(rootCat.name);
    }
  }

  /// Subcategory clicked in right pane (Hierarchical stores) -> Show its products!
  void _onSelectSubcategory(WcCategory subcat) {
    setState(() {
      _activeSubcategory = subcat;
      _searchController.clear();
      _searchQuery = '';
    });
    ref.read(catalogNotifierProvider.notifier).setCategory(subcat.name);
  }

  /// Back button inside right pane (Hierarchical stores) -> return to subcategories list
  void _onBackToSubcategories() {
    setState(() {
      _activeSubcategory = null;
      _searchController.clear();
      _searchQuery = '';
    });
  }

  /// Category clicked in circular categories grid (Flat stores) -> Show its products!
  void _onSelectFlatCategory(WcCategory cat) {
    setState(() {
      _selectedFlatCategory = cat;
      _searchController.clear();
      _searchQuery = '';
    });
    ref.read(catalogNotifierProvider.notifier).setCategory(cat.name);
    if (_productsScrollController.hasClients) {
      _productsScrollController.jumpTo(0);
    }
  }

  /// Back button inside products view (Flat stores) -> return to circular categories list
  void _onBackToFlatCategories() {
    setState(() {
      _selectedFlatCategory = null;
      _searchController.clear();
      _searchQuery = '';
    });
    ref.read(catalogNotifierProvider.notifier).setCategory(null);
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

    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    const darkTextColor = Color(0xFF111111);

    // One-time initialization with initialCategory if passed
    if (!_initializedWithCategory && allCategories.isNotEmpty && widget.initialCategory != null) {
      _initializedWithCategory = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _applyInitialCategory(widget.initialCategory);
      });
    }

    final hasHierarchicalSubcategories = allCategories.any((c) => c.parent != 0 && c.parent != c.id);
    final rootCategories = allCategories.where((c) => c.parent == 0).toList();

    // Determine if back button should pop route or navigate back internally
    final isPushedOffer = widget.initialCategory != null && context.canPop();
    final canPopRoute = isPushedOffer
        ? true
        : (hasHierarchicalSubcategories
            ? _activeSubcategory == null
            : _selectedFlatCategory == null);

    void handleBackAction() {
      if (isPushedOffer) {
        context.pop();
        return;
      }
      if (hasHierarchicalSubcategories) {
        if (_activeSubcategory != null) {
          _onBackToSubcategories();
          return;
        }
      } else {
        if (_selectedFlatCategory != null) {
          _onBackToFlatCategories();
          return;
        }
      }
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/home');
      }
    }

    return PopScope(
      canPop: canPopRoute,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          handleBackAction();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: darkTextColor),
            tooltip: 'Back',
            onPressed: handleBackAction,
          ),
          title: Text(
            widget.initialCategory != null && widget.initialCategory!.isNotEmpty
                ? widget.initialCategory!
                : 'Categories',
            style: const TextStyle(
              color: darkTextColor,
              fontSize: 18,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.2,
            ),
          ),
          centerTitle: false,
          actions: [
            _buildWishlistAction(context, wishlist, darkTextColor, primaryColor),
            const SizedBox(width: 8),
            _buildCartAction(context, cartCount, darkTextColor, primaryColor),
            const SizedBox(width: 14),
          ],
        ),
        body: Builder(
          builder: (context) {
            if (wcCategoriesAsync.isLoading && allCategories.isEmpty) {
              return const LoadingView(message: 'Loading categories...');
            }

            if (wcCategoriesAsync.hasError && allCategories.isEmpty) {
              return ErrorView(
                title: 'Unable to load categories',
                message: wcCategoriesAsync.error.toString(),
                onRetry: () => ref.refresh(wcCategoriesProvider),
              );
            }

            // ================= SCENARIO 2: FLAT CATEGORIES ONLY (No subcategories) =================
            // "If only categories and it's products then there should only be the right panel
            //  (remove left one) with the circular ui of categories...and if the user selects
            //  the category then it's products should appear"
            if (!hasHierarchicalSubcategories) {
              if (_selectedFlatCategory == null) {
                return _buildFlatCategoriesGridView(
                  categories: allCategories,
                  primaryColor: primaryColor,
                  darkTextColor: darkTextColor,
                );
              } else {
                return _buildProductsPaneView(
                  category: _selectedFlatCategory!,
                  isDrilledDown: true,
                  isFullWidth: true,
                  parentCategory: _selectedFlatCategory!,
                  catalogState: catalogState,
                  wishlist: wishlist,
                  primaryColor: primaryColor,
                  darkTextColor: darkTextColor,
                  onBack: _onBackToFlatCategories,
                );
              }
            }

            // ================= SCENARIO 1: CATEGORY WITH SUBCATEGORIES =================
            // "If the website have category along with subcategory then the ui of categories should be same"
            return Row(
              children: [
                // 1. LEFT NAVIGATION RAIL
                _buildLeftRail(
                  rootCategories: rootCategories,
                  allCategories: allCategories,
                  primaryColor: primaryColor,
                  accentColor: primaryColor,
                  darkTextColor: darkTextColor,
                ),

                // Vertical divider
                Container(width: 1, color: const Color(0xFFEEEEEE)),

                // 2. RIGHT CONTENT PANE
                Expanded(
                  child: _buildRightPane(
                    catalogState: catalogState,
                    allCategories: allCategories,
                    allProducts: allProducts,
                    wishlist: wishlist,
                    primaryColor: primaryColor,
                    accentColor: primaryColor,
                    darkTextColor: darkTextColor,
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  /// 1. LEFT NAVIGATION RAIL (Hierarchical Myntra-style categories sidebar)
  Widget _buildLeftRail({
    required List<WcCategory> rootCategories,
    required List<WcCategory> allCategories,
    required Color primaryColor,
    required Color accentColor,
    required Color darkTextColor,
  }) {
    return Container(
      width: 86,
      color: const Color(0xFFF7F7FA),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: rootCategories.length + 1, // +1 for "Trending Now" at top
        itemBuilder: (context, index) {
          if (index == 0) {
            // Top Item: Trending Now
            final isSelected = _selectedRailId == -1;
            return _buildRailItem(
              isSelected: isSelected,
              title: 'Trending Now',
              accentColor: accentColor,
              iconWidget: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFF7675), Color(0xFFFF4757)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: accentColor.withValues(alpha: 0.35),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ]
                      : null,
                ),
                child: const Icon(
                  Icons.local_fire_department_rounded,
                  color: Colors.white,
                  size: 26,
                ),
              ),
              onTap: () => _onSelectRailItem(null, allCategories),
            );
          }

          final rootCat = rootCategories[index - 1];
          final isSelected = _selectedRailId == rootCat.id;

          // Dynamic image with smart fallbacks
          final imgUrl = _getCategoryThumbnail(rootCat);

          return _buildRailItem(
            isSelected: isSelected,
            title: rootCat.name,
            accentColor: accentColor,
            iconWidget: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: isSelected ? primaryColor.withValues(alpha: 0.08) : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isSelected ? primaryColor : Colors.grey.shade300,
                  width: isSelected ? 1.6 : 0.8,
                ),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: primaryColor.withValues(alpha: 0.25),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ]
                    : null,
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: imgUrl.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: imgUrl,
                        fit: BoxFit.cover,
                        memCacheWidth: 120,
                        fadeInDuration: const Duration(milliseconds: 120),
                        placeholder: (_, __) => const ColoredBox(color: Color(0xFFF3F4F6)),
                        errorWidget: (_, __, ___) => _getCategoryFallbackIcon(rootCat.name),
                      )
                    : _getCategoryFallbackIcon(rootCat.name),
              ),
            ),
            onTap: () => _onSelectRailItem(rootCat, allCategories),
          );
        },
      ),
    );
  }

  /// Individual Sidebar Rail Tile
  Widget _buildRailItem({
    required bool isSelected,
    required String title,
    required Color accentColor,
    required Widget iconWidget,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Left active pill indicator
            if (isSelected)
              Positioned(
                left: 0,
                top: 8,
                bottom: 8,
                child: Container(
                  width: 4,
                  decoration: BoxDecoration(
                    color: accentColor,
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(4),
                      bottomRight: Radius.circular(4),
                    ),
                  ),
                ),
              ),

            // Icon + Label
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                iconWidget,
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Text(
                    title,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                      color: isSelected ? const Color(0xFF111111) : const Color(0xFF64748B),
                      height: 1.15,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// 2. RIGHT CONTENT PANE (Hierarchical stores)
  Widget _buildRightPane({
    required CatalogState catalogState,
    required List<WcCategory> allCategories,
    required List<WcProduct> allProducts,
    required Set<String> wishlist,
    required Color primaryColor,
    required Color accentColor,
    required Color darkTextColor,
  }) {
    // ---------------- CASE 1: TRENDING NOW ----------------
    if (_selectedRailId == -1) {
      return _buildTrendingSpotlightView(
        allCategories: allCategories,
        allProducts: allProducts,
        wishlist: wishlist,
        primaryColor: primaryColor,
        accentColor: accentColor,
        darkTextColor: darkTextColor,
      );
    }

    final root = _selectedRootCategory;
    if (root == null) {
      return const SizedBox.shrink();
    }

    // Check if this root category has subcategories
    final subcategories = allCategories
        .where((c) => c.parent == root.id && c.id != root.id)
        .toList();

    // ---------------- CASE 2A: CATEGORY HAS SUBCATEGORIES ----------------
    // If it has subcategories and no subcategory has been tapped to view its products yet:
    if (subcategories.isNotEmpty && _activeSubcategory == null) {
      return _buildSubcategoriesGridView(
        parentCategory: root,
        subcategories: subcategories,
        allCategories: allCategories,
        primaryColor: primaryColor,
        darkTextColor: darkTextColor,
      );
    }

    // ---------------- CASE 2B: CATEGORY HAS NO SUBCATEGORIES OR SUBCAT IS ACTIVE ----------------
    // Show the products of this category / active subcategory directly!
    final activeCat = _activeSubcategory ?? root;
    final isDrilledDown = _activeSubcategory != null;

    return _buildProductsPaneView(
      category: activeCat,
      isDrilledDown: isDrilledDown,
      isFullWidth: false,
      parentCategory: root,
      catalogState: catalogState,
      wishlist: wishlist,
      primaryColor: primaryColor,
      darkTextColor: darkTextColor,
      onBack: _onBackToSubcategories,
    );
  }

  /// Flat store circular categories view (full width, no left rail, matching img 2 circular style)
  Widget _buildFlatCategoriesGridView({
    required List<WcCategory> categories,
    required Color primaryColor,
    required Color darkTextColor,
  }) {
    return RefreshIndicator(
      onRefresh: () => ref.refresh(wcCategoriesProvider.future),
      child: CustomScrollView(
        cacheExtent: 500,
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
            sliver: SliverToBoxAdapter(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'In The Spotlight',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF111111),
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Explore Collections',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: primaryColor.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${categories.length} Categories',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: primaryColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 3-Column Circular Categories SliverGrid (lazy virtualized)
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                childAspectRatio: 0.76,
                crossAxisSpacing: 12,
                mainAxisSpacing: 18,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final cat = categories[index];
                  final imgUrl = _getCategoryThumbnail(cat);

                  return RepaintBoundary(
                    child: InkWell(
                      onTap: () => _onSelectFlatCategory(cat),
                      borderRadius: BorderRadius.circular(16),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          // Circular Avatar
                          Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: const Color(0xFFF3F4F6),
                              border: Border.all(color: Colors.grey.shade200, width: 1.2),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.04),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: ClipOval(
                              child: imgUrl.isNotEmpty
                                  ? CachedNetworkImage(
                                      imageUrl: imgUrl,
                                      fit: BoxFit.cover,
                                      memCacheWidth: 180,
                                      fadeInDuration: const Duration(milliseconds: 120),
                                      placeholder: (_, __) => const ColoredBox(color: Color(0xFFF3F4F6)),
                                      errorWidget: (_, __, ___) => _getCategoryFallbackIcon(cat.name),
                                    )
                                  : _getCategoryFallbackIcon(cat.name),
                            ),
                          ),

                          const SizedBox(height: 8),

                          // Category Name
                          Text(
                            cat.name,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF111111),
                              height: 1.15,
                            ),
                          ),

                          if (cat.count > 0) ...[
                            const SizedBox(height: 2),
                            Text(
                              '${cat.count} items',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w500,
                                color: Colors.grey.shade500,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
                childCount: categories.length,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Subcategories Grid (Myntra 3-column circular cards layout in Right Pane)
  Widget _buildSubcategoriesGridView({
    required WcCategory parentCategory,
    required List<WcCategory> subcategories,
    required List<WcCategory> allCategories,
    required Color primaryColor,
    required Color darkTextColor,
  }) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 28),
      children: [
        // Section Title: "In The Spotlight"
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'In The Spotlight',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF111111),
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Explore ${parentCategory.name} Collections',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: Colors.grey.shade600,
                  ),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: primaryColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${subcategories.length} Styles',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: primaryColor,
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        // 3-Column Circular Subcategories Grid
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            childAspectRatio: 0.74,
            crossAxisSpacing: 10,
            mainAxisSpacing: 16,
          ),
          itemCount: subcategories.length,
          itemBuilder: (context, index) {
            final sub = subcategories[index];
            final imgUrl = _getCategoryThumbnail(sub);

            return InkWell(
              onTap: () => _onSelectSubcategory(sub),
              borderRadius: BorderRadius.circular(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Circular Avatar
                  Container(
                    width: 66,
                    height: 66,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFF3F4F6),
                      border: Border.all(color: Colors.grey.shade200, width: 1.2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: ClipOval(
                      child: imgUrl.isNotEmpty
                          ? CachedNetworkImage(
                              imageUrl: imgUrl,
                              fit: BoxFit.cover,
                              memCacheWidth: 160,
                              fadeInDuration: const Duration(milliseconds: 120),
                              placeholder: (_, __) => const ColoredBox(color: Color(0xFFF3F4F6)),
                              errorWidget: (_, __, ___) => _getCategoryFallbackIcon(sub.name),
                            )
                          : _getCategoryFallbackIcon(sub.name),
                    ),
                  ),

                  const SizedBox(height: 7),

                  // Subcategory Name
                  Text(
                    sub.name,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF111111),
                      height: 1.15,
                    ),
                  ),

                  if (sub.count > 0) ...[
                    const SizedBox(height: 2),
                    Text(
                      '${sub.count} items',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w500,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ],
              ),
            );
          },
        ),

        const SizedBox(height: 20),

        // Quick shortcut: "View All Products in Category"
        InkWell(
          onTap: () {
            ref.read(catalogNotifierProvider.notifier).setCategory(parentCategory.name);
            setState(() {
              _activeSubcategory = parentCategory;
            });
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Icon(Icons.grid_view_rounded, size: 16, color: primaryColor),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          'View All ${parentCategory.name} Products',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF111111),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                Icon(Icons.arrow_forward_ios_rounded, size: 12, color: primaryColor),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// Products Grid View (Used in both Hierarchical Right Pane and Flat Screen)
  Widget _buildProductsPaneView({
    required WcCategory category,
    required bool isDrilledDown,
    bool isFullWidth = false,
    required WcCategory parentCategory,
    required CatalogState catalogState,
    required Set<String> wishlist,
    required Color primaryColor,
    required Color darkTextColor,
    VoidCallback? onBack,
  }) {
    // Filter and sort products
    var displayedProducts = catalogState.products;

    // Filter by maxPrice if active offer
    if (_maxPrice != null) {
      final priceFiltered = displayedProducts.where((p) => p.price <= _maxPrice!).toList();
      // If products exist under maxPrice, show them; otherwise show all sorted by price
      if (priceFiltered.isNotEmpty) {
        displayedProducts = priceFiltered;
      }
    }

    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      displayedProducts = displayedProducts.where((p) =>
        p.title.toLowerCase().contains(q) ||
        p.description.toLowerCase().contains(q)
      ).toList();
    }

    if (_selectedSort == 'low_to_high') {
      displayedProducts = [...displayedProducts]..sort((a, b) => a.price.compareTo(b.price));
    } else if (_selectedSort == 'high_to_low') {
      displayedProducts = [...displayedProducts]..sort((a, b) => b.price.compareTo(a.price));
    }

    return Column(
      children: [
        // Top breadcrumb / header bar
        Container(
          padding: EdgeInsets.fromLTRB(isFullWidth ? 14 : 10, 8, isFullWidth ? 14 : 10, 8),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(bottom: BorderSide(color: Color(0xFFEEEEEE), width: 1)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (isDrilledDown) ...[
                    InkWell(
                      onTap: onBack ?? _onBackToSubcategories,
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.arrow_back_rounded, size: 16, color: Color(0xFF111111)),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          category.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF111111),
                          ),
                        ),
                        if (_maxPrice != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 3.0),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: primaryColor.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: primaryColor.withValues(alpha: 0.3)),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        'Offer: Under ₹${_maxPrice!.toInt()}',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800,
                                          color: primaryColor,
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      InkWell(
                                        onTap: () => setState(() => _maxPrice = null),
                                        child: Icon(Icons.close_rounded, size: 12, color: primaryColor),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          )
                        else if (isDrilledDown && category.id != parentCategory.id && parentCategory.name.isNotEmpty)
                          Text(
                            'in ${parentCategory.name}',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey.shade600,
                            ),
                          )
                        else if (category.count > 0)
                          Text(
                            '${category.count} items available',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey.shade600,
                            ),
                          ),
                      ],
                    ),
                  ),

                  // Sort Menu
                  PopupMenuButton<String>(
                    initialValue: _selectedSort,
                    onSelected: (val) {
                      setState(() => _selectedSort = val);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.shade300, width: 0.8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.swap_vert_rounded, size: 14, color: Colors.grey.shade700),
                          const SizedBox(width: 2),
                          Text(
                            _selectedSort == 'low_to_high'
                                ? 'Price ↗'
                                : _selectedSort == 'high_to_low'
                                    ? 'Price ↘'
                                    : 'Sort',
                            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Colors.grey.shade800),
                          ),
                        ],
                      ),
                    ),
                    itemBuilder: (context) => [
                      const PopupMenuItem(value: 'default', child: Text('Featured / Default', style: TextStyle(fontSize: 12))),
                      const PopupMenuItem(value: 'low_to_high', child: Text('Price: Low to High', style: TextStyle(fontSize: 12))),
                      const PopupMenuItem(value: 'high_to_low', child: Text('Price: High to Low', style: TextStyle(fontSize: 12))),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 6),

              // Search bar inside products pane
              Container(
                height: 34,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: TextField(
                  controller: _searchController,
                  style: const TextStyle(fontSize: 12),
                  onChanged: (val) {
                    setState(() => _searchQuery = val);
                  },
                  decoration: InputDecoration(
                    isDense: true,
                    hintText: 'Search in ${category.name}...',
                    hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 11.5),
                    prefixIcon: Icon(Icons.search, size: 16, color: primaryColor),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 14),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Product Grid Content
        Expanded(
          child: catalogState.isLoading
              ? const LoadingView(message: 'Loading products...')
              : catalogState.error != null
                  ? ErrorView(
                      title: 'Error loading products',
                      message: catalogState.error!.message,
                      onRetry: () => ref.read(catalogNotifierProvider.notifier).loadInitial(),
                    )
                  : displayedProducts.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.shopping_bag_outlined, size: 44, color: Color(0xFFCBD5E1)),
                                const SizedBox(height: 10),
                                Text(
                                  'No products found in ${category.name}',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.grey.shade700),
                                ),
                                if (isDrilledDown) ...[
                                  const SizedBox(height: 14),
                                  ElevatedButton.icon(
                                    onPressed: onBack ?? _onBackToSubcategories,
                                    icon: const Icon(Icons.arrow_back, size: 14),
                                    label: const Text('Back to Categories', style: TextStyle(fontSize: 11.5)),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: primaryColor,
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: () => ref.read(catalogNotifierProvider.notifier).refresh(),
                          child: GridView.builder(
                            controller: _productsScrollController,
                            cacheExtent: 500,
                            padding: EdgeInsets.fromLTRB(isFullWidth ? 14 : 10, 10, isFullWidth ? 14 : 10, 24),
                            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: isFullWidth ? 0.68 : 0.55,
                              crossAxisSpacing: isFullWidth ? 12 : 8,
                              mainAxisSpacing: isFullWidth ? 14 : 10,
                            ),
                            itemCount: displayedProducts.length,
                            itemBuilder: (context, index) {
                              final product = displayedProducts[index];
                              final isWish = wishlist.contains(product.id);
                              return RepaintBoundary(
                                child: _buildProductCard(
                                  product: product,
                                  isWishlisted: isWish,
                                  primaryColor: primaryColor,
                                  darkTextColor: darkTextColor,
                                ),
                              );
                            },
                          ),
                        ),
        ),
      ],
    );
  }

  /// Compact E-Commerce Product Card
  Widget _buildProductCard({
    required Product product,
    required bool isWishlisted,
    required Color primaryColor,
    required Color darkTextColor,
  }) {
    final hasDiscount = product.compareAtPrice != null && product.compareAtPrice! > product.price;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      elevation: 0.5,
      child: InkWell(
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
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200, width: 0.8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Product Image with Wishlist Heart
              Expanded(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
                      child: product.images.isNotEmpty
                          ? CachedNetworkImage(
                              imageUrl: product.images.first,
                              fit: BoxFit.cover,
                              memCacheWidth: 420,
                              fadeInDuration: const Duration(milliseconds: 120),
                              placeholder: (_, __) => const ColoredBox(color: Color(0xFFF3F4F6)),
                              errorWidget: (_, __, ___) => Container(
                                color: Colors.grey.shade100,
                                child: Icon(Icons.broken_image_rounded, color: Colors.grey.shade400, size: 24),
                              ),
                            )
                          : Container(
                              color: Colors.grey.shade100,
                              child: Icon(Icons.shopping_bag_outlined, color: Colors.grey.shade400, size: 24),
                            ),
                    ),

                    // Wishlist Heart Icon
                    Positioned(
                      top: 6,
                      right: 6,
                      child: GestureDetector(
                        onTap: () {
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
                          BottomNotification.show(
                            context,
                            message: !isWishlisted ? 'Added to Wishlist ❤️' : 'Removed from Wishlist',
                            icon: !isWishlisted ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                            isSuccess: !isWishlisted,
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.all(4.5),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.92),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.08),
                                blurRadius: 4,
                              ),
                            ],
                          ),
                          child: Icon(
                            isWishlisted ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                            color: isWishlisted ? const Color(0xFFEF4444) : Colors.grey.shade700,
                            size: 14,
                          ),
                        ),
                      ),
                    ),

                    // Sale Pill
                    if (hasDiscount)
                      Positioned(
                        top: 6,
                        left: 6,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFF3F6C),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'SALE',
                            style: TextStyle(
                              fontSize: 8.5,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),

              // Title, Price, & Quick Add
              Padding(
                padding: const EdgeInsets.all(7),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF111111),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Text(
                          '₹${product.price.toStringAsFixed(product.price % 1 == 0 ? 0 : 2)}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF111111),
                          ),
                        ),
                        if (hasDiscount) ...[
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              '₹${product.compareAtPrice!.toStringAsFixed(0)}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w500,
                                color: Colors.grey.shade400,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 5),

                    // Quick "Add to Cart" button
                    SizedBox(
                      width: double.infinity,
                      height: 26,
                      child: ElevatedButton(
                        onPressed: () {
                          ref.read(cartItemsProvider.notifier).addItem(
                            id: product.id,
                            title: product.title,
                            price: product.price,
                            image: product.images.isNotEmpty ? product.images.first : '',
                            quantity: 1,
                          );
                          BottomNotification.show(
                            context,
                            message: 'Added to Cart 🛍️',
                            icon: Icons.check_circle_rounded,
                            isSuccess: true,
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryColor,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: EdgeInsets.zero,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(7),
                          ),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_shopping_cart_rounded, size: 12, color: Colors.white),
                            SizedBox(width: 4),
                            Text(
                              'Add',
                              style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800),
                            ),
                          ],
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
    );
  }

  /// Trending Spotlight View (shown when "Trending Now" is selected in rail)
  Widget _buildTrendingSpotlightView({
    required List<WcCategory> allCategories,
    required List<WcProduct> allProducts,
    required Set<String> wishlist,
    required Color primaryColor,
    required Color accentColor,
    required Color darkTextColor,
  }) {
    // Curated Spotlight items matching Myntra style
    final spotlightItems = [
      {'title': 'New In', 'icon': Icons.fiber_new_rounded, 'color': primaryColor, 'cat': 'New arrivals'},
      {'title': 'Hot Deals', 'icon': Icons.local_fire_department_rounded, 'color': const Color(0xFFFF4757), 'cat': 'Women'},
      {'title': 'Top Rated', 'icon': Icons.star_rounded, 'color': const Color(0xFFF59E0B), 'cat': 'Women Shirt'},
      {'title': 'Nightwear', 'icon': Icons.bedtime_rounded, 'color': primaryColor, 'cat': 'Woman Night Suit'},
      {'title': 'Beachwear', 'icon': Icons.beach_access_rounded, 'color': const Color(0xFF06B6D4), 'cat': 'Beach Wear'},
      {'title': 'Satin Wear', 'icon': Icons.checkroom_rounded, 'color': const Color(0xFFEC4899), 'cat': 'Woman Satin Shirt'},
      {'title': 'Jewelry', 'icon': Icons.diamond_rounded, 'color': const Color(0xFF10B981), 'cat': 'Bohemian Jewellery'},
      {'title': 'Combos', 'icon': Icons.card_giftcard_rounded, 'color': const Color(0xFF3B82F6), 'cat': 'Gift And Combo'},
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 28),
      children: [
        // Spotlight Section Header
        const Row(
          children: [
            Icon(Icons.whatshot_rounded, color: Color(0xFFFF3F6C), size: 18),
            SizedBox(width: 6),
            Text(
              'Trending Stores',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                color: Color(0xFF111111),
                letterSpacing: -0.2,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // 3-Column Spotlight Circular Grid
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            childAspectRatio: 0.74,
            crossAxisSpacing: 10,
            mainAxisSpacing: 14,
          ),
          itemCount: spotlightItems.length,
          itemBuilder: (context, index) {
            final item = spotlightItems[index];
            final itemColor = item['color'] as Color;
            final targetCatName = item['cat'] as String;

            return InkWell(
              onTap: () {
                final match = allCategories.firstWhere(
                  (c) => c.name.toLowerCase() == targetCatName.toLowerCase(),
                  orElse: () => const WcCategory(id: 0, name: '', slug: ''),
                );

                if (match.id > 0) {
                  if (match.parent == 0) {
                    _onSelectRailItem(match, allCategories);
                  } else {
                    final parent = allCategories.firstWhere(
                      (c) => c.id == match.parent,
                      orElse: () => match,
                    );
                    setState(() {
                      _selectedRailId = parent.id;
                      _selectedRootCategory = parent;
                      _activeSubcategory = match;
                    });
                    ref.read(catalogNotifierProvider.notifier).setCategory(match.name);
                  }
                } else {
                  ref.read(catalogNotifierProvider.notifier).setCategory(targetCatName);
                }
              },
              borderRadius: BorderRadius.circular(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [itemColor.withValues(alpha: 0.12), itemColor.withValues(alpha: 0.24)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      border: Border.all(color: itemColor.withValues(alpha: 0.3), width: 1.2),
                    ),
                    child: Center(
                      child: Icon(item['icon'] as IconData, color: itemColor, size: 28),
                    ),
                  ),
                  const SizedBox(height: 7),
                  Text(
                    item['title'] as String,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF111111),
                      height: 1.15,
                    ),
                  ),
                ],
              ),
            );
          },
        ),

        const SizedBox(height: 24),

        // Section: "Top Trending Products"
        const Text(
          'Top Selling Styles',
          style: TextStyle(
            fontSize: 14.5,
            fontWeight: FontWeight.w900,
            color: Color(0xFF111111),
            letterSpacing: -0.2,
          ),
        ),
        const SizedBox(height: 12),

        // Grid of popular products
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 0.55,
            crossAxisSpacing: 8,
            mainAxisSpacing: 10,
          ),
          itemCount: allProducts.take(6).length,
          itemBuilder: (context, index) {
            final p = allProducts[index];
            final prod = Product(
              id: p.id,
              title: p.title,
              price: p.price,
              compareAtPrice: p.regularPrice,
              currency: 'INR',
              images: p.images,
              description: p.description,
              inStock: p.inStock,
              variants: const [],
              categories: p.categories,
            );
            return _buildProductCard(
              product: prod,
              isWishlisted: wishlist.contains(p.id),
              primaryColor: primaryColor,
              darkTextColor: darkTextColor,
            );
          },
        ),
      ],
    );
  }

  /// Category Image resolver with smart fallbacks
  String _getCategoryThumbnail(WcCategory cat) {
    if (cat.image != null && cat.image!.isNotEmpty) {
      return cat.image!;
    }
    final name = cat.name.toLowerCase();
    if (name.contains('women shirt')) {
      return 'https://livaan.in/wp-content/uploads/2025/01/4-png.avif';
    } else if (name.contains('night suit')) {
      return 'https://livaan.in/wp-content/uploads/2025/01/4-3-1.avif';
    } else if (name.contains('satin shirt')) {
      return 'https://livaan.in/wp-content/uploads/2025/01/1-2-png.avif';
    } else if (name.contains('beach wear') || name.contains('swimwear') || name.contains('bikini')) {
      return 'https://livaan.in/wp-content/uploads/2025/01/3-png.avif';
    } else if (name.contains('women jewelry') || name.contains('bohemian jewellery')) {
      return 'https://livaan.in/wp-content/uploads/2025/01/2-2-png.avif';
    } else if (name.contains('combo') || name.contains('gift')) {
      return 'https://livaan.in/wp-content/uploads/2025/01/Combo.avif';
    } else if (name.contains('women')) {
      return 'https://livaan.in/wp-content/uploads/2025/01/Untitled-design-13-png.avif';
    }
    return '';
  }

  Widget _getCategoryFallbackIcon(String catName) {
    final lower = catName.toLowerCase();
    IconData icon = Icons.category_rounded;
    Color color = const Color(0xFFE53935);

    if (lower.contains('shirt') || lower.contains('wear') || lower.contains('women') || lower.contains('men')) {
      icon = Icons.checkroom_rounded;
    } else if (lower.contains('jewel') || lower.contains('ring')) {
      icon = Icons.diamond_rounded;
      color = const Color(0xFF10B981);
    } else if (lower.contains('gift') || lower.contains('combo')) {
      icon = Icons.card_giftcard_rounded;
      color = const Color(0xFFF59E0B);
    } else if (lower.contains('night')) {
      icon = Icons.bedtime_rounded;
      color = const Color(0xFFE53935);
    }

    return Container(
      color: color.withValues(alpha: 0.08),
      child: Center(
        child: Icon(icon, color: color, size: 24),
      ),
    );
  }

  Widget _buildWishlistAction(BuildContext context, Set<String> wishlist, Color darkTextColor, Color primaryColor) {
    return InkWell(
      onTap: () => context.go('/wishlist'),
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
}
