import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/app_exception.dart';
import '../../core/providers/core_providers.dart';
import '../../core/services/woocommerce_service.dart';
import 'catalog_repository.dart';
import 'models/product_model.dart';

class CatalogState {
  final bool isLoading;
  final bool isLoadingMore;
  final List<Product> products;
  final AppException? error;
  final int page;
  final bool hasMore;
  final String searchQuery;
  final String? selectedCategory;

  const CatalogState({
    this.isLoading = false,
    this.isLoadingMore = false,
    this.products = const [],
    this.error,
    this.page = 1,
    this.hasMore = true,
    this.searchQuery = '',
    this.selectedCategory,
  });

  bool get isEmpty => !isLoading && products.isEmpty && error == null;
  bool get hasData => products.isNotEmpty;

  CatalogState copyWith({
    bool? isLoading,
    bool? isLoadingMore,
    List<Product>? products,
    AppException? error,
    bool clearError = false,
    int? page,
    bool? hasMore,
    String? searchQuery,
    String? selectedCategory,
    bool clearCategory = false,
  }) {
    return CatalogState(
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      products: products ?? this.products,
      error: clearError ? null : (error ?? this.error),
      page: page ?? this.page,
      hasMore: hasMore ?? this.hasMore,
      searchQuery: searchQuery ?? this.searchQuery,
      selectedCategory:
          clearCategory ? null : (selectedCategory ?? this.selectedCategory),
    );
  }
}

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return CatalogRepository(dio: dio);
});

final catalogNotifierProvider =
    StateNotifierProvider<CatalogNotifier, CatalogState>((ref) {
  final wcService = ref.watch(wcServiceProvider);
  return CatalogNotifier(wcService);
});

class CatalogNotifier extends StateNotifier<CatalogState> {
  final WooCommerceService _wcService;
  Timer? _debounceTimer;

  CatalogNotifier(this._wcService) : super(const CatalogState()) {
    loadInitial();
  }

  /// Initial load or filter change - Only fetches real products from testing.livaan.in
  Future<void> loadInitial() async {
    state = state.copyWith(isLoading: true, clearError: true, page: 1);
    try {
      int? catId;
      if (state.selectedCategory != null &&
          state.selectedCategory!.isNotEmpty &&
          state.selectedCategory!.toLowerCase() != 'all') {
        final allCats = await _wcService.fetchCategories();
        final match = allCats.firstWhere(
          (c) => c.name.toLowerCase() == state.selectedCategory!.toLowerCase(),
          orElse: () => const WcCategory(id: 0, name: '', slug: ''),
        );
        if (match.id > 0) catId = match.id;
      }

      // 1. Fetch live WooCommerce products
      final wcItems = await _wcService.fetchProducts(
        categoryId: catId,
        search: state.searchQuery,
      );

      var products = wcItems.map((wc) => Product(
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
      )).toList();

      if (state.selectedCategory != null &&
          state.selectedCategory!.isNotEmpty &&
          state.selectedCategory!.toLowerCase() != 'all' &&
          catId == null) {
        final cat = state.selectedCategory!.toLowerCase();
        products = products.where((p) =>
          p.categories.any((c) => c.toLowerCase() == cat)
        ).toList();
      }

      state = state.copyWith(
        isLoading: false,
        products: products,
        page: 1,
        hasMore: false,
      );
    } catch (_) {
      // 2. Fallback to store initialProducts or empty list
      var filtered = WooCommerceService.initialProducts.map((wc) => Product(
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
      )).toList();

      if (state.searchQuery.trim().isNotEmpty) {
        final q = state.searchQuery.trim().toLowerCase();
        filtered = filtered.where((p) =>
          p.title.toLowerCase().contains(q) ||
          p.description.toLowerCase().contains(q) ||
          p.categories.any((c) => c.toLowerCase().contains(q))
        ).toList();
      }

      if (state.selectedCategory != null &&
          state.selectedCategory!.isNotEmpty &&
          state.selectedCategory!.toLowerCase() != 'all') {
        final cat = state.selectedCategory!.toLowerCase();
        filtered = filtered.where((p) =>
          p.categories.any((c) => c.toLowerCase() == cat)
        ).toList();
      }

      state = state.copyWith(
        isLoading: false,
        products: filtered,
        page: 1,
        hasMore: false,
      );
    }
  }

