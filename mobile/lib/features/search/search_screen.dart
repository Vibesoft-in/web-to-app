import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/data/mock_products.dart';
import '../../core/providers/shop_providers.dart';
import '../../core/services/woocommerce_service.dart';
import '../catalog/models/product_model.dart';
import '../catalog/widgets/product_card.dart';

class SearchScreen extends ConsumerStatefulWidget {
  final String? initialQuery;

  const SearchScreen({super.key, this.initialQuery});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  late final TextEditingController _searchController;
  final FocusNode _focusNode = FocusNode();
  String _query = '';

  static const _popularSearches = [
    'Satin Shirt',
    'Beach Wear',
    'Bikini',
    'Night Suit',
    'Cover-ups',
    'Women Shirt',
    'Leopard Print',
    'Black Dotted',
  ];

  @override
  void initState() {
    super.initState();
    _query = widget.initialQuery?.trim() ?? '';
    _searchController = TextEditingController(text: _query);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_query.isEmpty) {
        _focusNode.requestFocus();
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onSearchChanged(String val) {
    setState(() {
      _query = val.trim();
    });
  }

  void _selectSearchTerm(String term) {
    _searchController.text = term;
    _searchController.selection = TextSelection.fromPosition(
      TextPosition(offset: term.length),
    );
    setState(() {
      _query = term.trim();
    });
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF704FEE);
    const darkTextColor = Color(0xFF1E1B4B);

    final wcProductsAsync = ref.watch(wcProductsProvider);
    final wcCategoriesAsync = ref.watch(wcCategoriesProvider);
    final wishlist = ref.watch(wishlistProvider);

    final allWcProducts = wcProductsAsync.value ?? WooCommerceService.initialProducts;
    final allCategories = wcCategoriesAsync.value ?? WooCommerceService.initialCategories;

    // Filter products matching search query
    final matchingWcProducts = _query.isEmpty
        ? <WcProduct>[]
        : allWcProducts.where((p) {
            final q = _query.toLowerCase();
            final inTitle = p.title.toLowerCase().contains(q);
            final inDesc = p.description.toLowerCase().contains(q);
            final inCat = p.categories.any((c) => c.toLowerCase().contains(q));
            final inColor = p.colors.any((c) => c.toLowerCase().contains(q));
            return inTitle || inDesc || inCat || inColor;
          }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
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
        titleSpacing: 0,
        title: Container(
          height: 42,
          margin: const EdgeInsets.only(right: 16),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 10),
                child: Icon(Icons.search_rounded, size: 20, color: primaryColor),
              ),
              Expanded(
                child: TextField(
                  controller: _searchController,
                  focusNode: _focusNode,
                  onChanged: _onSearchChanged,
                  textInputAction: TextInputAction.search,
                  style: const TextStyle(
                    fontSize: 14,
                    color: darkTextColor,
                    fontWeight: FontWeight.w600,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Search products, categories, styles...',
                    hintStyle: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade400,
                      fontWeight: FontWeight.w400,
                    ),
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
              if (_searchController.text.isNotEmpty)
                GestureDetector(
                  onTap: () {
                    _searchController.clear();
                    _onSearchChanged('');
                  },
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    margin: const EdgeInsets.only(right: 6),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close_rounded, size: 13, color: Colors.black87),
                  ),
                ),
            ],
          ),
        ),
      ),
      body: _query.isEmpty
          ? _buildEmptyQuerySuggestions(
              allCategories: allCategories,
              featuredProducts: allWcProducts.take(6).toList(),
              wishlist: wishlist,
              primaryColor: primaryColor,
              darkTextColor: darkTextColor,
            )
          : _buildSearchResults(
              matchingProducts: matchingWcProducts,
              wishlist: wishlist,
              primaryColor: primaryColor,
              darkTextColor: darkTextColor,
            ),
    );
  }

  /// When search query is empty: show trending searches, categories & recommendations
  Widget _buildEmptyQuerySuggestions({
    required List<WcCategory> allCategories,
    required List<WcProduct> featuredProducts,
    required Set<String> wishlist,
    required Color primaryColor,
    required Color darkTextColor,
  }) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Trending / Popular Searches
          Row(
            children: [
              const Icon(Icons.trending_up_rounded, size: 18, color: Color(0xFF704FEE)),
              const SizedBox(width: 6),
              Text(
                'Popular Searches',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: darkTextColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _popularSearches.map((term) {
              return InkWell(
                onTap: () => _selectSearchTerm(term),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade200),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.search_rounded, size: 14, color: Colors.grey.shade400),
                      const SizedBox(width: 6),
                      Text(
                        term,
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: darkTextColor,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 24),

          // 2. Explore Categories
          if (allCategories.isNotEmpty) ...[
            Row(
              children: [
                const Icon(Icons.grid_view_rounded, size: 18, color: Color(0xFF704FEE)),
                const SizedBox(width: 6),
                Text(
                  'Popular Categories',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: darkTextColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: allCategories.where((c) => c.count > 0).take(6).map((cat) {
                return InkWell(
                  onTap: () => _selectSearchTerm(cat.name),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEDE9FE),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      cat.name,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF704FEE),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
          ],

          // 3. Featured Products
          if (featuredProducts.isNotEmpty) ...[
            Row(
              children: [
                const Icon(Icons.auto_awesome_rounded, size: 18, color: Color(0xFF704FEE)),
                const SizedBox(width: 6),
                Text(
                  'Featured Recommendations',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: darkTextColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildProductsGrid(featuredProducts, wishlist),
          ],
        ],
      ),
    );
  }

  /// When search query has matching results or empty results
  Widget _buildSearchResults({
    required List<WcProduct> matchingProducts,
    required Set<String> wishlist,
    required Color primaryColor,
    required Color darkTextColor,
  }) {
    if (matchingProducts.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: const BoxDecoration(
                  color: Color(0xFFEDE9FE),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.search_off_rounded, size: 36, color: Color(0xFF704FEE)),
              ),
              const SizedBox(height: 16),
              Text(
                'No products found matching "$_query"',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: darkTextColor,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Try checking your spelling or use different keywords like "Shirt", "Dress", "Beach", or "Bikini".',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12.5,
                  color: Colors.grey.shade500,
                ),
              ),
              const SizedBox(height: 18),
              ElevatedButton.icon(
                onPressed: () {
                  _searchController.clear();
                  _onSearchChanged('');
                },
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: const Text('Clear Search', style: TextStyle(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Results header with count
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            children: [
              Text(
                'Results for "$_query"',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: darkTextColor,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFEDE9FE),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${matchingProducts.length}',
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

        // Products Grid
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _buildProductsGrid(matchingProducts, wishlist),
          ),
        ),
      ],
    );
  }

  Widget _buildProductsGrid(List<WcProduct> wcList, Set<String> wishlist) {
    return GridView.builder(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(top: 4, bottom: 20),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.57,
        crossAxisSpacing: 14,
        mainAxisSpacing: 16,
      ),
      itemCount: wcList.length,
      itemBuilder: (context, index) {
        final wc = wcList[index];
        final isWish = wishlist.contains(wc.id);

        final product = Product(
          id: wc.id,
          title: wc.title,
          price: wc.price,
          compareAtPrice: wc.regularPrice,
          currency: 'INR',
          images: wc.images.isNotEmpty ? wc.images : [wc.primaryImage],
          description: wc.description,
          inStock: wc.inStock,
          variants: const [],
          categories: wc.categories,
        );

        return ProductCard(
          product: product,
          isWishlisted: isWish,
          onWishlistTap: () {
            ref.read(wishlistProvider.notifier).toggle(
              wc.id,
              product: DetailedProduct(
                id: wc.id,
                title: wc.title,
                price: wc.price,
                originalPrice: wc.regularPrice,
                rating: 4.8,
                reviewsCount: 15,
                images: wc.images,
                description: wc.description,
                colors: wc.colors,
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
            WooCommerceService.cacheProduct(wc);
            context.push('/product/${wc.id}');
          },
        );
      },
    );
  }
}
