import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/data/mock_products.dart';
import '../../core/providers/shop_providers.dart';
import '../../core/services/woocommerce_service.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String _selectedCategory = 'All';
  int? _selectedCategoryId;
  bool _isLoadingCategoryProducts = false;
  final Map<int, List<WcProduct>> _categoryProductsCache = {};

  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  String _searchQuery = '';
  bool _isSearchActive = false;
  bool _showAllFlashSale = false;
  bool _showAllBestSelling = false;

  // 4-Second Dynamic Placeholder Timer
  Timer? _placeholderTimer;
  int _placeholderIndex = 0;
  final List<String> _rotatingHints = [
    'Women Shirt',
    'Night Suit Set',
    'Satin Shirt',
    'Beach Wear',
    'High Waist Bikini',
    'Summer Cover-ups',
  ];

  // 4-Second Auto-Swiping Hero Banners
  late final PageController _bannerPageController;
  Timer? _bannerTimer;
  int _currentBannerIndex = 0;
  static const int _totalBanners = 4;

  // Filter state
  String? _selectedColor;
  String _selectedSort = 'default'; // 'default', 'low_to_high', 'high_to_low'
  String _selectedPriceRange = 'all'; // 'all', 'under_1000', '1000_2500', 'above_2500'

  // Scroll Controller for Sticky Header & Floating Search Icon
  final _scrollController = ScrollController();
  bool _isScrolled = false;

  @override
  void initState() {
    super.initState();
    _placeholderTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (mounted) {
        setState(() {
          _placeholderIndex = (_placeholderIndex + 1) % _rotatingHints.length;
        });
      }
    });

    _bannerPageController = PageController();
    _bannerTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (mounted && _bannerPageController.hasClients) {
        final nextIndex = (_currentBannerIndex + 1) % _totalBanners;
        _bannerPageController.animateToPage(
          nextIndex,
          duration: const Duration(milliseconds: 650),
          curve: Curves.easeInOutCubic,
        );
      }
    });

    _searchFocusNode.addListener(() {
      if (_searchFocusNode.hasFocus && !_isSearchActive) {
        setState(() => _isSearchActive = true);
      }
    });

    _scrollController.addListener(() {
      final isScrolled = _scrollController.hasClients && _scrollController.offset > 35;
      if (isScrolled != _isScrolled) {
        setState(() {
          _isScrolled = isScrolled;
        });
      }
    });
  }

  @override
  void dispose() {
    _placeholderTimer?.cancel();
    _bannerTimer?.cancel();
    _bannerPageController.dispose();
    _searchFocusNode.dispose();
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _getSearchResults(List<WcProduct> wcProducts) {
    final query = _searchQuery.trim().toLowerCase();
    if (query.isEmpty) return [];
    return wcProducts.where((p) {
      final title = p.title.toLowerCase();
      final inCat = p.categories.any((c) => c.toLowerCase().contains(query));
      return title.contains(query) || inCat;
    }).map((p) => p.toMap()).toList();
  }

  Future<void> _loadProductsForCategory(int catId) async {
    if (_categoryProductsCache.containsKey(catId)) return;
    setState(() => _isLoadingCategoryProducts = true);
    try {
      final service = ref.read(wcServiceProvider);
      final products = await service.fetchProducts(categoryId: catId);
      if (mounted) {
        setState(() {
          _categoryProductsCache[catId] = products;
          _isLoadingCategoryProducts = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading category products for catId $catId: $e');
      if (mounted) {
        setState(() => _isLoadingCategoryProducts = false);
      }
    }
  }

  List<Map<String, dynamic>> _getCategoriesList(List<WcCategory> wcCategories) {
    // Only display categories from website that actually have products (count > 0)
    final validCategories = wcCategories.where((c) => c.count > 0).toList();
    final categoriesToUse = validCategories.isNotEmpty ? validCategories : wcCategories;

    return [
      {
        'id': 'All',
        'name': 'All',
        'catId': 0,
        'count': 0,
        'icon': Icons.grid_view_rounded,
        'image': null,
      },
      ...categoriesToUse.map((c) => {
        'id': c.name,
        'name': c.name,
        'catId': c.id,
        'count': c.count,
        'icon': _getCategoryIcon(c.name),
        'image': c.image,
      }),
    ];
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

  List<Map<String, dynamic>> _getFlashSaleProducts(List<WcProduct> wcProducts) {
    final onSale = wcProducts.where((p) => p.discount != null || (p.salePrice != null && p.salePrice! > 0)).toList();
    if (onSale.isNotEmpty) {
      return onSale.map((p) => p.toMap()).toList();
    }
    return wcProducts.map((p) => p.toMap()).toList();
  }

  List<Map<String, dynamic>> _getFilteredProducts(List<WcProduct> wcProducts) {
    List<WcProduct> listToFilter;

    // 1. Filter by category
    if (_selectedCategory != 'All' && _selectedCategory.isNotEmpty) {
      if (_selectedCategoryId != null &&
          _categoryProductsCache.containsKey(_selectedCategoryId) &&
          _categoryProductsCache[_selectedCategoryId]!.isNotEmpty) {
        // Use products loaded directly from WooCommerce for this category!
        listToFilter = _categoryProductsCache[_selectedCategoryId]!;
      } else {
        // Fallback filter from in-memory wcProducts
        final catLower = _selectedCategory.toLowerCase();
        final matched = wcProducts.where((p) {
          final idMatch = _selectedCategoryId != null && p.categoryIds.contains(_selectedCategoryId);
          final nameMatch = p.categories.any((c) {
            final cLower = c.toLowerCase();
            return cLower == catLower || cLower.contains(catLower) || catLower.contains(cLower);
          });
          return idMatch || nameMatch;
        }).toList();

        listToFilter = matched;

        // Auto-fetch from WooCommerce if not cached yet
        if (_selectedCategoryId != null &&
            _selectedCategoryId! > 0 &&
            !_categoryProductsCache.containsKey(_selectedCategoryId) &&
            !_isLoadingCategoryProducts) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _loadProductsForCategory(_selectedCategoryId!);
          });
        }
      }
    } else {
      listToFilter = wcProducts.toList();
    }

    var filtered = List<WcProduct>.from(listToFilter);

    // 2. Filter by selected color
    if (_selectedColor != null && _selectedColor!.isNotEmpty && _selectedColor != 'all') {
      final cLower = _selectedColor!.toLowerCase();
      filtered = filtered.where((p) {
        final hasDirectColor = p.colors.any((c) => c.toLowerCase().contains(cLower) || cLower.contains(c.toLowerCase()));
        final title = p.title.toLowerCase();
        final desc = p.description.toLowerCase();
        final cats = p.categories.join(' ').toLowerCase();
        if (cLower == 'red') {
          return hasDirectColor || title.contains('red') || desc.contains('red') ||
                 title.contains('maroon') || desc.contains('maroon') ||
                 title.contains('wine') || desc.contains('wine');
        }
        if (cLower == 'navy') {
          return hasDirectColor || title.contains('navy') || desc.contains('navy');
        }
        return hasDirectColor || title.contains(cLower) || desc.contains(cLower) || cats.contains(cLower);
      }).toList();
    }

    // 3. Filter by price range (Cheapest to Expensive brackets)
    if (_selectedPriceRange == 'under_1000') {
      filtered = filtered.where((p) => p.price < 1000).toList();
    } else if (_selectedPriceRange == '1000_2500') {
      filtered = filtered.where((p) => p.price >= 1000 && p.price <= 2500).toList();
    } else if (_selectedPriceRange == 'above_2500') {
      filtered = filtered.where((p) => p.price > 2500).toList();
    }

    // 4. Sort by price (Cheapest to Expensive or Expensive to Cheapest)
    if (_selectedSort == 'low_to_high') {
      filtered.sort((a, b) => a.price.compareTo(b.price));
    } else if (_selectedSort == 'high_to_low') {
      filtered.sort((a, b) => b.price.compareTo(a.price));
    }

    return filtered.map((p) => p.toMap()).toList();
  }

  void _navigateToProduct(String id) {
    context.push('/product/$id');
  }

  @override
  Widget build(BuildContext context) {
    final wishlistedIds = ref.watch(wishlistProvider);
    final cartCount = ref.watch(cartCountProvider);
    final userProfile = ref.watch(userProfileProvider);
    final unreadNotifCount = ref.watch(unreadNotificationsCountProvider);

    // Watch WooCommerce Live Data
    final wcCategoriesAsync = ref.watch(wcCategoriesProvider);
    final wcProductsAsync = ref.watch(wcProductsProvider);

    final allWcProducts = wcProductsAsync.value ?? WooCommerceService.initialProducts;
    final allWcCategories = wcCategoriesAsync.value ?? WooCommerceService.initialCategories;

    final categoriesList = _getCategoriesList(allWcCategories);
    final flashSaleProducts = _getFlashSaleProducts(allWcProducts);
    final displayedProducts = _getFilteredProducts(allWcProducts);
    final searchResults = _getSearchResults(allWcProducts);

    const primaryColor = Color(0xFF704FEE);
    const darkTextColor = Color(0xFF1E1B4B);

    const darkHeaderBg = Color(0xFF0F172A); // Matching Profile page header luxury dark navy

    return Scaffold(
      backgroundColor: Colors.white,
      body: AnnotatedRegion<SystemUiOverlayStyle>(
        value: const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
          statusBarBrightness: Brightness.dark,
        ),
        child: Container(
          color: darkHeaderBg,
          child: SafeArea(
            bottom: false,
            child: Container(
              color: Colors.white,
              child: Column(
                children: [
                  // 1. Unified Header Container (From top through Search Bar with bottom radius - collapses search bar on scroll)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeInOut,
                    decoration: const BoxDecoration(
                      color: darkHeaderBg,
                      borderRadius: BorderRadius.only(
                        bottomLeft: Radius.circular(24),
                        bottomRight: Radius.circular(24),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black26,
                          blurRadius: 10,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    padding: EdgeInsets.fromLTRB(18.0, 10.0, 18.0, _isScrolled ? 10.0 : 16.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Top Row: Brand Logo + Livaan + Action Icons
                        _buildHeader(
                          primaryColor,
                          darkTextColor,
                          wishlistedIds.length,
                          cartCount,
                          unreadNotifCount,
                          userProfile,
                        ),
                        // Un-scrolled: Full Search Bar with Filter button
                        // Scrolled: Compact Sticky Category Names Strip (only names visible)
                        if (!_isScrolled) ...[
                          const SizedBox(height: 12),
                          _buildSearchBar(primaryColor, darkTextColor, allWcProducts, allWcCategories),
                        ] else ...[
                          const SizedBox(height: 10),
                          _buildStickyCategoryNamesRow(categoriesList),
                        ],
                      ],
                    ),
                  ),

                  // 2. Scrollable Body Content
                  Expanded(
                    child: Stack(
                      children: [
                        SingleChildScrollView(
                          controller: _scrollController,
                          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                          padding: const EdgeInsets.fromLTRB(18.0, 14.0, 18.0, 80.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (_isSearchActive) ...[
                                if (_searchQuery.isNotEmpty) ...[
                                  // In-Place Search Results (Matches WooCommerce products!)
                                  _buildSearchResultsSection(primaryColor, darkTextColor, wishlistedIds, searchResults),
                                ] else ...[
                                  // 1. Trending Searches
                                  _buildTrendingSearchesSection(primaryColor, darkTextColor),
                                  const SizedBox(height: 24),

                                  // 2. Products You Recently Viewed
                                  _buildRecentlyViewedSection(primaryColor, darkTextColor, allWcProducts, wishlistedIds),
                                  const SizedBox(height: 24),

                                  // 3. Top Categories
                                  _buildTopCategoriesSection(primaryColor, darkTextColor, allWcCategories),
                                ],
                              ] else ...[
                                // 2. Circle Categories directly under search bar
                                _buildCategoriesRow(primaryColor, darkTextColor, categoriesList),
                                const SizedBox(height: 18),

                                // 3. 4 Auto-Swiping Banners (every 4 seconds) with Indicators
                                _buildAutoSwipingBanners(primaryColor, darkTextColor, allWcProducts),
                                const SizedBox(height: 22),

                                // 4. Flash Sale Products (Marquee)
                                _buildFlashSaleSection(primaryColor, darkTextColor, flashSaleProducts),
                                const SizedBox(height: 22),

                                // 4b. Lowest Prices Night Suits Banner (Swipeable live-style carousel)
                                _buildLowestPricesNightSuitsBanner(allWcProducts),
                                const SizedBox(height: 22),

                                // 5. Products Section
                                _buildBestSellingSection(primaryColor, darkTextColor, wishlistedIds, displayedProducts, allWcProducts),
                              ],
                              const SizedBox(height: 20),
                            ],
                          ),
                        ),

                        // Fixed Bottom-Right Filter Button (Visible on scroll)
                        if (_isScrolled)
                          Positioned(
                            bottom: 18,
                            right: 18,
                            child: _buildFloatingFilterButton(allWcProducts, allWcCategories),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// 1. Top Header with Website Logo + "Livaan" brand name on left & dynamic action icons on right
  Widget _buildHeader(
    Color primaryColor,
    Color darkTextColor,
    int wishlistCount,
    int cartCount,
    int unreadNotifCount,
    UserProfile userProfile,
  ) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // Left: Website Logo + "Livaan" brand name
        Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 36,
              height: 36,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: Colors.white.withOpacity(0.18),
                  width: 1,
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(7),
                child: CachedNetworkImage(
                  imageUrl: WooCommerceService.siteIconUrl,
                  fit: BoxFit.contain,
                  placeholder: (context, url) => const Center(
                    child: SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white70,
                      ),
                    ),
                  ),
                  errorWidget: (context, url, error) => const Icon(
                    Icons.shopping_bag_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            const Text(
              WooCommerceService.storeName,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),

        // Right: Search (on scroll) + Wishlist + Notification + Cart Icons
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Search Icon: Only visible when scrolled down and search bar has collapsed
            if (_isScrolled) ...[
              _buildHeaderIconButton(
                icon: Icons.search_rounded,
                onTap: () => context.push('/search'),
              ),
              const SizedBox(width: 6),
            ],

            // Wishlist icon WITH LIVE BADGE
            _buildHeaderIconButton(
              icon: Icons.favorite_border_rounded,
              badgeCount: wishlistCount > 0 ? wishlistCount : null,
              onTap: () => context.push('/wishlist'),
            ),
            const SizedBox(width: 6),

            // Notification Bell with LIVE dynamic badge
            _buildHeaderIconButton(
              icon: Icons.notifications_none_rounded,
              badgeCount: unreadNotifCount > 0 ? unreadNotifCount : null,
              onTap: () => context.push('/notifications'),
            ),
            const SizedBox(width: 6),

            // Cart Icon with badge
            _buildHeaderIconButton(
              icon: Icons.shopping_bag_outlined,
              badgeCount: cartCount > 0 ? cartCount : null,
              onTap: () => context.push('/cart'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildHeaderIconButton({
    required IconData icon,
    int? badgeCount,
    required VoidCallback onTap,
    Color? iconColor,
    Color? bgColor,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: bgColor ?? Colors.white.withOpacity(0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.18), width: 1),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(icon, size: 19, color: iconColor ?? Colors.white),
            if (badgeCount != null)
              Positioned(
                top: 3,
                right: 3,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: const BoxDecoration(
                    color: Color(0xFFEF4444),
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                  child: Center(
                    child: Text(
                      '$badgeCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 8.5,
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



  /// Voice Search Modal
  void _openVoiceSearchModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return _VoiceSearchBottomSheet(
          onSearchSelected: (query) {
            Navigator.pop(ctx);
            setState(() {
              _searchController.text = query;
              _searchQuery = query;
              _isSearchActive = true;
            });
            _searchFocusNode.requestFocus();
          },
        );
      },
    );
  }

  /// 2. Search Bar with Dynamic Animated Rotating Placeholder & Filter Button
  Widget _buildSearchBar(
    Color primaryColor,
    Color darkTextColor,
    List<WcProduct> wcProducts,
    List<WcCategory> wcCategories,
  ) {
    final activeHints = wcCategories.isNotEmpty
        ? wcCategories.map((c) => c.name).take(8).toList()
        : (wcProducts.isNotEmpty
            ? wcProducts.map((p) => p.title).take(8).toList()
            : _rotatingHints);
    final safeIndex = activeHints.isNotEmpty ? (_placeholderIndex % activeHints.length) : 0;
    final currentHint = activeHints.isNotEmpty ? activeHints[safeIndex] : 'products';

    final hasActiveFilter = (_selectedColor != null && _selectedColor!.isNotEmpty) ||
        _selectedSort != 'default' ||
        _selectedPriceRange != 'all' ||
        (_selectedCategory != 'All' && _selectedCategory.isNotEmpty);

    return Row(
      children: [
        if (_isSearchActive) ...[
          InkWell(
            onTap: () {
              _searchFocusNode.unfocus();
              _searchController.clear();
              setState(() {
                _isSearchActive = false;
                _searchQuery = '';
              });
            },
            borderRadius: BorderRadius.circular(14),
            child: Container(
              width: 44,
              height: 48,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFDDD6FE)),
                boxShadow: [
                  BoxShadow(
                    color: primaryColor.withOpacity(0.06),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.arrow_back_rounded,
                size: 20,
                color: Color(0xFF1E1B4B),
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
        Expanded(
          child: Container(
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: _isSearchActive ? primaryColor : const Color(0xFFDDD6FE),
                width: _isSearchActive ? 1.5 : 1.0,
              ),
              boxShadow: [
                BoxShadow(
                  color: primaryColor.withOpacity(0.06),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                Icon(
                  Icons.search_rounded,
                  color: _isSearchActive ? primaryColor : Colors.grey.shade400,
                  size: 22,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Stack(
                    alignment: Alignment.centerLeft,
                    children: [
                      // Static 'Search products (e.g. ' + Only product name animates every 3 seconds!
                      if (_searchController.text.isEmpty)
                        IgnorePointer(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Search "',
                                style: TextStyle(
                                  color: Colors.grey.shade400,
                                  fontSize: 13,
                                  fontFamily: 'Inter',
                                ),
                              ),
                              Flexible(
                                child: SizedBox(
                                  height: 20,
                                  child: ClipRect(
                                    child: AnimatedSwitcher(
                                      duration: const Duration(milliseconds: 450),
                                      switchInCurve: Curves.easeInOutCubic,
                                      switchOutCurve: Curves.easeInOutCubic,
                                      layoutBuilder: (currentChild, previousChildren) {
                                        return Stack(
                                          alignment: Alignment.centerLeft,
                                          children: [
                                            ...previousChildren,
                                            if (currentChild != null) currentChild,
                                          ],
                                        );
                                      },
                                      transitionBuilder: (child, animation) {
                                        final isIncoming = (child.key as ValueKey<int>?)?.value == _placeholderIndex;
                                        final inTween = Tween<Offset>(
                                          begin: const Offset(0.0, 1.2),
                                          end: Offset.zero,
                                        );
                                        final outTween = Tween<Offset>(
                                          begin: const Offset(0.0, -1.2),
                                          end: Offset.zero,
                                        );
                                        return SlideTransition(
                                          position: (isIncoming ? inTween : outTween).animate(animation),
                                          child: child,
                                        );
                                      },
                                      child: Text(
                                        currentHint,
                                        key: ValueKey<int>(_placeholderIndex),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF704FEE),
                                          fontSize: 13,
                                          fontFamily: 'Inter',
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              Text(
                                '"',
                                style: TextStyle(
                                  color: Colors.grey.shade400,
                                  fontSize: 13,
                                  fontFamily: 'Inter',
                                ),
                              ),
                            ],
                          ),
                        ),
                      TextField(
                        controller: _searchController,
                        focusNode: _searchFocusNode,
                        onTap: () {
                          if (!_isSearchActive) {
                            setState(() => _isSearchActive = true);
                          }
                        },
                        onChanged: (query) {
                          setState(() {
                            _searchQuery = query.trim();
                            if (!_isSearchActive) _isSearchActive = true;
                          });
                        },
                        onSubmitted: (query) {
                          setState(() {
                            _searchQuery = query.trim();
                            if (!_isSearchActive) _isSearchActive = true;
                          });
                        },
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF1E1B4B),
                        ),
                        decoration: const InputDecoration(
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: EdgeInsets.zero,
                          filled: false,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_searchQuery.isNotEmpty) ...[
                  GestureDetector(
                    onTap: () {
                      _searchController.clear();
                      setState(() => _searchQuery = '');
                    },
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.close_rounded,
                        size: 14,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                ],
                // Mic Icon for Voice/Audio Search inside search bar
                GestureDetector(
                  onTap: () => _openVoiceSearchModal(context),
                  child: Container(
                    padding: const EdgeInsets.all(5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEDE9FE).withOpacity(0.5),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.mic_rounded,
                      size: 20,
                      color: Color(0xFF704FEE),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 10),
        InkWell(
          onTap: () => _openFilterModal(context, wcProducts, wcCategories),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: hasActiveFilter
                  ? const Color(0xFF704FEE)
                  : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: hasActiveFilter
                    ? const Color(0xFF704FEE)
                    : const Color(0xFFDDD6FE),
              ),
              boxShadow: [
                BoxShadow(
                  color: primaryColor.withOpacity(0.06),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Icon(
                  Icons.tune_rounded,
                  size: 20,
                  color: hasActiveFilter ? Colors.white : const Color(0xFF1E1B4B),
                ),
                if (hasActiveFilter)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFFF59E0B),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// Sticky Compact Category Names Row (Visible when page scrolls)
  Widget _buildStickyCategoryNamesRow(List<Map<String, dynamic>> categories) {
    return SizedBox(
      height: 32,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final cat = categories[index];
          final catName = cat['name'] as String;
          final catId = cat['catId'] as int?;
          final isSelected = catName.toLowerCase() == _selectedCategory.toLowerCase();

          return GestureDetector(
            onTap: () {
              if (isSelected) return;
              setState(() {
                _selectedCategory = catName;
                _selectedCategoryId = catId;
                _showAllBestSelling = true;
              });
              if (catId != null && catId > 0 && !_categoryProductsCache.containsKey(catId)) {
                _loadProductsForCategory(catId);
              }
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFF704FEE) : Colors.white.withOpacity(0.12),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isSelected ? const Color(0xFF704FEE) : Colors.white.withOpacity(0.2),
                  width: 1.2,
                ),
              ),
              child: Center(
                child: Text(
                  catName,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  /// Small Floating Filter Button at Bottom-Right (Fixed on scroll)
  Widget _buildFloatingFilterButton(
    List<WcProduct> wcProducts,
    List<WcCategory> wcCategories,
  ) {
    final hasActiveFilter = (_selectedColor != null && _selectedColor!.isNotEmpty) ||
        _selectedSort != 'default' ||
        _selectedPriceRange != 'all' ||
        (_selectedCategory != 'All' && _selectedCategory.isNotEmpty);

    return TweenAnimationBuilder<double>(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOutBack,
      tween: Tween<double>(begin: 0.0, end: 1.0),
      builder: (context, scale, child) {
        return Transform.scale(
          scale: scale,
          child: child,
        );
      },
      child: GestureDetector(
        onTap: () => _openFilterModal(context, wcProducts, wcCategories),
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF704FEE), Color(0xFF5B32E8)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF704FEE).withOpacity(0.45),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              const Icon(
                Icons.tune_rounded,
                color: Colors.white,
                size: 20,
              ),
              if (hasActiveFilter)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 1.5),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  /// Trending Searches Section (Pill Chips)
  Widget _buildTrendingSearchesSection(Color primaryColor, Color darkTextColor) {
    final trendingTerms = [
      'Women Shirt',
      'Black Dotted Shirt',
      'Leopard Print Shirt',
      'Solid Satin Shirt',
      'Black Net Shirt',
      'Beach Wear',
      'High Waist Bikini',
      'Woman Night Suit',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Text(
              'Trending Searches',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: Color(0xFF1E1B4B),
                letterSpacing: -0.3,
              ),
            ),
            SizedBox(width: 6),
            Text('🔥', style: TextStyle(fontSize: 16)),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 10,
          children: trendingTerms.map((term) {
            return InkWell(
              onTap: () {
                _searchController.text = term;
                setState(() => _searchQuery = term);
              },
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.trending_up_rounded, size: 14, color: primaryColor),
                    const SizedBox(width: 6),
                    Text(
                      term,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF334155),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  /// Products You Recently Viewed Section (Horizontal Cards)
  Widget _buildRecentlyViewedSection(
    Color primaryColor,
    Color darkTextColor,
    List<WcProduct> products,
    Set<String> wishlistedIds,
  ) {
    if (products.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Row(
              children: [
                Text(
                  'Products You Recently Viewed',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1E1B4B),
                    letterSpacing: -0.3,
                  ),
                ),
                SizedBox(width: 6),
                Text('🕒', style: TextStyle(fontSize: 15)),
              ],
            ),
            Text(
              '${products.length} Items',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade500,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 290,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            clipBehavior: Clip.none,
            itemCount: products.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (context, index) {
              final prod = products[index];
              final isWishlisted = wishlistedIds.contains(prod.id);

              return GestureDetector(
                onTap: () => _navigateToProduct(prod.id),
                child: Container(
                  width: 175,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey.shade200),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Product Image Container
                      Container(
                        height: 125,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: CachedNetworkImage(
                            imageUrl: prod.primaryImage,
                            fit: BoxFit.cover,
                            placeholder: (_, __) => Container(color: Colors.grey.shade100),
                            errorWidget: (_, __, ___) => const Icon(Icons.image, color: Colors.grey),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Rating & Discount Tag
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF16A34A),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.star_rounded, color: Colors.white, size: 11),
                                const SizedBox(width: 2),
                                Text(
                                  '${prod.rating}',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          if (prod.discount != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEDE9FE),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                prod.discount!,
                                style: const TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF704FEE),
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Title
                      Text(
                        prod.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1E1B4B),
                        ),
                      ),
                      const SizedBox(height: 2),

                      // Price Row
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '₹${prod.price.toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF1E1B4B),
                              ),
                            ),
                            if (prod.regularPrice != null && prod.regularPrice! > prod.price) ...[
                              const SizedBox(width: 6),
                              Text(
                                '₹${prod.regularPrice!.toStringAsFixed(0)}',
                                style: TextStyle(
                                  fontSize: 11,
                                  decoration: TextDecoration.lineThrough,
                                  color: Colors.grey.shade400,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const Spacer(),

                      // Action Row: Heart + Add to Cart Pill
                      Row(
                        children: [
                          GestureDetector(
                            onTap: () {
                              ref.read(wishlistProvider.notifier).toggle(prod.id, wcProduct: prod);
                            },
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.grey.shade200),
                              ),
                              child: Icon(
                                isWishlisted ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                                size: 16,
                                color: isWishlisted ? const Color(0xFFEF4444) : Colors.grey.shade500,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: SizedBox(
                              height: 32,
                              child: ElevatedButton(
                                onPressed: () {
                                  ref.read(cartItemsProvider.notifier).addItem(
                                    id: prod.id,
                                    title: prod.title,
                                    price: prod.price,
                                    image: prod.primaryImage,
                                  );
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('${prod.title} added to Cart! 🛒'),
                                      duration: const Duration(seconds: 1),
                                      behavior: SnackBarBehavior.floating,
                                      backgroundColor: const Color(0xFF059669),
                                    ),
                                  );
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF3B82F6),
                                  foregroundColor: Colors.white,
                                  padding: EdgeInsets.zero,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  elevation: 0,
                                ),
                                child: const Text(
                                  'Add to cart +',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  /// Top Categories Section (Real WooCommerce Categories)
  Widget _buildTopCategoriesSection(
    Color primaryColor,
    Color darkTextColor,
    List<WcCategory> categories,
  ) {
    if (categories.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Text(
              'Top Categories',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: Color(0xFF1E1B4B),
                letterSpacing: -0.3,
              ),
            ),
            SizedBox(width: 6),
            Text('🏷️', style: TextStyle(fontSize: 15)),
          ],
        ),
        const SizedBox(height: 14),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: categories.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 10,
            mainAxisSpacing: 12,
            childAspectRatio: 0.85,
          ),
          itemBuilder: (context, index) {
            final cat = categories[index];
            final isSelected = cat.name.toLowerCase() == _selectedCategory.toLowerCase();

            return GestureDetector(
              onTap: () {
                setState(() {
                  _selectedCategory = cat.name;
                  _selectedCategoryId = cat.id;
                  _isSearchActive = false;
                  _searchFocusNode.unfocus();
                  _searchController.clear();
                  _searchQuery = '';
                  _showAllBestSelling = true;
                });
                if (cat.id > 0) {
                  _loadProductsForCategory(cat.id);
                }
              },
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected ? primaryColor : Colors.grey.shade200,
                    width: isSelected ? 2.0 : 1.0,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.02),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(8),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: cat.image != null && cat.image!.isNotEmpty
                              ? CachedNetworkImage(
                                  imageUrl: cat.image!,
                                  width: double.infinity,
                                  height: double.infinity,
                                  fit: BoxFit.cover,
                                  errorWidget: (_, __, ___) => Icon(
                                    _getCategoryIcon(cat.name),
                                    size: 26,
                                    color: primaryColor,
                                  ),
                                )
                              : Center(
                                  child: Icon(
                                    _getCategoryIcon(cat.name),
                                    size: 26,
                                    color: primaryColor,
                                  ),
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      cat.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isSelected ? primaryColor : darkTextColor,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${cat.count} items',
                      style: TextStyle(
                        fontSize: 10,
                        color: Colors.grey.shade500,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  /// Helper: Get unique available colors for a given category from products
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

  /// Helper: Map color name to UI Color
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


  /// Left-Side Drawer Menu for Categories, Colors & Pricing (Reference Image 3 style)
  void _openFilterModal(
    BuildContext context,
    List<WcProduct> wcProducts,
    List<WcCategory> wcCategories,
  ) {
    String tempCategory = _selectedCategory;
    int? tempCategoryId = _selectedCategoryId;
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

            // If selected color is no longer available in this category, clear it
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
                        // 1. Top Header: Orange Categories icon + Title + Circular Close button (Image 3)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(18, 16, 16, 12),
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
                              // Circular Close Button (as shown in reference image 3)
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

                        // 2. Search Field ("Search categories...")
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

                        // 3. Scrollable List: Line-wise Categories + Colors + Pricing
                        Expanded(
                          child: SingleChildScrollView(
                            physics: const BouncingScrollPhysics(),
                            padding: const EdgeInsets.only(bottom: 20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Categories Section (Line-wise List with Icon, Title, Chevron)
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
                                          if (isAll) {
                                            tempCategoryId = null;
                                          } else {
                                            final matched = wcCategories.where((c) => c.name.toLowerCase() == catName.toLowerCase()).firstOrNull;
                                            tempCategoryId = matched?.id;
                                          }

                                          // Auto-clear color if new category has no colors
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
                                            // Category Icon Container (rounded square)
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
                                            // Category Title
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
                                            // Chevron / Selected Indicator
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

                                // 4. Product Colors Section (Dynamic based on selected category!)
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
                                        // User requirement: If no colors available for this category, colors cannot be selected!
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

                                      // Colors ARE available: render color options chips
                                      return Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          // "All Colors" option
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

                                          // Specific available colors
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

                                // 5. Pricing Section (Cheapest to Expensive sorting and price brackets)
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

                                // Sort direction (Cheapest to Expensive)
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

                                      // Price Range brackets
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

                        // 6. Sticky Bottom Action Buttons (Reset & Apply)
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
                              // Reset Button
                              TextButton(
                                onPressed: () {
                                  setModalState(() {
                                    tempCategory = 'All';
                                    tempCategoryId = null;
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

                              // Apply Filters Button
                              Expanded(
                                child: SizedBox(
                                  height: 44,
                                  child: ElevatedButton.icon(
                                    onPressed: () {
                                      setState(() {
                                        _selectedCategory = tempCategory;
                                        _selectedCategoryId = tempCategoryId;
                                        _selectedColor = tempColor;
                                        _selectedSort = tempSort;
                                        _selectedPriceRange = tempPriceRange;
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

  /// 3. 4 Auto-Swiping Hero Banners (Swipes every 4 seconds) with Indicators
  Widget _buildAutoSwipingBanners(Color primaryColor, Color darkTextColor, List<WcProduct> products) {
    final p1 = products.isNotEmpty ? products[0] : null;
    final p2 = products.length > 1 ? products[1] : p1;
    final p3 = products.length > 2 ? products[2] : p1;
    final p4 = products.length > 3 ? products[3] : (p2 ?? p1);

    final banner1Img = p1 != null && p1.images.isNotEmpty ? p1.primaryImage : '';
    final banner2Img = p2 != null && p2.images.isNotEmpty ? p2.primaryImage : banner1Img;
    final banner3Img = p3 != null && p3.images.isNotEmpty ? p3.primaryImage : banner1Img;
    final banner4Img = p4 != null && p4.images.isNotEmpty ? p4.primaryImage : (banner2Img.isNotEmpty ? banner2Img : banner1Img);

    final banner1Title = p1 != null ? p1.title : 'Featured Collection';
    final banner2Title = p2 != null ? p2.title : 'Exclusive Trends';
    final banner3Title = p3 != null ? p3.title : 'New Arrivals';
    final banner4Title = p4 != null ? p4.title : 'Top Best Sellers';

    final banner1Sub = p1 != null ? 'Special Deal • From ₹${p1.price.toInt()}' : 'Check out our latest arrivals';
    final banner2Sub = p2 != null ? 'Best Value • From ₹${p2.price.toInt()}' : 'Discover top rated deals';
    final banner3Sub = p3 != null ? 'Limited Edition • From ₹${p3.price.toInt()}' : 'Explore popular styles';
    final banner4Sub = p4 != null ? 'Hot Offer • From ₹${p4.price.toInt()}' : 'Explore the full catalog';

    return Column(
      children: [
        SizedBox(
          height: 184,
          child: PageView(
            controller: _bannerPageController,
            onPageChanged: (index) {
              setState(() {
                _currentBannerIndex = index;
              });
            },
            children: [
              // Banner 1: Modern Indigo / Lavender
              _buildHeroPromoBanner(
                tag: 'NEW ARRIVALS ✨',
                title: banner1Title,
                subtitle: banner1Sub,
                buttonText: 'Shop Now',
                bgColor1: const Color(0xFFEDE9FE),
                bgColor2: const Color(0xFFF5F3FF),
                accentColor: const Color(0xFF704FEE),
                titleColor: const Color(0xFF1E1B4B),
                buttonColor: const Color(0xFF704FEE),
                buttonTextColor: Colors.white,
                imageUrl: banner1Img,
                onTap: () {
                  if (p1 != null) _navigateToProduct(p1.id);
                },
              ),

              // Banner 2: Sunset Amber / Warm Gold
              _buildHeroPromoBanner(
                tag: 'FEATURED DEAL 🔥',
                title: banner2Title,
                subtitle: banner2Sub,
                buttonText: 'Explore Deal',
                bgColor1: const Color(0xFFFEF3C7),
                bgColor2: const Color(0xFFFFFBEB),
                accentColor: const Color(0xFFD97706),
                titleColor: const Color(0xFF78350F),
                buttonColor: const Color(0xFFD97706),
                buttonTextColor: Colors.white,
                imageUrl: banner2Img,
                onTap: () {
                  if (p2 != null) _navigateToProduct(p2.id);
                },
              ),

              // Banner 3: Soft Rose / Coral
              _buildHeroPromoBanner(
                tag: 'SPECIAL OFFER 💖',
                title: banner3Title,
                subtitle: banner3Sub,
                buttonText: 'View Product',
                bgColor1: const Color(0xFFFCE7F3),
                bgColor2: const Color(0xFFFDF2F8),
                accentColor: const Color(0xFFDB2777),
                titleColor: const Color(0xFF831843),
                buttonColor: const Color(0xFFDB2777),
                buttonTextColor: Colors.white,
                imageUrl: banner3Img,
                onTap: () {
                  if (p3 != null) _navigateToProduct(p3.id);
                },
              ),

              // Banner 4: Fresh Teal / Mint Emerald
              _buildHeroPromoBanner(
                tag: 'BEST VALUE ⚡',
                title: banner4Title,
                subtitle: banner4Sub,
                buttonText: 'Shop Now',
                bgColor1: const Color(0xFFCCFBF1),
                bgColor2: const Color(0xFFF0FDFA),
                accentColor: const Color(0xFF0D9488),
                titleColor: const Color(0xFF134E4A),
                buttonColor: const Color(0xFF0D9488),
                buttonTextColor: Colors.white,
                imageUrl: banner4Img,
                onTap: () {
                  if (p4 != null) _navigateToProduct(p4.id);
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),

        // 4 Indicator Dots for the 4 banners
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(_totalBanners, (index) {
            final isActive = _currentBannerIndex == index;
            return GestureDetector(
              onTap: () {
                _bannerPageController.animateToPage(
                  index,
                  duration: const Duration(milliseconds: 400),
                  curve: Curves.easeInOut,
                );
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: isActive ? 22 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: isActive ? primaryColor : Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }

  /// Unified High-End Hero Promo Banner with Bold Typography & Elevated Product Card
  Widget _buildHeroPromoBanner({
    required String tag,
    required String title,
    required String subtitle,
    required String buttonText,
    required Color bgColor1,
    required Color bgColor2,
    required Color accentColor,
    required Color titleColor,
    required Color buttonColor,
    required Color buttonTextColor,
    required String imageUrl,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [bgColor1, bgColor2],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: accentColor.withOpacity(0.18),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: accentColor.withOpacity(0.10),
              blurRadius: 14,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.fromLTRB(16, 14, 14, 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Left Content
            Expanded(
              flex: 11,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Pill Tag Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                    decoration: BoxDecoration(
                      color: accentColor.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      tag,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: accentColor,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                  const SizedBox(height: 7),

                  // Big Bold Readable Title (NO FittedBox!)
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w900,
                      color: titleColor,
                      height: 1.22,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 5),

                  // Subtitle / Price
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: accentColor,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Action Button
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 7.5,
                    ),
                    decoration: BoxDecoration(
                      color: buttonColor,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: buttonColor.withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          buttonText,
                          style: TextStyle(
                            color: buttonTextColor,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          Icons.arrow_forward_rounded,
                          color: buttonTextColor,
                          size: 13,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),

            // Right Product Image in bright white elevated container
            Expanded(
              flex: 8,
              child: AspectRatio(
                aspectRatio: 1.0,
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.06),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.all(8),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: imageUrl.isNotEmpty
                        ? CachedNetworkImage(
                            imageUrl: imageUrl,
                            fit: BoxFit.contain,
                            placeholder: (_, __) => const Center(
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            ),
                            errorWidget: (_, __, ___) => Icon(
                              Icons.shopping_bag_rounded,
                              size: 38,
                              color: accentColor,
                            ),
                          )
                        : Icon(
                            Icons.shopping_bag_rounded,
                            size: 38,
                            color: accentColor,
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

  /// 4. Categories Row with Live WooCommerce Categories (Centered for balanced aesthetics)
  Widget _buildCategoriesRow(
    Color primaryColor,
    Color darkTextColor,
    List<Map<String, dynamic>> categories,
  ) {
    return SizedBox(
      height: 98,
      child: Center(
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          clipBehavior: Clip.none,
          physics: const BouncingScrollPhysics(),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (int index = 0; index < categories.length; index++) ...[
                if (index > 0) const SizedBox(width: 8),
                _buildCategoryItem(categories[index], primaryColor),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryItem(Map<String, dynamic> cat, Color primaryColor) {
    final catName = cat['name'] as String;
    final catId = cat['catId'] as int?;
    final isSelected = catName.toLowerCase() == _selectedCategory.toLowerCase();
    final catImage = cat['image'] as String?;

    return GestureDetector(
      onTap: () {
        if (_selectedCategory.toLowerCase() == catName.toLowerCase()) return;
        setState(() {
          _selectedCategory = catName;
          _selectedCategoryId = catId;
          _showAllBestSelling = true; // Show all products when category is selected
        });
        if (catId != null && catId > 0 && !_categoryProductsCache.containsKey(catId)) {
          _loadProductsForCategory(catId);
        }
      },
      child: SizedBox(
        width: 68,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
                border: isSelected
                    ? Border.all(color: const Color(0xFF704FEE), width: 2.2)
                    : Border.all(color: Colors.grey.shade200, width: 1.2),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: const Color(0xFF704FEE).withOpacity(0.25),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ]
                    : null,
              ),
              child: ClipOval(
                child: catImage != null && catImage.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: catImage,
                        width: 52,
                        height: 52,
                        memCacheWidth: 120,
                        memCacheHeight: 120,
                        maxWidthDiskCache: 250,
                        maxHeightDiskCache: 250,
                        fit: BoxFit.cover,
                        errorWidget: (_, __, ___) => Icon(
                          cat['icon'] as IconData,
                          size: 22,
                          color: isSelected ? const Color(0xFF704FEE) : const Color(0xFF4B5563),
                        ),
                      )
                    : Icon(
                        cat['icon'] as IconData,
                        size: 22,
                        color: isSelected ? const Color(0xFF704FEE) : const Color(0xFF4B5563),
                      ),
              ),
            ),
            const SizedBox(height: 6),
            SizedBox(
              height: 30,
              child: Text(
                cat['name'] as String,
                maxLines: 2,
                textAlign: TextAlign.center,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  height: 1.2,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                  color: isSelected ? primaryColor : const Color(0xFF4B5563),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 5. Flash Sale ⚡ Section (Connected to WooCommerce Live Products)
  Widget _buildFlashSaleSection(
    Color primaryColor,
    Color darkTextColor,
    List<Map<String, dynamic>> products,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Text(
                  'Flash Sale',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: darkTextColor,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(width: 4),
                const Text('⚡', style: TextStyle(fontSize: 16)),
              ],
            ),
            if (products.length > 2)
              GestureDetector(
                onTap: () {
                  setState(() => _showAllFlashSale = !_showAllFlashSale);
                },
                child: Text(
                  _showAllFlashSale ? 'Show Less' : 'See All',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF704FEE),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        if (_showAllFlashSale)
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: products.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 14,
              mainAxisSpacing: 18,
              childAspectRatio: 0.58,
            ),
            itemBuilder: (context, index) {
              final item = products[index];
              return _HomeProductCardItem(item: item, darkTextColor: darkTextColor, isWishlisted: ref.watch(wishlistProvider).contains(item['id']), onProductTap: _navigateToProduct);
            },
          )
        else
          _FlashSaleMarquee(
            products: products,
            darkTextColor: darkTextColor,
            onProductTap: _navigateToProduct,
          ),
      ],
    );
  }

  /// Lowest Prices Night Suits Banner (Flipkart Live style swipeable cards banner)
  Widget _buildLowestPricesNightSuitsBanner(List<WcProduct> allWcProducts) {
    // Filter specifically for women night suits products
    final nightSuits = allWcProducts.where((p) {
      final inCat = p.categories.any((c) {
        final lower = c.toLowerCase();
        return lower.contains('night') ||
            lower.contains('suit') ||
            lower.contains('sleep') ||
            lower.contains('loungewear');
      });
      final inTitle = p.title.toLowerCase().contains('night') ||
          p.title.toLowerCase().contains('suit') ||
          p.title.toLowerCase().contains('capri') ||
          p.title.toLowerCase().contains('pajama');
      return inCat || inTitle;
    }).toList();

    // Sort by lowest price first
    nightSuits.sort((a, b) => a.price.compareTo(b.price));

    // Fallback if empty so the banner is always populated
    final displayList = nightSuits.isNotEmpty
        ? nightSuits
        : (allWcProducts.where((p) => p.price > 0 && p.images.isNotEmpty).toList()
            ..sort((a, b) => a.price.compareTo(b.price)));

    if (displayList.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 16, 0, 16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFEA2A33), // Flipkart-style vibrant red
            Color(0xFFFF5722), // Vibrant deep orange
            Color(0xFFF4511E),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFEA2A33).withOpacity(0.32),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner Heading Row
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const Expanded(
                  child: Text(
                    'Lowest prices night suits',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.3,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.22),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Swipe',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      SizedBox(width: 3),
                      Icon(
                        Icons.arrow_forward_ios_rounded,
                        color: Colors.white,
                        size: 9,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Horizontal Swipeable Product Cards
          SizedBox(
            height: 200,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.only(right: 14),
              itemCount: displayList.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final product = displayList[index];
                final hasDiscount = product.regularPrice != null && product.regularPrice! > product.price;

                return GestureDetector(
                  onTap: () => _navigateToProduct(product.id),
                  child: Container(
                    width: 135,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.12),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Stack(
                        children: [
                          // 1. Product Image (Fills container)
                          Positioned.fill(
                            child: CachedNetworkImage(
                              imageUrl: product.primaryImage,
                              fit: BoxFit.cover,
                              alignment: Alignment.topCenter,
                              memCacheWidth: 350,
                              memCacheHeight: 450,
                              placeholder: (_, __) => Container(
                                color: const Color(0xFFF1F5F9),
                                child: const Center(
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Color(0xFFEA2A33),
                                  ),
                                ),
                              ),
                              errorWidget: (_, __, ___) => Container(
                                color: const Color(0xFFF1F5F9),
                                child: const Icon(
                                  Icons.image,
                                  color: Colors.grey,
                                  size: 32,
                                ),
                              ),
                            ),
                          ),

                          // 2. LIVE / DEAL Badge (Flipkart style!)
                          Positioned(
                            top: 8,
                            left: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE11D48),
                                borderRadius: BorderRadius.circular(8),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.2),
                                    blurRadius: 4,
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 5,
                                    height: 5,
                                    decoration: const BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Text(
                                    'DEAL',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 9,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.3,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                          // 3. Bottom Gradient Strip with Title & Price
                          Positioned(
                            bottom: 0,
                            left: 0,
                            right: 0,
                            child: Container(
                              padding: const EdgeInsets.fromLTRB(8, 18, 8, 8),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    Colors.transparent,
                                    Colors.black.withOpacity(0.6),
                                    Colors.black.withOpacity(0.92),
                                  ],
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    product.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.baseline,
                                    textBaseline: TextBaseline.alphabetic,
                                    children: [
                                      Text(
                                        '₹${product.price.toInt()}',
                                        style: const TextStyle(
                                          color: Color(0xFFFDE047), // Gold price
                                          fontSize: 13,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                      if (hasDiscount) ...[
                                        const SizedBox(width: 4),
                                        Text(
                                          '₹${product.regularPrice!.toInt()}',
                                          style: const TextStyle(
                                            color: Colors.white60,
                                            fontSize: 9.5,
                                            decoration: TextDecoration.lineThrough,
                                            decorationColor: Colors.white60,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  /// 6. Dynamic Store Products Section (Filtered by Category!)
  Widget _buildBestSellingSection(
    Color primaryColor,
    Color darkTextColor,
    Set<String> wishlistedIds,
    List<Map<String, dynamic>> products,
    List<WcProduct> allWcProducts,
  ) {
    // When a specific category is selected, show ALL products of that category!
    final displayedProducts = (_selectedCategory != 'All' || _showAllBestSelling)
        ? products
        : products.take(4).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Row(
                children: [
                  Flexible(
                    child: Text(
                      _selectedCategory == 'All' ? 'Products' : '$_selectedCategory Collection',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: darkTextColor,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEDE9FE),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _isLoadingCategoryProducts ? '...' : '${products.length}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF704FEE),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            if (_selectedCategory == 'All' && products.length > 4)
              GestureDetector(
                onTap: () {
                  setState(() => _showAllBestSelling = !_showAllBestSelling);
                },
                child: Text(
                  _showAllBestSelling ? 'Show Less' : 'See All',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF704FEE),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 14),

        if (displayedProducts.isNotEmpty)
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: displayedProducts.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 14,
              mainAxisSpacing: 18,
              childAspectRatio: 0.58,
            ),
            itemBuilder: (context, index) {
              final item = displayedProducts[index];
              return _HomeProductCardItem(
                item: item,
                darkTextColor: darkTextColor,
                isWishlisted: wishlistedIds.contains(item['id']),
                onProductTap: _navigateToProduct,
              );
            },
          )
        else if (_isLoadingCategoryProducts)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 40),
            child: const Center(
              child: Column(
                children: [
                  SizedBox(
                    width: 28,
                    height: 28,
                    child: CircularProgressIndicator(strokeWidth: 2.5, color: Color(0xFF704FEE)),
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Loading products from store...',
                    style: TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          )
        else if (displayedProducts.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 30, horizontal: 20),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                Icon(Icons.inventory_2_outlined, size: 36, color: Colors.grey.shade400),
                const SizedBox(height: 8),
                Text(
                  'No products found in category "$_selectedCategory"',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                ),
              ],
            ),
          ),


        // Banner under initial 4 products: 4 cheapest products collage with "Special Discount"
        if (_selectedCategory == 'All' && !_showAllBestSelling) ...[
          const SizedBox(height: 18),
          _buildSpecialDiscountCollageBanner(primaryColor, darkTextColor, allWcProducts),
          const SizedBox(height: 14),
          Center(
            child: OutlinedButton.icon(
              onPressed: () {
                setState(() => _showAllBestSelling = true);
              },
              icon: const Icon(Icons.grid_view_rounded, size: 16, color: Color(0xFF704FEE)),
              label: Text(
                'See All ${products.length} Products',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF704FEE),
                ),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFF704FEE), width: 1.2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              ),
            ),
          ),
        ],
      ],
    );
  }

  /// Banner with 4 Cheapest Products Collage & Special Discount
  Widget _buildSpecialDiscountCollageBanner(
    Color primaryColor,
    Color darkTextColor,
    List<WcProduct> allWcProducts,
  ) {
    final cheapList = allWcProducts
        .where((p) => p.price > 0 && p.images.isNotEmpty)
        .toList()
      ..sort((a, b) => a.price.compareTo(b.price));
    final top4 = cheapList.take(4).toList();
    final lowestPrice = top4.isNotEmpty ? top4.first.price : 10.0;

    return Container(
      width: double.infinity,
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
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF704FEE).withOpacity(0.22),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
        border: Border.all(color: const Color(0xFF704FEE).withOpacity(0.35), width: 1.2),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
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
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.local_fire_department_rounded, color: Colors.white, size: 13),
                      SizedBox(width: 4),
                      Text(
                        'SPECIAL DISCOUNT',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Special Discount',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.4,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Top 4 cheapest store picks\nStarting @ ₹${lowestPrice.toStringAsFixed(0)} only!',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.85),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 12),
                InkWell(
                  onTap: () {
                    setState(() => _showAllBestSelling = true);
                  },
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Grab Deals',
                          style: TextStyle(
                            color: Color(0xFF1E1B4B),
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        SizedBox(width: 4),
                        Icon(Icons.arrow_forward_rounded, size: 13, color: Color(0xFF1E1B4B)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),

          // 2x2 Collage of the 4 cheapest products
          if (top4.length >= 4)
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 124,
                  height: 124,
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.25)),
                  ),
                  child: Column(
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Expanded(child: _buildCollageThumb(top4[0])),
                            const SizedBox(width: 4),
                            Expanded(child: _buildCollageThumb(top4[1])),
                          ],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Expanded(
                        child: Row(
                          children: [
                            Expanded(child: _buildCollageThumb(top4[2])),
                            const SizedBox(width: 4),
                            Expanded(child: _buildCollageThumb(top4[3])),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Positioned(
                  bottom: -6,
                  right: -6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.25),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Text(
                      '80% OFF',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildCollageThumb(WcProduct product) {
    return GestureDetector(
      onTap: () => _navigateToProduct(product.id),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 4,
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            CachedNetworkImage(
              imageUrl: product.primaryImage,
              fit: BoxFit.cover,
              placeholder: (_, __) => Container(color: Colors.grey.shade100),
              errorWidget: (_, __, ___) => const Icon(Icons.bolt, size: 16, color: Colors.grey),
            ),
            Positioned(
              bottom: 2,
              right: 2,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1B4B).withOpacity(0.85),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '₹${product.price.toStringAsFixed(0)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 8,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 7. In-Place Search Results (Matches WooCommerce products!)
  Widget _buildSearchResultsSection(
    Color primaryColor,
    Color darkTextColor,
    Set<String> wishlistedIds,
    List<Map<String, dynamic>> results,
  ) {

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Search Results (${results.length})',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: darkTextColor,
                letterSpacing: -0.3,
              ),
            ),
            TextButton.icon(
              onPressed: () {
                _searchController.clear();
                setState(() => _searchQuery = '');
              },
              icon: const Icon(Icons.close_rounded, size: 16),
              label: const Text('Clear'),
              style: TextButton.styleFrom(
                foregroundColor: primaryColor,
                padding: EdgeInsets.zero,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        if (results.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                Icon(Icons.search_off_rounded, size: 48, color: Colors.grey.shade400),
                const SizedBox(height: 12),
                Text(
                  'No products found matching "$_searchQuery"',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: darkTextColor,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Try searching for "Hoodie", "Watch", "Nike", "Bag", or "Perfume"',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12.5,
                    color: Colors.grey.shade500,
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: const Text('Clear Search'),
                ),
              ],
            ),
          )
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: results.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 14,
              mainAxisSpacing: 18,
              childAspectRatio: 0.58,
            ),
            itemBuilder: (context, index) {
              final item = results[index];
              return _HomeProductCardItem(item: item, darkTextColor: darkTextColor, isWishlisted: wishlistedIds.contains(item['id']), onProductTap: _navigateToProduct);
            },
          ),
      ],
    );
  }
}

/// Reusable 2-Column Product Card with Quantity (- 1 +) and Dual Action Buttons:
/// [Buy Now] solid button on left + [Cart Icon] transparent/outlined button on right
class _HomeProductCardItem extends ConsumerStatefulWidget {
  final Map<String, dynamic> item;
  final Color darkTextColor;
  final bool isWishlisted;
  final ValueChanged<String> onProductTap;

  const _HomeProductCardItem({
    super.key,
    required this.item,
    required this.darkTextColor,
    required this.isWishlisted,
    required this.onProductTap,
  });

  @override
  ConsumerState<_HomeProductCardItem> createState() => _HomeProductCardItemState();
}

class _HomeProductCardItemState extends ConsumerState<_HomeProductCardItem> {
  int _quantity = 1;

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final isWishlisted = widget.isWishlisted;
    const primaryColor = Color(0xFF704FEE);

    final priceNum = item['price'];
    final priceVal = priceNum is num
        ? priceNum.toDouble()
        : (double.tryParse(priceNum.toString()) ?? 0.0);

    return GestureDetector(
      onTap: () => widget.onProductTap(item['id'] as String),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Studio Image Container with Floating Heart
          AspectRatio(
            aspectRatio: 1.0,
            child: Stack(
              children: [
                Container(
                  width: double.infinity,
                  height: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: CachedNetworkImage(
                      imageUrl: item['image'] as String,
                      width: double.infinity,
                      height: double.infinity,
                      memCacheWidth: 380,
                      memCacheHeight: 380,
                      maxWidthDiskCache: 600,
                      maxHeightDiskCache: 600,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => const Center(
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      ),
                      errorWidget: (_, __, ___) =>
                          const Icon(Icons.image, color: Colors.grey),
                    ),
                  ),
                ),
                // Heart Icon (Clean white circle with subtle shadow)
                Positioned(
                  top: 10,
                  right: 10,
                  child: GestureDetector(
                    onTap: () {
                      final prodId = item['id'] as String;
                      ref.read(wishlistProvider.notifier).toggle(
                        prodId,
                        product: DetailedProduct(
                          id: prodId,
                          title: item['title'] as String? ?? 'Livaan Product',
                          price: (item['price'] as num?)?.toDouble() ?? 0.0,
                          originalPrice: (item['originalPrice'] as num?)?.toDouble(),
                          rating: 4.8,
                          reviewsCount: 20,
                          images: [(item['image'] as String? ?? '')],
                          description: '',
                          colors: [],
                          features: [],
                        ),
                      );
                    },
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.08),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Icon(
                        isWishlisted
                            ? Icons.favorite_rounded
                            : Icons.favorite_border_rounded,
                        size: 16,
                        color: isWishlisted
                            ? const Color(0xFFEF4444)
                            : const Color(0xFF9CA3AF),
                      ),
                    ),
                  ),
                ),

                // Discount Badge on top left
                if (item['discount'] != null)
                  Positioned(
                    top: 10,
                    left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF704FEE),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        item['discount'] as String,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
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
            item['title'] as String,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1E1B4B),
            ),
          ),
          const SizedBox(height: 4),

          // Price & Quantity Row: Price on left, Quantity (- 1 +) on right corner
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Price
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Row(
                    children: [
                      Text(
                        '₹${item['price'] is double ? (item['price'] as double).toStringAsFixed(0) : item['price']}',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF1E1B4B),
                        ),
                      ),
                      if (item['originalPrice'] != null && (item['originalPrice'] as num) > (item['price'] as num)) ...[
                        const SizedBox(width: 4),
                        Text(
                          '₹${item['originalPrice'] is double ? (item['originalPrice'] as double).toStringAsFixed(0) : item['originalPrice']}',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: Colors.grey.shade400,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              const SizedBox(width: 4),

              // Quantity Controls (- 1 +) in the top-right corner above buttons
              Container(
                height: 24,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(7),
                  border: Border.all(color: Colors.grey.shade300, width: 0.8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    InkWell(
                      onTap: () {
                        if (_quantity > 1) {
                          setState(() => _quantity--);
                        }
                      },
                      borderRadius: const BorderRadius.horizontal(left: Radius.circular(7)),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        child: Icon(
                          Icons.remove_rounded,
                          size: 13,
                          color: _quantity > 1 ? const Color(0xFF1E1B4B) : Colors.grey.shade400,
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Text(
                        '$_quantity',
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF1E1B4B),
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: () {
                        setState(() => _quantity++);
                      },
                      borderRadius: const BorderRadius.horizontal(right: Radius.circular(7)),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        child: Icon(
                          Icons.add_rounded,
                          size: 13,
                          color: primaryColor,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Two Buttons Row: Buy Now (Solid, Left) + Add to Cart Icon (Transparent/Outlined, Right)
          Row(
            children: [
              // Buy Now Button (Left side, solid color)
              Expanded(
                child: SizedBox(
                  height: 32,
                  child: ElevatedButton(
                    onPressed: () {
                      ref.read(cartItemsProvider.notifier).addItem(
                        id: item['id'] as String,
                        title: item['title'] as String,
                        price: priceVal,
                        image: item['image'] as String? ?? '',
                        quantity: _quantity,
                      );
                      context.push('/cart');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(9),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.bolt_rounded, size: 14, color: Colors.white),
                        SizedBox(width: 3),
                        Text(
                          'Buy Now',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 6),

              // Add to Cart Button (Right side, Icon ONLY, transparent/outlined color)
              InkWell(
                onTap: () {
                  ref.read(cartItemsProvider.notifier).addItem(
                    id: item['id'] as String,
                    title: item['title'] as String,
                    price: priceVal,
                    image: item['image'] as String? ?? '',
                    quantity: _quantity,
                  );
                  ScaffoldMessenger.of(context).hideCurrentSnackBar();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Row(
                        children: [
                          const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Added $_quantity "${item['title']}" to cart',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      action: SnackBarAction(
                        label: 'VIEW',
                        textColor: Colors.yellowAccent,
                        onPressed: () => context.push('/cart'),
                      ),
                      duration: const Duration(seconds: 2),
                      backgroundColor: const Color(0xFF1E1B4B),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(9),
                child: Container(
                  width: 34,
                  height: 32,
                  decoration: BoxDecoration(
                    color: primaryColor.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(9),
                    border: Border.all(
                      color: primaryColor.withOpacity(0.35),
                      width: 1.2,
                    ),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.add_shopping_cart_rounded,
                      size: 15,
                      color: primaryColor,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Continuous Auto-Scrolling Flash Sale Marquee (Right to Left)
class _FlashSaleMarquee extends StatefulWidget {
  final List<Map<String, dynamic>> products;
  final Color darkTextColor;
  final ValueChanged<String> onProductTap;

  const _FlashSaleMarquee({
    required this.products,
    required this.darkTextColor,
    required this.onProductTap,
  });

  @override
  State<_FlashSaleMarquee> createState() => _FlashSaleMarqueeState();
}

class _FlashSaleMarqueeState extends State<_FlashSaleMarquee> {
  late final ScrollController _scrollController;
  Timer? _resumeTimer;
  bool _isUserInteracting = false;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _startAutoScroll();
    });
  }

  void _startAutoScroll() {
    if (!mounted || !_scrollController.hasClients || _isUserInteracting) return;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    final remaining = maxScroll - currentScroll;
    if (remaining <= 20) {
      _scrollController.jumpTo(0);
      _startAutoScroll();
      return;
    }

    // Smooth marquee speed: ~38 pixels per second
    final durationMs = (remaining / 38 * 1000).toInt();
    _scrollController.animateTo(
      maxScroll,
      duration: Duration(milliseconds: durationMs),
      curve: Curves.linear,
    ).then((_) {
      if (mounted && !_isUserInteracting) {
        _scrollController.jumpTo(0);
        _startAutoScroll();
      }
    });
  }

  void _onPointerDown() {
    _isUserInteracting = true;
    _resumeTimer?.cancel();
    if (_scrollController.hasClients) {
      _scrollController.jumpTo(_scrollController.offset);
    }
  }

  void _onPointerUp() {
    _resumeTimer?.cancel();
    _resumeTimer = Timer(const Duration(milliseconds: 1500), () {
      if (mounted) {
        _isUserInteracting = false;
        _startAutoScroll();
      }
    });
  }

  @override
  void dispose() {
    _resumeTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.products.isEmpty) return const SizedBox.shrink();

    const loopFactor = 300;
    final totalCount = widget.products.length * loopFactor;

    return Listener(
      onPointerDown: (_) => _onPointerDown(),
      onPointerUp: (_) => _onPointerUp(),
      onPointerCancel: (_) => _onPointerUp(),
      child: SizedBox(
        height: 175,
        child: ListView.separated(
          controller: _scrollController,
          scrollDirection: Axis.horizontal,
          clipBehavior: Clip.none,
          physics: const BouncingScrollPhysics(),
          itemCount: totalCount,
          separatorBuilder: (_, __) => const SizedBox(width: 14),
          itemBuilder: (context, index) {
            final item = widget.products[index % widget.products.length];
            return GestureDetector(
              onTap: () => widget.onProductTap(item['id'] as String),
              child: SizedBox(
                width: 110,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Stack(
                      children: [
                        Container(
                          width: 110,
                          height: 110,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(18),
                            child: CachedNetworkImage(
                              imageUrl: item['image'] as String,
                              width: 110,
                              height: 110,
                              memCacheWidth: 220,
                              memCacheHeight: 220,
                              maxWidthDiskCache: 400,
                              maxHeightDiskCache: 400,
                              fit: BoxFit.cover,
                              placeholder: (_, __) =>
                                  Container(color: Colors.grey.shade100),
                              errorWidget: (_, __, ___) =>
                                  const Icon(Icons.image, color: Colors.grey),
                            ),
                          ),
                        ),
                        if (item['discount'] != null)
                          Positioned(
                            top: 6,
                            left: 6,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFF704FEE),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                item['discount'] as String,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item['title'] as String,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: widget.darkTextColor,
                      ),
                    ),
                    const SizedBox(height: 2),
                    SizedBox(
                      width: double.infinity,
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Row(
                          children: [
                            Text(
                              '₹${item['price'] is double ? (item['price'] as double).toStringAsFixed(0) : item['price']}',
                              style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF704FEE),
                              ),
                            ),
                            if (item['originalPrice'] != null &&
                                (item['originalPrice'] as num) > (item['price'] as num)) ...[
                              const SizedBox(width: 4),
                              Text(
                                '₹${item['originalPrice'] is double ? (item['originalPrice'] as double).toStringAsFixed(0) : item['originalPrice']}',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey.shade400,
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Voice Search Bottom Sheet with Animated Microphone & Sound Waves
class _VoiceSearchBottomSheet extends StatefulWidget {
  final ValueChanged<String> onSearchSelected;

  const _VoiceSearchBottomSheet({required this.onSearchSelected});

  @override
  State<_VoiceSearchBottomSheet> createState() => _VoiceSearchBottomSheetState();
}

class _VoiceSearchBottomSheetState extends State<_VoiceSearchBottomSheet>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animController;

  final List<String> _suggestedPhrases = [
    'Women Shirt',
    'Night Suit',
    'Satin Shirt',
    'Beach Wear',
    'Bikini Set',
    'Casual Shirt',
    'Capri Set',
    'Cover-ups',
  ];

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 18),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.mic_rounded, color: Color(0xFF704FEE), size: 22),
                  SizedBox(width: 8),
                  Text(
                    'Voice Search',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1E1B4B),
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, size: 20),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Animated Pulsing Mic Icon
          AnimatedBuilder(
            animation: _animController,
            builder: (context, child) {
              final scale = 1.0 + (_animController.value * 0.15);
              return Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 90 * scale,
                    height: 90 * scale,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF704FEE)
                          .withOpacity(0.12 * (1 - _animController.value * 0.5)),
                    ),
                  ),
                  Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [Color(0xFF704FEE), Color(0xFF8B5CF6)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF704FEE).withOpacity(0.35),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.mic_rounded,
                      size: 38,
                      color: Colors.white,
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 18),

          // Status Text
          const Text(
            'Listening... Speak now',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1E1B4B),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Say product name or tap a search suggestion below',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12.5,
              color: Colors.grey.shade500,
            ),
          ),
          const SizedBox(height: 20),

          // Audio Wave Indicator Simulation
          AnimatedBuilder(
            animation: _animController,
            builder: (context, child) {
              return Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(7, (i) {
                  final offset = (i - 3).abs() * 0.2;
                  final height = 10 +
                      20 *
                          (1 -
                              (_animController.value - offset)
                                  .abs()
                                  .clamp(0.0, 1.0));
                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 2.5),
                    width: 4,
                    height: height,
                    decoration: BoxDecoration(
                      color: const Color(0xFF704FEE),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  );
                }),
              );
            },
          ),
          const SizedBox(height: 24),

          // Voice Suggestion Chips
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Popular Voice Searches:',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Colors.grey.shade600,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _suggestedPhrases.map((phrase) {
              return InkWell(
                onTap: () => widget.onSearchSelected(phrase),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5F3FF),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFEDE9FE)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.search_rounded,
                          size: 14, color: Color(0xFF704FEE)),
                      const SizedBox(width: 6),
                      Text(
                        phrase,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1E1B4B),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