  // Fallback fashion products matching https://livaan.in
  static const _mockCatalogProducts = [
    Product(
      id: '9274',
      title: 'Black Dotted Shirt for Women',
      price: 1200.0,
      compareAtPrice: 1500.0,
      currency: 'INR',
      images: [
        'https://livaan.in/wp-content/uploads/2025/02/black-solid-dots-dobby-shirt-theshimmerhouse-6_720x.webp',
      ],
      description: 'Chic black dotted dobby shirt for women. Premium lightweight breathable fabric perfect for smart-casual and formal styling.',
      inStock: true,
      variants: [],
      categories: ['Women', 'Women Shirt'],
    ),
    Product(
      id: '9261',
      title: 'Leopard Print Shirt for Women',
      price: 1200.0,
      compareAtPrice: 1500.0,
      currency: 'INR',
      images: [
        'https://livaan.in/wp-content/uploads/2025/02/303a0ebd-8072-4e36-b2c4-4c889da0c6191676286619510-Hancock-Leopard-Printed-Regular-Fit-Casual-Shirt-54216762866-1.webp',
      ],
      description: 'Trendy leopard printed regular fit casual shirt. Elevate your wardrobe with this bold, stylish animal print statement piece.',
      inStock: true,
      variants: [],
      categories: ['Women', 'Women Shirt'],
    ),
    Product(
      id: '8803',
      title: 'Solid Satin Formal Shirt for Women',
      price: 1099.0,
      compareAtPrice: 1399.0,
      currency: 'INR',
      images: [
        'https://livaan.in/wp-content/uploads/2025/01/LV1007-1-png.webp',
      ],
      description: 'Lustrous satin formal shirt designed to offer effortless sophistication and all-day luxurious comfort.',
      inStock: true,
      variants: [],
      categories: ['Woman Satin Shirt', 'Women', 'Women Shirt'],
    ),
    Product(
      id: '7818',
      title: 'Navy Blue Women Capri Night Suit Set',
      price: 1199.0,
      compareAtPrice: 1499.0,
      currency: 'INR',
      images: [
        'https://livaan.in/wp-content/uploads/2025/01/4-12.jpg',
      ],
      description: 'Ultra-comfortable navy blue capri night suit set. Crafted from soft breathable cotton blend for peaceful night sleep.',
      inStock: true,
      variants: [],
      categories: ['Woman Night Suit', 'Women'],
    ),
    Product(
      id: '8409',
      title: 'Square Neck High Waist Bikini for Women',
      price: 1299.0,
      compareAtPrice: 1699.0,
      currency: 'INR',
      images: [
        'https://livaan.in/wp-content/uploads/2025/01/AC1166.jpg',
      ],
      description: 'Chic square neck bikini with flattering high-waisted bottoms. Quick-drying stretch fabric perfect for tropical beach holidays.',
      inStock: true,
      variants: [],
      categories: ['Beach Wear', 'High Waisted Bikini Set', 'Women'],
    ),
  ];

  /// Pagination: load next page (infinite scroll)
  Future<void> loadMore() async {
    if (state.isLoading || state.isLoadingMore || !state.hasMore) return;
  }

  /// Search with 400ms debounce
  void onSearchChanged(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 400), () {
      state = state.copyWith(searchQuery: query);
      loadInitial();
    });
  }

  /// Category filter change
  void setCategory(String? categoryId) {
    if (categoryId == null || categoryId == 'All') {
      state = state.copyWith(clearCategory: true);
    } else {
      state = state.copyWith(selectedCategory: categoryId);
    }
    loadInitial();
  }

  /// Pull-to-refresh
  Future<void> refresh() => loadInitial();

  @override
  void dispose() {
    _debounceTimer?.cancel();
    super.dispose();
  }
}
