import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/shop_providers.dart';
import '../../core/services/woocommerce_service.dart';
import '../../core/widgets/bottom_notification.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String _selectedSegment = 'ALL';

  // Search & Rotating Hints
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  String _searchQuery = '';
  bool _isSearchActive = false;

  Timer? _placeholderTimer;
  final ValueNotifier<int> _placeholderIndexNotifier = ValueNotifier<int>(0);
  final List<String> _rotatingHints = [
    'Earrings',
    'Women Shirt',
    'Night Suit Set',
    'Satin Shirt',
    'Beach Wear',
    'High Waist Bikini',
    'Bohemian Jewellery',
  ];

  // Auto-Swiping Hero Banner Carousel (4-second interval)
  late final PageController _heroBannerController;
  Timer? _heroBannerTimer;
  final ValueNotifier<int> _heroBannerIndexNotifier = ValueNotifier<int>(0);
  static const int _totalHeroBanners = 4;

  // Pre-feed Quick Filters & View All
  String _selectedStoryCategory = 'All';
  int? _selectedCategoryId;
  String? _selectedColor;
  String _selectedSort = 'default'; // 'default', 'low_to_high', 'high_to_low', 'rating'
  String _selectedPriceFilter = 'all'; // 'all', 'under_1000', '1000_2500', 'above_2500'
  String _selectedFeedFilter = 'FOR YOU';
  final List<String> _feedFilters = ['FOR YOU', 'VIEW ALL', 'WHAT\'S NEW', 'HOT DEALS', 'BESTSELLERS', 'UNDER ₹1200'];
  bool _showAllProducts = false;
  static const int _initialProductLimit = 6;

  int get _activeFilterCount {
    int count = 0;
    if (_selectedStoryCategory != 'All') count++;
    if (_selectedColor != null && _selectedColor!.isNotEmpty && _selectedColor != 'all') count++;
    if (_selectedPriceFilter != 'all') count++;
    if (_selectedSort != 'default') count++;
    return count;
  }

  final ScrollController _scrollController = ScrollController();
  final ValueNotifier<bool> _isScrolledNotifier = ValueNotifier<bool>(false);

  /// Redirect helper: navigates to the exact offer category with optional price and sort filters
  void _openOfferCatalog({
    required String category,
    double? maxPrice,
    String? sort = 'low_to_high',
  }) {
    final queryParams = <String, String>{
      'category': category,
      if (maxPrice != null) 'maxPrice': maxPrice.toInt().toString(),
      if (sort != null) 'sort': sort,
    };
    final uri = Uri(path: '/catalog-offer', queryParameters: queryParams);
    context.push(uri.toString());
  }

  @override
  void initState() {
    super.initState();

    _placeholderTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      // Skip updates when scrolled past search bar or covered by another route
      if (_scrollController.hasClients && _scrollController.offset > 180) return;
      if (ModalRoute.of(context)?.isCurrent == false) return;
      _placeholderIndexNotifier.value =
          (_placeholderIndexNotifier.value + 1) % _rotatingHints.length;
    });

    _heroBannerController = PageController();
    _heroBannerTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || !_heroBannerController.hasClients) return;
      // Pause off-screen banner animation while user is scrolled down or on another screen
      if (_scrollController.hasClients && _scrollController.offset > 260) return;
      if (ModalRoute.of(context)?.isCurrent == false) return;
      final next = (_heroBannerIndexNotifier.value + 1) % _totalHeroBanners;
      _heroBannerController.animateToPage(
        next,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOutCubic,
      );
    });

    _searchFocusNode.addListener(() {
      if (_searchFocusNode.hasFocus && !_isSearchActive) {
        setState(() => _isSearchActive = true);
      }
    });

    _scrollController.addListener(() {
      final scrolled = _scrollController.hasClients && _scrollController.offset > 40;
      if (scrolled != _isScrolledNotifier.value) {
        _isScrolledNotifier.value = scrolled;
      }
    });
  }

  @override
  void dispose() {
    _placeholderTimer?.cancel();
    _heroBannerTimer?.cancel();
    _heroBannerController.dispose();
    _placeholderIndexNotifier.dispose();
    _heroBannerIndexNotifier.dispose();
    _isScrolledNotifier.dispose();
    _searchController.dispose();
    _searchFocusNode.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  // Live Products Filter
  List<WcProduct> _filterProducts(List<WcProduct> products) {
    var list = [...products];

    // Story Category Filter (from main header circular stories)
    if (_selectedStoryCategory != 'All') {
      final selectedClean = _selectedStoryCategory.toLowerCase().trim();
      list = list.where((p) {
        // Direct category name match (avoid matching broad parent category like 'Women')
        final matchesExactCat = p.categories.any((c) {
          final cClean = c.toLowerCase().trim();
          return cClean == selectedClean || cClean.contains(selectedClean);
        });
        if (matchesExactCat) return true;

        if (selectedClean == 'women shirt' || selectedClean == 'shirt') {
          return p.categories.any((c) => c.toLowerCase().contains('shirt')) ||
                 p.title.toLowerCase().contains('shirt');
        } else if (selectedClean.contains('night')) {
          return p.categories.any((c) => c.toLowerCase().contains('night')) ||
                 p.title.toLowerCase().contains('night');
        } else if (selectedClean.contains('satin')) {
          return p.categories.any((c) => c.toLowerCase().contains('satin')) ||
                 p.title.toLowerCase().contains('satin');
        } else if (selectedClean.contains('beach') || selectedClean.contains('bikini')) {
          return p.categories.any((c) => c.toLowerCase().contains('beach') || c.toLowerCase().contains('swim') || c.toLowerCase().contains('bikini')) ||
                 p.title.toLowerCase().contains('beach') || p.title.toLowerCase().contains('bikini');
        } else if (selectedClean.contains('jewel')) {
          return p.categories.any((c) => c.toLowerCase().contains('jewel') || c.toLowerCase().contains('accessories')) ||
                 p.title.toLowerCase().contains('jewel');
        } else if (selectedClean.contains('combo')) {
          return p.categories.any((c) => c.toLowerCase().contains('combo') || c.toLowerCase().contains('gift')) ||
                 p.title.toLowerCase().contains('combo');
        }

        return p.title.toLowerCase().contains(selectedClean);
      }).toList();
    }

    // Color Filter
    if (_selectedColor != null && _selectedColor!.isNotEmpty && _selectedColor != 'all') {
      final cLower = _selectedColor!.toLowerCase().trim();
      list = list.where((p) {
        final hasDirectColor = p.colors.any((c) => c.toLowerCase().contains(cLower) || cLower.contains(c.toLowerCase()));
        final title = p.title.toLowerCase();
        final desc = p.description.toLowerCase();
        return hasDirectColor || title.contains(cLower) || desc.contains(cLower);
      }).toList();
    }

    // Segment Filter
    if (_selectedSegment == 'WOMEN') {
      list = list.where((p) => p.categories.any((c) => c.toLowerCase().contains('women'))).toList();
    } else if (_selectedSegment == 'MEN') {
      list = list.where((p) => p.categories.any((c) => c.toLowerCase().contains('men'))).toList();
    } else if (_selectedSegment == 'NEW') {
      list = list.where((p) => p.categories.any((c) => c.toLowerCase().contains('new'))).toList();
    } else if (_selectedSegment == 'BEAUTY') {
      list = list.where((p) => p.categories.any((c) => c.toLowerCase().contains('jewel') || c.toLowerCase().contains('accessories'))).toList();
    }

    // Feed Filter Chips
    if (_selectedFeedFilter == 'UNDER ₹1200') {
      list = list.where((p) => p.price <= 1200).toList();
    } else if (_selectedFeedFilter == 'HOT DEALS') {
      list = list.where((p) => p.regularPrice != null && p.regularPrice! > p.price).toList();
    } else if (_selectedFeedFilter == 'WHAT\'S NEW') {
      list = list.reversed.toList();
    } else if (_selectedFeedFilter == 'BESTSELLERS') {
      list = list.where((p) => p.reviewsCount > 0 || p.rating >= 4.0).toList();
      if (list.isEmpty) list = [...products];
    }

    // Price Filter
    if (_selectedPriceFilter == 'under_1000') {
      list = list.where((p) => p.price < 1000).toList();
    } else if (_selectedPriceFilter == '1000_2500') {
      list = list.where((p) => p.price >= 1000 && p.price <= 2500).toList();
    } else if (_selectedPriceFilter == 'above_2500') {
      list = list.where((p) => p.price > 2500).toList();
    }

    // Sorting
    if (_selectedSort == 'low_to_high') {
      list.sort((a, b) => a.price.compareTo(b.price));
    } else if (_selectedSort == 'high_to_low') {
      list.sort((a, b) => b.price.compareTo(a.price));
    } else if (_selectedSort == 'rating') {
      list.sort((a, b) => b.rating.compareTo(a.rating));
    }

    // Search Query
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      list = list.where((p) =>
        p.title.toLowerCase().contains(q) ||
        p.categories.any((c) => c.toLowerCase().contains(q))
      ).toList();
    }

    return list;
  }

  @override
  Widget build(BuildContext context) {
    final wishlistedIds = ref.watch(wishlistProvider);
    final unreadNotifCount = ref.watch(unreadNotificationsCountProvider);

    final wcCategoriesAsync = ref.watch(wcCategoriesProvider);
    final wcProductsAsync = ref.watch(wcProductsProvider);

    final allProducts = wcProductsAsync.value ?? WooCommerceService.initialProducts;
    final allCategories = wcCategoriesAsync.value ?? WooCommerceService.initialCategories;

    final displayedProducts = _filterProducts(allProducts);

    final isViewingAll = _showAllProducts ||
        _selectedFeedFilter == 'VIEW ALL' ||
        _searchQuery.isNotEmpty ||
        _selectedStoryCategory != 'All';
    final hasMoreProducts = displayedProducts.length > _initialProductLimit;
    final productsToShow = isViewingAll
        ? displayedProducts
        : displayedProducts.take(_initialProductLimit).toList();

    // Brand Palette: Black, White, and Red
    const primaryColor = Color(0xFFE53935);
    const primaryDark = Color(0xFFB71C1C);
    const darkTextColor = Color(0xFF111111);

    return BackButtonListener(
      onBackButtonPressed: () async {
        // 1. If in-place search is active, dismiss it first
        if (_isSearchActive) {
          _searchFocusNode.unfocus();
          _searchController.clear();
          setState(() {
            _isSearchActive = false;
            _searchQuery = '';
          });
          return true;
        }

        // 2. If filtered to a specific category, reset to 'All'
        if (_selectedStoryCategory != 'All') {
          setState(() {
            _selectedStoryCategory = 'All';
            _showAllProducts = false;
          });
          return true;
        }

        // 3. Fall back to MainLayout to show exit confirmation popup
        return false;
      },
      child: Scaffold(
        backgroundColor: Colors.white,
      floatingActionButton: ValueListenableBuilder<bool>(
        valueListenable: _isScrolledNotifier,
        builder: (context, isScrolled, _) {
          if (!isScrolled) return const SizedBox.shrink();
          return FloatingActionButton.small(
            heroTag: 'scroll_top',
            backgroundColor: primaryColor,
            foregroundColor: Colors.white,
            elevation: 4,
            tooltip: 'Scroll to top',
            onPressed: () {
              _scrollController.animateTo(
                0,
                duration: const Duration(milliseconds: 400),
                curve: Curves.easeOutCubic,
              );
            },
            child: const Icon(Icons.keyboard_arrow_up_rounded, size: 22),
          );
        },
      ),
      body: AnnotatedRegion<SystemUiOverlayStyle>(
        value: const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
        ),
        child: SafeArea(
          child: RefreshIndicator(
            color: primaryColor,
            backgroundColor: Colors.white,
            displacement: 40,
            onRefresh: () async {
              HapticFeedback.lightImpact();
              try {
                await Future.wait([
                  ref.refresh(wcCategoriesProvider.future),
                  ref.refresh(wcProductsProvider.future),
                ]);
              } catch (_) {}
            },
            child: CustomScrollView(
              controller: _scrollController,
              cacheExtent: 600,
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                // ================= 1. TOP HEADER APP BAR =================
                SliverToBoxAdapter(
                  child: Column(
                    children: [
                      // Location Bar + Loyalty Points
                      _buildLocationAndRewardsBar(primaryColor, darkTextColor),

                      // Brand Logo + Search Bar + Actions (Filter, Bell, Heart, Profile)
                      _buildMainHeaderBar(
                        primaryColor: primaryColor,
                        darkTextColor: darkTextColor,
                        wishlistCount: wishlistedIds.length,
                        unreadNotifCount: unreadNotifCount,
                        allProducts: allProducts,
                        allCategories: allCategories,
                      ),

                      // Circular Category Stories Row
                      _buildCategoryStoriesRow(allCategories, primaryColor, darkTextColor),

                      // Promotional Coupon Ticket Strip
                      _buildCouponTicketStrip(primaryColor, primaryDark),
                    ],
                  ),
                ),

                // If Search Active: In-Place Search Results
                if (_isSearchActive && _searchQuery.isNotEmpty)
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.58,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 14,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final product = displayedProducts[index];
                          return _buildProductFeedCard(
                            product: product,
                            isWishlisted: wishlistedIds.contains(product.id),
                            primaryColor: primaryColor,
                            darkTextColor: darkTextColor,
                          );
                        },
                        childCount: displayedProducts.length,
                      ),
                    ),
                  )
                else if (_selectedStoryCategory != 'All') ...[
                  // ================= CATEGORY HEADER & FILTER =================
                  SliverToBoxAdapter(
                    child: _buildCategoryViewHeader(
                      categoryName: _selectedStoryCategory,
                      count: displayedProducts.length,
                      primaryColor: primaryColor,
                      darkTextColor: darkTextColor,
                      allProducts: allProducts,
                      allCategories: allCategories,
                    ),
                  ),

                  // ================= CATEGORY PRODUCTS GRID =================
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
                    sliver: displayedProducts.isEmpty
                        ? SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 40),
                              child: Column(
                                children: [
                                  Icon(Icons.inventory_2_outlined, size: 48, color: Colors.grey.shade400),
                                  const SizedBox(height: 12),
                                  Text(
                                    'No products found in "$_selectedStoryCategory"',
                                    style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                                  ),
                                  const SizedBox(height: 16),
                                  OutlinedButton(
                                    onPressed: () {
                                      setState(() {
                                        _selectedStoryCategory = 'All';
                                      });
                                    },
                                    child: const Text('View All Products'),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : SliverGrid(
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 0.58,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 14,
                            ),
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                final product = displayedProducts[index];
                                return _buildProductFeedCard(
                                  product: product,
                                  isWishlisted: wishlistedIds.contains(product.id),
                                  primaryColor: primaryColor,
                                  darkTextColor: darkTextColor,
                                );
                              },
                              childCount: displayedProducts.length,
                            ),
                          ),
                  ),
                ] else ...[
                  // ================= 2. HERO BANNER CAROUSEL =================
                  SliverToBoxAdapter(
                    child: Column(
                      children: [
                        _buildHeroBannerCarousel(primaryColor),
                        _buildTrustBadgesStrip(),
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),

                  // ================= 3. CONTINUE BROWSING / TRENDING BRANDS =================
                  SliverToBoxAdapter(
                    child: _buildContinueBrowsingSection(allProducts, primaryColor, darkTextColor),
                  ),

                  // ================= 4. FEATURED BRANDS (2-COLUMN BANNER CARDS) =================
                  SliverToBoxAdapter(
                    child: _buildFeaturedBrandsSection(primaryColor, darkTextColor),
                  ),

                  // ================= 5. SPONSORED / SPOTLIGHT PRODUCTS =================
                  SliverToBoxAdapter(
                    child: _buildSpotlightProductsSection(allProducts, wishlistedIds, primaryColor, darkTextColor),
                  ),

                  // ================= 6. BUDGET STEALS (PRICE POINTS) =================
                  SliverToBoxAdapter(
                    child: _buildBudgetStealsSection(primaryColor, darkTextColor),
                  ),

                  // ================= 7. ULTIMATE STYLE CHECKLIST =================
                  SliverToBoxAdapter(
                    child: _buildStyleChecklistSection(primaryColor, darkTextColor),
                  ),

                  // ================= 8. BRANDS TO BROWSE =================
                  SliverToBoxAdapter(
                    child: _buildBrandsToBrowseSection(primaryColor, darkTextColor),
                  ),

                  // ================= 9. DAILY BARGAINS =================
                  SliverToBoxAdapter(
                    child: _buildDailyBargainsSection(allProducts, primaryColor, darkTextColor),
                  ),

                  // ================= 10. PRE-FEED QUICK FILTER CHIPS =================
                  SliverToBoxAdapter(
                    child: _buildPreFeedFilterChips(
                      primaryColor: primaryColor,
                      darkTextColor: darkTextColor,
                      isViewingAll: isViewingAll,
                      totalProductsCount: displayedProducts.length,
                      allProducts: allProducts,
                      allCategories: allCategories,
                    ),
                  ),

                  // ================= 11. MAIN PRODUCT FEED GRID (2 COLUMNS) =================
                  SliverPadding(
                    padding: EdgeInsets.fromLTRB(
                      16,
                      8,
                      16,
                      (!hasMoreProducts || isViewingAll) ? 20 : 8,
                    ),
                    sliver: productsToShow.isEmpty
                        ? SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 40),
                              child: Column(
                                children: [
                                  Icon(Icons.search_off_rounded, size: 48, color: Colors.grey.shade400),
                                  const SizedBox(height: 12),
                                  Text(
                                    'No products found matching filters',
                                    style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : SliverGrid(
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 0.58,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 14,
                            ),
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                final product = productsToShow[index];
                                return _buildProductFeedCard(
                                  product: product,
                                  isWishlisted: wishlistedIds.contains(product.id),
                                  primaryColor: primaryColor,
                                  darkTextColor: darkTextColor,
                                );
                              },
                              childCount: productsToShow.length,
                            ),
                          ),
                  ),

                  // ================= 12. VIEW ALL / SHOW LESS CARD BUTTON =================
                  if (hasMoreProducts && !isViewingAll && _searchQuery.isEmpty)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 90),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () {
                              setState(() {
                                _showAllProducts = true;
                              });
                            },
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: primaryColor, width: 1.5),
                                boxShadow: [
                                  BoxShadow(
                                    color: primaryColor.withValues(alpha: 0.08),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.grid_view_rounded, size: 18, color: primaryColor),
                                  const SizedBox(width: 8),
                                  Text(
                                    'View All (${displayedProducts.length} Products)',
                                    style: const TextStyle(
                                      color: primaryColor,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.3,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  const Icon(Icons.keyboard_arrow_down_rounded, size: 20, color: primaryColor),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    )
                  else if (isViewingAll && hasMoreProducts && _searchQuery.isEmpty)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
                        child: Center(
                          child: TextButton.icon(
                            onPressed: () {
                              setState(() {
                                _showAllProducts = false;
                                if (_selectedFeedFilter == 'VIEW ALL') {
                                  _selectedFeedFilter = 'FOR YOU';
                                }
                              });
                            },
                            icon: const Icon(Icons.keyboard_arrow_up_rounded, size: 18, color: primaryColor),
                            label: const Text(
                              'Show Less (Top $_initialProductLimit)',
                              style: TextStyle(color: primaryColor, fontSize: 13, fontWeight: FontWeight.w700),
                            ),
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                              backgroundColor: const Color(0xFFF1F5F9),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                            ),
                          ),
                        ),
                      ),
                    )
                  else
                    const SliverToBoxAdapter(
                      child: SizedBox(height: 90),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    ),
  );
  }



  // =========================================================================
  // SECTION BUILDERS
  // =========================================================================

  /// 1. Location Bar + Rewards Points
  Widget _buildLocationAndRewardsBar(Color primaryColor, Color darkTextColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      color: const Color(0xFFF8FAFC),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Row(
              children: [
                Icon(Icons.location_on_rounded, size: 15, color: primaryColor),
                const SizedBox(width: 4),
                const Text(
                  'Deliver to: ',
                  style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                ),
                const Flexible(
                  child: Text(
                    'Home - Kashipur 244713',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11.5, color: Color(0xFF0F172A), fontWeight: FontWeight.w700),
                  ),
                ),
                const Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: Color(0xFF64748B)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          InkWell(
            onTap: () {
              BottomNotification.show(
                context,
                message: 'You have 120 Livaan Loyalty Coins! 🪙',
                icon: Icons.monetization_on_rounded,
                isSuccess: true,
              );
            },
            borderRadius: BorderRadius.circular(20),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFFCD34D), width: 0.8),
              ),
              child: const Row(
                children: [
                  Text('🪙', style: TextStyle(fontSize: 11)),
                  SizedBox(width: 3),
                  Text(
                    '120 pts',
                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF92400E)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
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
    if (n.contains('purple')) return const Color(0xFFE53935);
    if (n.contains('red') || n.contains('maroon')) return const Color(0xFFDC2626);
    if (n.contains('green')) return const Color(0xFF10B981);
    if (n.contains('grey') || n.contains('gray')) return const Color(0xFF6B7280);
    if (n.contains('gold') || n.contains('yellow')) return const Color(0xFFD97706);
    if (n.contains('leopard') || n.contains('brown')) return const Color(0xFFB45309);
    if (n.contains('satin')) return const Color(0xFFB91C1C);
    return const Color(0xFFE53935);
  }

  /// Left-Side Drawer Modal for Categories, Colors, Price Range & Sorting
  void _openFilterModal(
    BuildContext context,
    List<WcProduct> wcProducts,
    List<WcCategory> wcCategories,
  ) {
    String tempCategory = _selectedStoryCategory;
    int? tempCategoryId = _selectedCategoryId;
    String? tempColor = _selectedColor;
    String tempSort = _selectedSort;
    String tempPriceRange = _selectedPriceFilter;
    String categorySearchQuery = '';

    final sortOptions = [
      {'id': 'default', 'label': 'Featured / Default', 'icon': Icons.star_rounded},
      {'id': 'low_to_high', 'label': 'Price: Low to High ↗', 'icon': Icons.trending_up_rounded},
      {'id': 'high_to_low', 'label': 'Price: High to Low ↘', 'icon': Icons.trending_down_rounded},
      {'id': 'rating', 'label': 'Customer Rating ⭐', 'icon': Icons.thumb_up_rounded},
    ];

    final priceRangeOptions = [
      {'id': 'all', 'label': 'All Prices'},
      {'id': 'under_1000', 'label': 'Under ₹1,000 (Budget)'},
      {'id': '1000_2500', 'label': '₹1,000 - ₹2,500 (Popular)'},
      {'id': 'above_2500', 'label': 'Above ₹2,500 (Premium)'},
    ];

    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Categories & Filters',
      barrierColor: Colors.black.withValues(alpha: 0.55),
      transitionDuration: const Duration(milliseconds: 280),
      pageBuilder: (dialogCtx, anim1, anim2) {
        return StatefulBuilder(
          builder: (context, setModalState) {
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

            final availColorsSet = _getColorsForCategory(tempCategory, wcProducts);
            final hasColors = availColorsSet.isNotEmpty;

            if (tempColor != null && !availColorsSet.any((c) => c.toLowerCase() == tempColor!.toLowerCase())) {
              tempColor = null;
            }

            final activeCount = (tempCategory != 'All' ? 1 : 0) +
                (tempColor != null && tempColor!.isNotEmpty ? 1 : 0) +
                (tempPriceRange != 'all' ? 1 : 0) +
                (tempSort != 'default' ? 1 : 0);

            return Align(
              alignment: Alignment.centerLeft,
              child: Material(
                color: Colors.transparent,
                child: Container(
                  width: MediaQuery.of(dialogCtx).size.width * 0.88,
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
                        // Top Header: Title + Active Count + Close
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
                                      color: const Color(0xFFFEF2F2),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: const Color(0xFFFECACA)),
                                    ),
                                    child: const Icon(
                                      Icons.tune_rounded,
                                      size: 19,
                                      color: Color(0xFFE53935),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  const Text(
                                    'Filters & Sort',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF111111),
                                      letterSpacing: -0.3,
                                    ),
                                  ),
                                  if (activeCount > 0) ...[
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFE53935),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        '$activeCount active',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
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

                        // Search Field for categories
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
                              style: const TextStyle(fontSize: 13, color: Color(0xFF111111)),
                              decoration: InputDecoration(
                                hintText: 'Search categories...',
                                hintStyle: TextStyle(fontSize: 12.5, color: Colors.grey.shade400),
                                prefixIcon: const Icon(Icons.search_rounded, size: 19, color: Color(0xFF94A3B8)),
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                                filled: false,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Scrollable Sections
                        Expanded(
                          child: SingleChildScrollView(
                            physics: const BouncingScrollPhysics(),
                            padding: const EdgeInsets.only(bottom: 20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Categories Section
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
                                          color: isSelected ? const Color(0xFFFEF2F2) : Colors.transparent,
                                          borderRadius: BorderRadius.circular(14),
                                          border: Border.all(
                                            color: isSelected ? const Color(0xFFE53935) : Colors.grey.shade200,
                                            width: isSelected ? 1.4 : 0.8,
                                          ),
                                        ),
                                        child: Row(
                                          children: [
                                            Container(
                                              width: 34,
                                              height: 34,
                                              decoration: BoxDecoration(
                                                color: isSelected ? const Color(0xFFFEF2F2) : const Color(0xFFF1F5F9),
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                              child: Icon(
                                                iconData,
                                                size: 18,
                                                color: isSelected ? const Color(0xFFE53935) : const Color(0xFF64748B),
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Text(
                                                isAll ? 'All Categories' : catName,
                                                style: TextStyle(
                                                  fontSize: 13.5,
                                                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                                                  color: isSelected ? const Color(0xFFE53935) : const Color(0xFF111111),
                                                ),
                                              ),
                                            ),
                                            Icon(
                                              isSelected ? Icons.check_circle_rounded : Icons.chevron_right_rounded,
                                              size: 19,
                                              color: isSelected ? const Color(0xFFE53935) : Colors.grey.shade400,
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

                                // Product Colors Section
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 18),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.palette_rounded, size: 16, color: Color(0xFFE53935)),
                                      const SizedBox(width: 6),
                                      const Text(
                                        'Product Colors',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF111111),
                                        ),
                                      ),
                                      if (hasColors) ...[
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFFEF2F2),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            '${availColorsSet.length} available',
                                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFE53935)),
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
                                            selectedColor: const Color(0xFFE53935),
                                            backgroundColor: const Color(0xFFF1F5F9),
                                            labelStyle: TextStyle(
                                              color: tempColor == null ? Colors.white : const Color(0xFF111111),
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
                                                  color: isSelected ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC),
                                                  borderRadius: BorderRadius.circular(10),
                                                  border: Border.all(
                                                    color: isSelected ? const Color(0xFFE53935) : Colors.grey.shade300,
                                                    width: isSelected ? 1.5 : 1.0,
                                                  ),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Container(
                                                      width: 14,
                                                      height: 14,
                                                      decoration: BoxDecoration(
                                                        color: uiColor,
                                                        shape: BoxShape.circle,
                                                        border: Border.all(color: Colors.black12, width: 0.8),
                                                      ),
                                                    ),
                                                    const SizedBox(width: 6),
                                                    Text(
                                                      colName,
                                                      style: TextStyle(
                                                        fontSize: 12,
                                                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                                        color: isSelected ? const Color(0xFFE53935) : const Color(0xFF111111),
                                                      ),
                                                    ),
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

                                // Price Range Section
                                const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 18),
                                  child: Row(
                                    children: [
                                      Icon(Icons.currency_rupee_rounded, size: 16, color: Color(0xFFE53935)),
                                      SizedBox(width: 6),
                                      Text(
                                        'Price Range',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF111111),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  child: Column(
                                    children: priceRangeOptions.map((opt) {
                                      final isSelected = tempPriceRange == opt['id'];
                                      return Padding(
                                        padding: const EdgeInsets.only(bottom: 6),
                                        child: InkWell(
                                          onTap: () {
                                            setModalState(() => tempPriceRange = opt['id'] as String);
                                          },
                                          borderRadius: BorderRadius.circular(12),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                            decoration: BoxDecoration(
                                              color: isSelected ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC),
                                              borderRadius: BorderRadius.circular(12),
                                              border: Border.all(
                                                color: isSelected ? const Color(0xFFE53935) : const Color(0xFFE2E8F0),
                                                width: isSelected ? 1.4 : 1.0,
                                              ),
                                            ),
                                            child: Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Text(
                                                  opt['label'] as String,
                                                  style: TextStyle(
                                                    fontSize: 12.5,
                                                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                                    color: isSelected ? const Color(0xFFE53935) : const Color(0xFF111111),
                                                  ),
                                                ),
                                                if (isSelected)
                                                  const Icon(Icons.check_circle_rounded, size: 18, color: Color(0xFFE53935))
                                                else
                                                  Icon(Icons.radio_button_unchecked_rounded, size: 18, color: Colors.grey.shade400),
                                              ],
                                            ),
                                          ),
                                        ),
                                      );
                                    }).toList(),
                                  ),
                                ),

                                const SizedBox(height: 16),
                                const Divider(height: 1, indent: 16, endIndent: 16, color: Color(0xFFF1F5F9)),
                                const SizedBox(height: 16),

                                // Sort By Section
                                const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 18),
                                  child: Row(
                                    children: [
                                      Icon(Icons.sort_rounded, size: 16, color: Color(0xFFE53935)),
                                      SizedBox(width: 6),
                                      Text(
                                        'Sort By',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF111111),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  child: Column(
                                    children: sortOptions.map((opt) {
                                      final isSelected = tempSort == opt['id'];
                                      return Padding(
                                        padding: const EdgeInsets.only(bottom: 6),
                                        child: InkWell(
                                          onTap: () {
                                            setModalState(() => tempSort = opt['id'] as String);
                                          },
                                          borderRadius: BorderRadius.circular(12),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                            decoration: BoxDecoration(
                                              color: isSelected ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC),
                                              borderRadius: BorderRadius.circular(12),
                                              border: Border.all(
                                                color: isSelected ? const Color(0xFFE53935) : const Color(0xFFE2E8F0),
                                                width: isSelected ? 1.4 : 1.0,
                                              ),
                                            ),
                                            child: Row(
                                              children: [
                                                Icon(
                                                  opt['icon'] as IconData,
                                                  size: 16,
                                                  color: isSelected ? const Color(0xFFE53935) : const Color(0xFF64748B),
                                                ),
                                                const SizedBox(width: 10),
                                                Expanded(
                                                  child: Text(
                                                    opt['label'] as String,
                                                    style: TextStyle(
                                                      fontSize: 12.5,
                                                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                                      color: isSelected ? const Color(0xFFE53935) : const Color(0xFF111111),
                                                    ),
                                                  ),
                                                ),
                                                if (isSelected)
                                                  const Icon(Icons.check_circle_rounded, size: 18, color: Color(0xFFE53935))
                                                else
                                                  Icon(Icons.radio_button_unchecked_rounded, size: 18, color: Colors.grey.shade400),
                                              ],
                                            ),
                                          ),
                                        ),
                                      );
                                    }).toList(),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Bottom Actions: Clear All & Apply
                        Container(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            border: Border(top: BorderSide(color: Colors.grey.shade200)),
                          ),
                          child: Row(
                            children: [
                              OutlinedButton(
                                onPressed: () {
                                  setModalState(() {
                                    tempCategory = 'All';
                                    tempCategoryId = null;
                                    tempColor = null;
                                    tempSort = 'default';
                                    tempPriceRange = 'all';
                                  });
                                },
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  side: BorderSide(color: Colors.grey.shade300),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                child: const Text(
                                  'Clear All',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () {
                                    setState(() {
                                      _selectedStoryCategory = tempCategory;
                                      _selectedCategoryId = tempCategoryId;
                                      _selectedColor = tempColor;
                                      _selectedSort = tempSort;
                                      _selectedPriceFilter = tempPriceRange;
                                    });
                                    Navigator.pop(dialogCtx);
                                    BottomNotification.show(
                                      context,
                                      message: 'Filters applied successfully! ✨',
                                      icon: Icons.check_circle_rounded,
                                      isSuccess: true,
                                    );
                                  },
                                  icon: const Icon(Icons.check_rounded, size: 16),
                                  label: const Text(
                                    'Apply Filters',
                                    style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold),
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFFE53935),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
    );
  }


  /// 2. Brand Logo + Search Field + Actions (Filter, Bell, Heart, Profile)
  Widget _buildMainHeaderBar({
    required Color primaryColor,
    required Color darkTextColor,
    required int wishlistCount,
    required int unreadNotifCount,
    required List<WcProduct> allProducts,
    required List<WcCategory> allCategories,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 8, 10, 6),
      child: Row(
        children: [
          // Pill-Shaped Search Field with App Logo Inside
          Expanded(
            child: Container(
              height: 42,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 4,
                    offset: const Offset(0, 1.5),
                  ),
                ],
              ),
              child: Row(
                children: [
                  const SizedBox(width: 10),
                  // App Logo inside the search pill
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: CachedNetworkImage(
                      imageUrl: WooCommerceService.siteIconUrl,
                      width: 26,
                      height: 26,
                      memCacheWidth: 80,
                      fadeInDuration: const Duration(milliseconds: 100),
                      fit: BoxFit.contain,
                      errorWidget: (_, __, ___) => Icon(Icons.storefront_rounded, color: primaryColor, size: 22),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Search Input with Quotes (isolated rebuild on rotating hint change)
                  Expanded(
                    child: ValueListenableBuilder<int>(
                      valueListenable: _placeholderIndexNotifier,
                      builder: (context, placeholderIdx, _) {
                        return TextField(
                          controller: _searchController,
                          focusNode: _searchFocusNode,
                          style: TextStyle(fontSize: 13.5, color: darkTextColor, fontWeight: FontWeight.w500),
                          onChanged: (val) {
                            setState(() => _searchQuery = val);
                          },
                          decoration: InputDecoration(
                            isDense: true,
                            filled: false,
                            fillColor: Colors.transparent,
                            hintText: '"${_rotatingHints[placeholderIdx]}"',
                            hintStyle: TextStyle(
                              fontSize: 13.5,
                              color: Colors.grey.shade500,
                              fontWeight: FontWeight.w400,
                            ),
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            disabledBorder: InputBorder.none,
                            errorBorder: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(vertical: 10),
                          ),
                        );
                      },
                    ),
                  ),
                  if (_searchQuery.isNotEmpty)
                    GestureDetector(
                      onTap: () {
                        _searchController.clear();
                        setState(() {
                          _searchQuery = '';
                          _isSearchActive = false;
                        });
                        _searchFocusNode.unfocus();
                      },
                      child: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 4),
                        child: Icon(Icons.clear, size: 16, color: Colors.grey),
                      ),
                    ),
                  // Mic Icon
                  InkWell(
                    onTap: () {
                      BottomNotification.show(
                        context,
                        message: 'Listening... Speak now to search',
                        icon: Icons.mic_rounded,
                      );
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                      child: Icon(Icons.mic_none_rounded, size: 20, color: Colors.grey.shade700),
                    ),
                  ),
                  const SizedBox(width: 2),
                  // Camera Icon
                  InkWell(
                    onTap: () {
                      BottomNotification.show(
                        context,
                        message: 'Visual search opening camera...',
                        icon: Icons.camera_alt_outlined,
                      );
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                      child: Icon(Icons.camera_alt_outlined, size: 19, color: Colors.grey.shade700),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
              ),
            ),
          ),
          const SizedBox(width: 6),

          // 0. Filter Options Icon (with active badge)
          _buildHeaderIconButton(
            icon: Icons.tune_rounded,
            badgeCount: _activeFilterCount,
            badgeColor: primaryColor,
            onTap: () => _openFilterModal(context, allProducts, allCategories),
          ),
          const SizedBox(width: 2),

          // 1. Notification Bell Icon
          _buildHeaderIconButton(
            icon: Icons.notifications_none_rounded,
            badgeCount: unreadNotifCount,
            badgeColor: const Color(0xFFEF4444),
            onTap: () => context.push('/notifications'),
          ),
          const SizedBox(width: 2),

          // 2. Wishlist Heart Icon
          _buildHeaderIconButton(
            icon: Icons.favorite_border_rounded,
            badgeCount: wishlistCount,
            badgeColor: primaryColor,
            onTap: () => context.go('/wishlist'),
          ),
          const SizedBox(width: 2),

          // 3. User Profile Circle Icon
          _buildHeaderIconButton(
            icon: Icons.account_circle_outlined,
            badgeCount: 0,
            onTap: () => context.go('/profile'),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderIconButton({
    required IconData icon,
    required int badgeCount,
    Color badgeColor = const Color(0xFFEF4444),
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            Icon(icon, size: 24, color: const Color(0xFF1E293B)),
            if (badgeCount > 0)
              Positioned(
                top: -3,
                right: -4,
                child: Container(
                  padding: const EdgeInsets.all(2.5),
                  decoration: BoxDecoration(
                    color: badgeColor,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                  constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                  child: Center(
                    child: Text(
                      badgeCount > 99 ? '99+' : '$badgeCount',
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

  /// 3. Horizontal Stories / Circular Category Avatars
  Widget _buildCategoryStoriesRow(List<WcCategory> categories, Color primaryColor, Color darkTextColor) {
    // Curated top categories with real store images
    final storyItems = [
      {'name': 'All', 'image': '', 'icon': Icons.grid_view_rounded},
      {'name': 'Women Shirt', 'image': 'https://livaan.in/wp-content/uploads/2025/01/4-png.avif', 'icon': null},
      {'name': 'Night Suit', 'image': 'https://livaan.in/wp-content/uploads/2025/01/4-3-1.avif', 'icon': null},
      {'name': 'Satin Shirt', 'image': 'https://livaan.in/wp-content/uploads/2025/01/1-2-png.avif', 'icon': null},
      {'name': 'Beach Wear', 'image': 'https://livaan.in/wp-content/uploads/2025/01/3-png.avif', 'icon': null},
      {'name': 'Jewellery', 'image': 'https://livaan.in/wp-content/uploads/2025/01/2-2-png.avif', 'icon': null},
      {'name': 'Combos', 'image': 'https://livaan.in/wp-content/uploads/2025/01/Combo.avif', 'icon': null},
    ];

    return SizedBox(
      height: 94,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        itemCount: storyItems.length,
        itemBuilder: (context, index) {
          final item = storyItems[index];
          final imgUrl = item['image'] as String;
          final name = item['name'] as String;
          final isAll = name == 'All';
          final isSelected = _selectedStoryCategory == name;

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 7),
            child: InkWell(
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() {
                  _selectedStoryCategory = name;
                  if (isAll) {
                    _selectedSegment = 'ALL';
                  }
                  _showAllProducts = true;
                });
              },
              borderRadius: BorderRadius.circular(30),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: isSelected ? 60 : 56,
                    height: isSelected ? 60 : 56,
                    padding: const EdgeInsets.all(2.5),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: isSelected
                          ? LinearGradient(
                              colors: [primaryColor, const Color(0xFFB71C1C)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            )
                          : null,
                      border: isSelected
                          ? null
                          : Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: primaryColor.withValues(alpha: 0.35),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              ),
                            ]
                          : null,
                    ),
                    child: Container(
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white,
                      ),
                      padding: const EdgeInsets.all(2),
                      child: ClipOval(
                        child: isAll
                            ? Container(
                                color: isSelected ? primaryColor : const Color(0xFFF1F5F9),
                                child: Icon(
                                  Icons.grid_view_rounded,
                                  color: isSelected ? Colors.white : const Color(0xFF475569),
                                  size: 24,
                                ),
                              )
                            : (imgUrl.isNotEmpty
                                ? CachedNetworkImage(
                                    imageUrl: imgUrl,
                                    fit: BoxFit.cover,
                                    memCacheWidth: 160,
                                    fadeInDuration: const Duration(milliseconds: 120),
                                    placeholder: (_, __) => const ColoredBox(color: Color(0xFFF1F5F9)),
                                    errorWidget: (_, __, ___) => Icon(Icons.checkroom_rounded, color: primaryColor, size: 24),
                                  )
                                : Container(
                                    color: const Color(0xFFFEF2F2),
                                    child: Icon(Icons.category_rounded, color: primaryColor, size: 24),
                                  )),
                      ),
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    name,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                      color: isSelected ? primaryColor : darkTextColor,
                    ),
                  ),
                  if (isSelected)
                    Container(
                      margin: const EdgeInsets.only(top: 2),
                      width: 14,
                      height: 2.5,
                      decoration: BoxDecoration(
                        color: primaryColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  /// Dedicated Header for Category Filtering on Main Page
  Widget _buildCategoryViewHeader({
    required String categoryName,
    required int count,
    required Color primaryColor,
    required Color darkTextColor,
    required List<WcProduct> allProducts,
    required List<WcCategory> allCategories,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: primaryColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(Icons.category_rounded, size: 16, color: primaryColor),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            categoryName.toUpperCase(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w900,
                              color: darkTextColor,
                              letterSpacing: 0.4,
                            ),
                          ),
                          Text(
                            '$count Products available',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Row(
                children: [
                  // Filter button
                  InkWell(
                    onTap: () => _openFilterModal(context, allProducts, allCategories),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: _activeFilterCount > 0 ? primaryColor : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: _activeFilterCount > 0 ? primaryColor : const Color(0xFFCBD5E1)),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.tune_rounded,
                            size: 13,
                            color: _activeFilterCount > 0 ? Colors.white : const Color(0xFF1E293B),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _activeFilterCount > 0 ? 'Filters ($_activeFilterCount)' : 'Filters',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _activeFilterCount > 0 ? Colors.white : const Color(0xFF1E293B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Show All button
                  InkWell(
                    onTap: () {
                      setState(() {
                        _selectedStoryCategory = 'All';
                      });
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.close_rounded, size: 14, color: Color(0xFF64748B)),
                          SizedBox(width: 4),
                          Text(
                            'Show All',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Sort menu
                  PopupMenuButton<String>(
                    initialValue: _selectedSort,
                    onSelected: (val) => setState(() => _selectedSort = val),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.swap_vert_rounded, size: 14, color: Colors.grey.shade700),
                          const SizedBox(width: 3),
                          Text(
                            _selectedSort == 'low_to_high'
                                ? 'Price ↗'
                                : _selectedSort == 'high_to_low'
                                    ? 'Price ↘'
                                    : 'Sort',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                          ),
                        ],
                      ),
                    ),
                    itemBuilder: (_) => [
                      const PopupMenuItem(value: 'default', child: Text('Default / Featured', style: TextStyle(fontSize: 12))),
                      const PopupMenuItem(value: 'low_to_high', child: Text('Price: Low to High', style: TextStyle(fontSize: 12))),
                      const PopupMenuItem(value: 'high_to_low', child: Text('Price: High to Low', style: TextStyle(fontSize: 12))),
                      const PopupMenuItem(value: 'rating', child: Text('Top Rated ⭐', style: TextStyle(fontSize: 12))),
                    ],
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Horizontal Price Filter Chips for Category View
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                ...[
                  {'id': 'all', 'label': 'All Prices'},
                  {'id': 'under_1000', 'label': 'Under ₹1000'},
                  {'id': '1000_2500', 'label': '₹1000 - ₹2500'},
                  {'id': 'above_2500', 'label': 'Above ₹2500'},
                ].map((priceOpt) {
                  final isSelected = _selectedPriceFilter == priceOpt['id'];
                  return Padding(
                    padding: const EdgeInsets.only(right: 6.0),
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _selectedPriceFilter = priceOpt['id']!;
                        });
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected ? primaryColor : const Color(0xFFE2E8F0),
                            width: isSelected ? 1.4 : 1.0,
                          ),
                        ),
                        child: Text(
                          priceOpt['label']!,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                            color: isSelected ? primaryColor : const Color(0xFF475569),
                          ),
                        ),
                      ),
                    ),
                  );
                }),
                if (_selectedColor != null && _selectedColor!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(right: 6.0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: primaryColor),
                      ),
                      child: Row(
                        children: [
                          Text(
                            'Color: $_selectedColor',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: primaryColor),
                          ),
                          const SizedBox(width: 4),
                          GestureDetector(
                            onTap: () => setState(() => _selectedColor = null),
                            child: Icon(Icons.close, size: 12, color: primaryColor),
                          ),
                        ],
                      ),
                    ),
                  ),
                if (_activeFilterCount > 0)
                  InkWell(
                    onTap: () {
                      setState(() {
                        _selectedPriceFilter = 'all';
                        _selectedColor = null;
                        _selectedSort = 'default';
                      });
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFFCA5A5)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.refresh_rounded, size: 12, color: Color(0xFFDC2626)),
                          SizedBox(width: 3),
                          Text(
                            'Reset',
                            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFFDC2626)),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),
        ],
      ),
    );
  }

  /// 5. Promotional Coupon Ticket Strip
  Widget _buildCouponTicketStrip(Color primaryColor, Color primaryDark) {
    const bannerBg = Color(0xFF111111);
    const bannerBgEnd = Color(0xFF1E1E1E);

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: InkWell(
        onTap: () {
          Clipboard.setData(const ClipboardData(text: 'LIVAAN300'));
          BottomNotification.show(
            context,
            message: 'Coupon code LIVAAN300 copied! 🎉',
            icon: Icons.check_circle_rounded,
            isSuccess: true,
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [bannerBg, bannerBgEnd],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.16),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'FLAT ₹300 OFF',
                      style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'USE CODE: LIVAAN300',
                    style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  children: [
                    Text(
                      'TAP TO COPY',
                      style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900, color: Color(0xFF111111)),
                    ),
                    SizedBox(width: 2),
                    Icon(Icons.copy_rounded, size: 10, color: Color(0xFF111111)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 6. Auto-Swiping Hero Banner Carousel
  Widget _buildHeroBannerCarousel(Color primaryColor) {
    final banners = [
      {
        'title': 'Grand Festive Edit',
        'subtitle': 'Designer Shirts & Sets',
        'discount': 'UP TO 40% OFF',
        'image': 'https://livaan.in/wp-content/uploads/2025/02/303a0ebd-8072-4e36-b2c4-4c889da0c6191676286619510-Hancock-Leopard-Printed-Regular-Fit-Casual-Shirt-54216762866-1.webp',
        'cta': 'Explore Now',
        'category': 'Women Shirt',
      },
      {
        'title': 'Luxury Satin Collection',
        'subtitle': 'Lustrous Elegance for All Day',
        'discount': 'FLAT 30% OFF',
        'image': 'https://livaan.in/wp-content/uploads/2025/01/LV1007-1-png.webp',
        'cta': 'Shop Satin',
        'category': 'Woman Satin Shirt',
      },
      {
        'title': 'Resort & Beach Holiday',
        'subtitle': 'High Waisted Sets & Cover-ups',
        'discount': 'STARTING @ ₹1099',
        'image': 'https://livaan.in/wp-content/uploads/2025/01/3-png.avif',
        'cta': 'View Beachwear',
        'category': 'Beach Wear',
      },
      {
        'title': 'Ultra-Comfort Night Suits',
        'subtitle': 'Soft Breathable Sleepwear',
        'discount': 'BESTSELLERS',
        'image': 'https://livaan.in/wp-content/uploads/2025/01/4-12.jpg',
        'cta': 'Shop Nightwear',
        'category': 'Woman Night Suit',
      },
    ];

    return Column(
      children: [
        SizedBox(
          height: 190,
          child: PageView.builder(
            controller: _heroBannerController,
            onPageChanged: (idx) {
              _heroBannerIndexNotifier.value = idx;
            },
            itemCount: banners.length,
            itemBuilder: (context, index) {
              final b = banners[index];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: InkWell(
                  onTap: () => _openOfferCatalog(category: b['category']!),
                  borderRadius: BorderRadius.circular(18),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        CachedNetworkImage(
                          imageUrl: b['image']!,
                          fit: BoxFit.cover,
                          memCacheWidth: 720,
                          fadeInDuration: const Duration(milliseconds: 120),
                          placeholder: (_, __) => const ColoredBox(color: Color(0xFFF1F5F9)),
                          errorWidget: (_, __, ___) => const ColoredBox(color: Color(0xFFE2E8F0)),
                        ),
                        Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.centerLeft,
                              end: Alignment.centerRight,
                              colors: [
                                Colors.black.withValues(alpha: 0.75),
                                Colors.black.withValues(alpha: 0.2),
                              ],
                            ),
                          ),
                        ),
                        Positioned(
                          left: 18,
                          right: 18,
                          top: 14,
                          bottom: 14,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF111111),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  b['discount']!,
                                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                b['title']!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                b['subtitle']!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 12),
                              ),
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      b['cta']!,
                                      style: const TextStyle(color: Color(0xFF111111), fontSize: 11, fontWeight: FontWeight.w800),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(Icons.arrow_forward_rounded, size: 12, color: Color(0xFF111111)),
                                  ],
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
            },
          ),
        ),
        const SizedBox(height: 10),
        // Dots Indicator (isolated rebuild on banner swipe)
        ValueListenableBuilder<int>(
          valueListenable: _heroBannerIndexNotifier,
          builder: (context, activeIdx, _) {
            return Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(banners.length, (idx) {
                final isActive = activeIdx == idx;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: isActive ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: isActive ? const Color(0xFF111111) : Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(6),
                  ),
                );
              }),
            );
          },
        ),
      ],
    );
  }

  /// 7. Trust Badges Strip (100% Original, Returns, Delivery)
  Widget _buildTrustBadgesStrip() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.verified_rounded, size: 14, color: Color(0xFF10B981)),
                  SizedBox(width: 4),
                  Text('100% Original', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                ],
              ),
            ),
          ),
          SizedBox(width: 6),
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.replay_rounded, size: 14, color: Color(0xFF3B82F6)),
                  SizedBox(width: 4),
                  Text('7-Day Returns', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                ],
              ),
            ),
          ),
          SizedBox(width: 6),
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.bolt_rounded, size: 15, color: Color(0xFFF59E0B)),
                  SizedBox(width: 4),
                  Text('Free Delivery', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 8. Continue Browsing These Brands / Curated Collections
  Widget _buildContinueBrowsingSection(List<WcProduct> products, Color primaryColor, Color darkTextColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: _buildSectionHeaderBadge('CONTINUE BROWSING BRANDS', 'Handpicked for your style', primaryColor, darkTextColor),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 195,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: [
              _buildBrandCollectionCard(
                title: 'LIVAAN LUXE',
                subtitle: '5,000+ Styles',
                imageUrl: 'https://livaan.in/wp-content/uploads/2025/02/303a0ebd-8072-4e36-b2c4-4c889da0c6191676286619510-Hancock-Leopard-Printed-Regular-Fit-Casual-Shirt-54216762866-1.webp',
                primaryColor: primaryColor,
                category: 'Women Shirt',
              ),
              _buildBrandCollectionCard(
                title: 'SATIN FORMALS',
                subtitle: '3,200+ Styles',
                imageUrl: 'https://livaan.in/wp-content/uploads/2025/01/LV1007-1-png.webp',
                primaryColor: primaryColor,
                category: 'Woman Satin Shirt',
              ),
              _buildBrandCollectionCard(
                title: 'RESORT WEAR',
                subtitle: '1,800+ Styles',
                imageUrl: 'https://livaan.in/wp-content/uploads/2025/01/3-png.avif',
                primaryColor: primaryColor,
                category: 'Beach Wear',
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildBrandCollectionCard({
    required String title,
    required String subtitle,
    required String imageUrl,
    required Color primaryColor,
    required String category,
  }) {
    return Container(
      width: 140,
      margin: const EdgeInsets.only(right: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => _openOfferCatalog(category: category),
        borderRadius: BorderRadius.circular(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(13)),
                child: CachedNetworkImage(
                  imageUrl: imageUrl,
                  width: double.infinity,
                  memCacheWidth: 320,
                  fadeInDuration: const Duration(milliseconds: 120),
                  placeholder: (_, __) => const ColoredBox(color: Color(0xFFF1F5F9)),
                  fit: BoxFit.cover,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 10, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 9. Featured Brands / Edits (2-Column Banner Cards)
  Widget _buildFeaturedBrandsSection(Color primaryColor, Color darkTextColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeaderBadge('FEATURED BRANDS', 'Trending labels this season', primaryColor, darkTextColor),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildBannerCard(
                  title: 'THE SHIMMER HOUSE',
                  discount: 'Min. 70% OFF',
                  imageUrl: 'https://livaan.in/wp-content/uploads/2025/02/black-solid-dots-dobby-shirt-theshimmerhouse-6_720x.webp',
                  primaryColor: primaryColor,
                  category: 'Women Shirt',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildBannerCard(
                  title: 'BOUTIQUE CHIC',
                  discount: 'Min. 50% OFF',
                  imageUrl: 'https://livaan.in/wp-content/uploads/2025/01/4-12.jpg',
                  primaryColor: primaryColor,
                  category: 'Woman Night Suit',
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildBannerCard({
    required String title,
    required String discount,
    required String imageUrl,
    required Color primaryColor,
    required String category,
  }) {
    return Container(
      height: 180,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: InkWell(
        onTap: () => _openOfferCatalog(category: category),
        borderRadius: BorderRadius.circular(14),
        child: Column(
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(13)),
                    child: CachedNetworkImage(
                      imageUrl: imageUrl,
                      memCacheWidth: 420,
                      fadeInDuration: const Duration(milliseconds: 120),
                      placeholder: (_, __) => const ColoredBox(color: Color(0xFFF1F5F9)),
                      fit: BoxFit.cover,
                    ),
                  ),
                  Positioned(
                    bottom: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.75),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        discount,
                        style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
              alignment: Alignment.center,
              child: Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 10. Spotlight Products Showcase
  Widget _buildSpotlightProductsSection(
    List<WcProduct> products,
    Set<String> wishlist,
    Color primaryColor,
    Color darkTextColor,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: _buildSectionHeaderBadge('SPONSORED PRODUCTS', 'Top-selling designer styles', primaryColor, darkTextColor),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 268,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: products.take(6).length,
            itemBuilder: (context, index) {
              final p = products[index];
              return Container(
                width: 156,
                margin: const EdgeInsets.only(right: 12),
                child: _buildProductFeedCard(
                  product: p,
                  isWishlisted: wishlist.contains(p.id),
                  primaryColor: primaryColor,
                  darkTextColor: darkTextColor,
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  /// 11. Budget Steals (Under ₹X)
  Widget _buildBudgetStealsSection(Color primaryColor, Color darkTextColor) {
    final steals = [
      {'title': 'Designer Shirts', 'price': 'UNDER ₹999', 'color': const Color(0xFFE53935), 'category': 'Women Shirt', 'maxPrice': 999.0},
      {'title': 'Satin Night Suits', 'price': 'UNDER ₹1199', 'color': const Color(0xFF10B981), 'category': 'Woman Night Suit', 'maxPrice': 1199.0},
      {'title': 'Beach & Bikinis', 'price': 'UNDER ₹1299', 'color': const Color(0xFF3B82F6), 'category': 'Beach Wear', 'maxPrice': 1299.0},
      {'title': 'Bohemian Jewelry', 'price': 'UNDER ₹299', 'color': const Color(0xFFF59E0B), 'category': 'Bohemian Jewellery', 'maxPrice': 299.0},
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeaderBadge('BUDGET STEALS', 'Pocket-friendly luxury trends', primaryColor, darkTextColor),
          const SizedBox(height: 12),
          SizedBox(
            height: 90,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: steals.length,
              itemBuilder: (context, index) {
                final s = steals[index];
                final color = s['color'] as Color;
                return Container(
                  width: 140,
                  margin: const EdgeInsets.only(right: 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: color.withValues(alpha: 0.28)),
                  ),
                  child: InkWell(
                    onTap: () => _openOfferCatalog(
                      category: s['category'] as String,
                      maxPrice: s['maxPrice'] as double?,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          s['price'] as String,
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: color),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          s['title'] as String,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  /// 12. Ultimate Style Checklist
  Widget _buildStyleChecklistSection(Color primaryColor, Color darkTextColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeaderBadge('ULTIMATE STYLE CHECKLIST', 'Curated looks for every occasion', primaryColor, darkTextColor),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => _openOfferCatalog(category: 'Woman Satin Shirt', maxPrice: 1199.0),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      height: 130,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: primaryColor, borderRadius: BorderRadius.circular(4)),
                            child: const Text('UNDER ₹1199', style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold)),
                          ),
                          const SizedBox(height: 6),
                          const Text('Velvet & Satin Fits', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                          const SizedBox(height: 2),
                          Text('Party & Evening Glam', style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => _openOfferCatalog(category: 'Woman Night Suit', maxPrice: 899.0),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      height: 130,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0xFF10B981), borderRadius: BorderRadius.circular(4)),
                            child: const Text('UNDER ₹899', style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold)),
                          ),
                          const SizedBox(height: 6),
                          const Text('Floral & Daily Fits', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                          const SizedBox(height: 2),
                          Text('Effortless Day Wear', style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  /// 13. Brands to Browse
  Widget _buildBrandsToBrowseSection(Color primaryColor, Color darkTextColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeaderBadge('BRANDS TO BROWSE', 'Premium fashion labels', primaryColor, darkTextColor),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildSimplePromoCard(
                  'UP TO 60% OFF',
                  'Resort & Beachwear',
                  primaryColor,
                  onTap: () => _openOfferCatalog(category: 'Beach Wear'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSimplePromoCard(
                  'UP TO 80% OFF',
                  'Formal Satins',
                  const Color(0xFF3B82F6),
                  onTap: () => _openOfferCatalog(category: 'Woman Satin Shirt'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSimplePromoCard(String discount, String title, Color accentColor, {required VoidCallback onTap}) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: accentColor.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: accentColor.withValues(alpha: 0.25)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(discount, style: TextStyle(color: accentColor, fontSize: 13, fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              Text(title, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            ],
          ),
        ),
      ),
    );
  }

  /// 14. Daily Bargains
  Widget _buildDailyBargainsSection(List<WcProduct> products, Color primaryColor, Color darkTextColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeaderBadge('DAILY BARGAINS', 'Limited-time price drops', primaryColor, darkTextColor),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildBargainCard(
                  title: 'Nightwear Sets',
                  price: 'Under ₹1199',
                  imageUrl: 'https://livaan.in/wp-content/uploads/2025/01/4-12.jpg',
                  primaryColor: primaryColor,
                  onTap: () => _openOfferCatalog(category: 'Woman Night Suit', maxPrice: 1199.0),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildBargainCard(
                  title: 'Casual Shirts',
                  price: 'Under ₹1000',
                  imageUrl: 'https://livaan.in/wp-content/uploads/2025/02/303a0ebd-8072-4e36-b2c4-4c889da0c6191676286619510-Hancock-Leopard-Printed-Regular-Fit-Casual-Shirt-54216762866-1.webp',
                  primaryColor: primaryColor,
                  onTap: () => _openOfferCatalog(category: 'Women Shirt', maxPrice: 1000.0),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildBargainCard({
    required String title,
    required String price,
    required String imageUrl,
    required Color primaryColor,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Column(
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(13)),
              child: CachedNetworkImage(
                imageUrl: imageUrl,
                height: 120,
                width: double.infinity,
                memCacheWidth: 320,
                fadeInDuration: const Duration(milliseconds: 120),
                placeholder: (_, __) => const ColoredBox(color: Color(0xFFF1F5F9)),
                fit: BoxFit.cover,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                children: [
                  Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                  const SizedBox(height: 2),
                  Text(price, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: primaryColor)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 15. Pre-Feed Quick Filter Chips
  Widget _buildPreFeedFilterChips({
    required Color primaryColor,
    required Color darkTextColor,
    required bool isViewingAll,
    required int totalProductsCount,
    required List<WcProduct> allProducts,
    required List<WcCategory> allCategories,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
      child: Column(
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
                        isViewingAll ? 'ALL PRODUCTS' : 'TOP PICKS',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A), letterSpacing: 0.4),
                      ),
                    ),
                    const SizedBox(width: 8),
                    InkWell(
                      onTap: () {
                        setState(() {
                          if (isViewingAll) {
                            _showAllProducts = false;
                            if (_selectedFeedFilter == 'VIEW ALL') {
                              _selectedFeedFilter = 'FOR YOU';
                            }
                          } else {
                            _showAllProducts = true;
                          }
                        });
                      },
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isViewingAll ? primaryColor : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: isViewingAll ? primaryColor : const Color(0xFFCBD5E1)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              isViewingAll ? 'Show Less' : 'View All ($totalProductsCount)',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: isViewingAll ? Colors.white : const Color(0xFF334155),
                              ),
                            ),
                            const SizedBox(width: 3),
                            Icon(
                              isViewingAll ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                              size: 14,
                              color: isViewingAll ? Colors.white : const Color(0xFF475569),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              PopupMenuButton<String>(
                initialValue: _selectedSort,
                onSelected: (val) => setState(() => _selectedSort = val),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.swap_vert_rounded, size: 14, color: Colors.grey.shade700),
                      const SizedBox(width: 3),
                      Text(
                        _selectedSort == 'low_to_high'
                            ? 'Price ↗'
                            : _selectedSort == 'high_to_low'
                                ? 'Price ↘'
                                : _selectedSort == 'rating'
                                    ? 'Rating ⭐'
                                    : 'Sort',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                ),
                itemBuilder: (_) => [
                  const PopupMenuItem(value: 'default', child: Text('Default / Featured', style: TextStyle(fontSize: 12))),
                  const PopupMenuItem(value: 'low_to_high', child: Text('Price: Low to High', style: TextStyle(fontSize: 12))),
                  const PopupMenuItem(value: 'high_to_low', child: Text('Price: High to Low', style: TextStyle(fontSize: 12))),
                  const PopupMenuItem(value: 'rating', child: Text('Customer Rating ⭐', style: TextStyle(fontSize: 12))),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          // 1. Feed Curated Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _feedFilters.map((f) {
                final isSelected = _selectedFeedFilter == f;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        _selectedFeedFilter = f;
                        if (f == 'VIEW ALL') {
                          _showAllProducts = true;
                        }
                      });
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected ? primaryColor : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: isSelected ? primaryColor : const Color(0xFFE2E8F0)),
                      ),
                      child: Text(
                        f,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                          color: isSelected ? Colors.white : const Color(0xFF475569),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),
          // 2. Filter Options Bar (Filters Modal Button + Price Chips + Color Chips + Clear All)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                // Prominent Filters Button with tune icon & active count badge
                InkWell(
                  onTap: () => _openFilterModal(context, allProducts, allCategories),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5.5),
                    decoration: BoxDecoration(
                      color: _activeFilterCount > 0 ? primaryColor : const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: _activeFilterCount > 0 ? primaryColor : const Color(0xFFFECACA)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.tune_rounded,
                          size: 14,
                          color: _activeFilterCount > 0 ? Colors.white : primaryColor,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _activeFilterCount > 0 ? 'Filters ($_activeFilterCount)' : 'Filters',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: _activeFilterCount > 0 ? Colors.white : primaryColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Price Filter Chips
                ...[
                  {'id': 'all', 'label': 'All Prices'},
                  {'id': 'under_1000', 'label': 'Under ₹1000'},
                  {'id': '1000_2500', 'label': '₹1000 - ₹2500'},
                  {'id': 'above_2500', 'label': 'Above ₹2500'},
                ].map((priceOpt) {
                  final isSelected = _selectedPriceFilter == priceOpt['id'];
                  return Padding(
                    padding: const EdgeInsets.only(right: 6.0),
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _selectedPriceFilter = priceOpt['id']!;
                        });
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5.5),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected ? primaryColor : const Color(0xFFE2E8F0),
                            width: isSelected ? 1.4 : 1.0,
                          ),
                        ),
                        child: Text(
                          priceOpt['label']!,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                            color: isSelected ? primaryColor : const Color(0xFF475569),
                          ),
                        ),
                      ),
                    ),
                  );
                }),

                // Active Color Filter Badge Chip
                if (_selectedColor != null && _selectedColor!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(right: 6.0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: primaryColor),
                      ),
                      child: Row(
                        children: [
                          Text(
                            'Color: $_selectedColor',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: primaryColor),
                          ),
                          const SizedBox(width: 4),
                          GestureDetector(
                            onTap: () => setState(() => _selectedColor = null),
                            child: Icon(Icons.close, size: 12, color: primaryColor),
                          ),
                        ],
                      ),
                    ),
                  ),

                // Reset / Clear All Filters button
                if (_activeFilterCount > 0)
                  InkWell(
                    onTap: () {
                      setState(() {
                        _selectedStoryCategory = 'All';
                        _selectedCategoryId = null;
                        _selectedColor = null;
                        _selectedPriceFilter = 'all';
                        _selectedSort = 'default';
                        _selectedFeedFilter = 'FOR YOU';
                      });
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFFCA5A5)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.close_rounded, size: 12, color: Color(0xFFDC2626)),
                          SizedBox(width: 3),
                          Text(
                            'Clear All',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFDC2626)),
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
    );
  }

  /// Modern Product Feed Card for 2-Column Grid
  Widget _buildProductFeedCard({
    required WcProduct product,
    required bool isWishlisted,
    required Color primaryColor,
    required Color darkTextColor,
  }) {
    final hasDiscount = product.regularPrice != null && product.regularPrice! > product.price;

    return RepaintBoundary(
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        elevation: 0.5,
        child: InkWell(
          onTap: () {
            WooCommerceService.cacheProduct(product);
            context.push('/product/${product.id}');
          },
          borderRadius: BorderRadius.circular(14),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0), width: 0.9),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Product Image with Rating & Wishlist Heart
                Expanded(
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(13)),
                        child: product.images.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: product.images.first,
                                fit: BoxFit.cover,
                                memCacheWidth: 420,
                                fadeInDuration: const Duration(milliseconds: 120),
                                placeholder: (_, __) => const ColoredBox(color: Color(0xFFF1F5F9)),
                                errorWidget: (_, __, ___) => const Icon(Icons.broken_image_rounded, color: Colors.grey),
                              )
                            : const ColoredBox(color: Color(0xFFF1F5F9)),
                      ),

                    // Wishlist Heart Icon
                    Positioned(
                      top: 6,
                      right: 6,
                      child: GestureDetector(
                        onTap: () {
                          ref.read(wishlistProvider.notifier).toggle(
                            product.id,
                            product: product.toDetailedProduct(),
                          );
                          BottomNotification.show(
                            context,
                            message: !isWishlisted ? 'Added to Wishlist ❤️' : 'Removed from Wishlist',
                            icon: !isWishlisted ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                            isSuccess: !isWishlisted,
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.all(5),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.92),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 4),
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

                    // Rating Pill Badge (e.g. ★ 4.8)
                    Positioned(
                      bottom: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.92),
                          borderRadius: BorderRadius.circular(4),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 3),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.star_rounded, size: 12, color: Color(0xFFF59E0B)),
                            const SizedBox(width: 2),
                            Text(
                              product.rating.toStringAsFixed(1),
                              style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                            ),
                            if (product.reviewsCount > 0) ...[
                              const SizedBox(width: 2),
                              Text(
                                '| ${product.reviewsCount}',
                                style: TextStyle(fontSize: 8.5, color: Colors.grey.shade600),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Title, Price, & Quick Add
              Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Brand Tag
                    const Text(
                      'LIVAAN',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF64748B),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 2),

                    // Title
                    Text(
                      product.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 3),

                    // Price + Discount
                    Row(
                      children: [
                        Text(
                          '₹${product.price.toStringAsFixed(product.price % 1 == 0 ? 0 : 2)}',
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        if (hasDiscount) ...[
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              '₹${product.regularPrice!.toStringAsFixed(0)}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 9.5,
                                color: Colors.grey.shade400,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            product.discount ?? 'SALE',
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF10B981),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 6),

                    // Quick Add to Bag
                    SizedBox(
                      width: double.infinity,
                      height: 28,
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
                            message: 'Added to Bag 🛍️',
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
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.shopping_bag_outlined, size: 12, color: Colors.white),
                            SizedBox(width: 4),
                            Text('Add', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
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
    ),
    );
  }

  /// Elegant Section Header Badge (e.g. "CONTINUE BROWSING BRANDS")
  Widget _buildSectionHeaderBadge(String title, String subtitle, Color primaryColor, Color darkTextColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 3.5,
              height: 14,
              decoration: BoxDecoration(
                color: primaryColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 6),
            Text(
              title,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
                letterSpacing: 0.6,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Padding(
          padding: const EdgeInsets.only(left: 9.5),
          child: Text(
            subtitle,
            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
          ),
        ),
      ],
    );
  }
}
