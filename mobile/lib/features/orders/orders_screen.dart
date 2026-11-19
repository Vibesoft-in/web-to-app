import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/network/app_exception.dart';
import '../../core/providers/core_providers.dart';
import '../../core/providers/shop_providers.dart';
import '../../core/services/woocommerce_service.dart';
import '../../core/widgets/empty_view.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import 'order_tracking_updates_screen.dart';

final ordersProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final user = ref.watch(userProfileProvider);
  final wcService = ref.watch(wcServiceProvider);
  final localOrders = ref.watch(localOrdersProvider);

  final mergedById = <String, Map<String, dynamic>>{};

  void upsertOrder(Map<String, dynamic> order, {bool preferNew = true}) {
    final key = (order['id'] ?? order['order_number'] ?? '').toString().trim();
    if (key.isEmpty) return;
    if (preferNew || !mergedById.containsKey(key)) {
      mergedById[key] = order;
    }
  }

  // 1. Seed with locally placed orders first so newly placed orders always appear immediately
  for (final local in localOrders) {
    upsertOrder(local, preferNew: true);
  }

  // 2. Fetch live WooCommerce orders for authenticated customer ID (guard against timestamp IDs)
  if (user.id > 0 && user.id < 100000000) {
    try {
      final storeOrders = await wcService.fetchCustomerOrders(customerId: user.id);
      for (final o in storeOrders) {
        upsertOrder(o, preferNew: true);
      }
    } catch (_) {}
  }

  // 3. Also fetch WooCommerce orders matching user's email (catches guest/app orders too)
  if (user.email.trim().isNotEmpty) {
    try {
      final emailOrders = await wcService.fetchCustomerOrders(email: user.email);
      for (final o in emailOrders) {
        upsertOrder(o, preferNew: true);
      }
    } catch (_) {}
  }

  // 4. Refresh status of any locally saved WooCommerce order IDs that weren't in customer/email query
  if (mergedById.isEmpty) {
    final dio = ref.watch(dioProvider);
    try {
      final response = await dio.get('/v1/orders');
      final data = response.data;
      if (data is Map<String, dynamic> && data['data'] is List) {
        for (final o in List<Map<String, dynamic>>.from(data['data'])) {
          upsertOrder(o, preferNew: false);
        }
      }
    } catch (_) {}
  }

  final combined = mergedById.values.toList();
  combined.sort((a, b) {
    final da = DateTime.tryParse((a['date_created'] ?? a['created_at'] ?? '').toString());
    final db = DateTime.tryParse((b['date_created'] ?? b['created_at'] ?? '').toString());
    if (da != null && db != null) return db.compareTo(da);
    final idA = int.tryParse((a['id'] ?? '0').toString()) ?? 0;
    final idB = int.tryParse((b['id'] ?? '0').toString()) ?? 0;
    return idB.compareTo(idA);
  });

  return combined;
});

class OrdersScreen extends ConsumerStatefulWidget {
  final String? initialOrderId;

  const OrdersScreen({super.key, this.initialOrderId});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  final TextEditingController _trackController = TextEditingController();
  Map<String, dynamic>? _selectedOrder;
  bool _isSearchingOrder = false;
  String? _trackError;

  @override
  void initState() {
    super.initState();
    if (widget.initialOrderId != null) {
      _trackController.text = widget.initialOrderId!;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _searchOrder();
      });
    }
  }

  @override
  void dispose() {
    _trackController.dispose();
    super.dispose();
  }

  Future<void> _searchOrder() async {
    final query = _trackController.text.trim();
    if (query.isEmpty) {
      setState(() {
        _trackError = 'Please enter an Order ID to track.';
      });
      return;
    }

    setState(() {
      _isSearchingOrder = true;
      _trackError = null;
    });

    final wcService = ref.read(wcServiceProvider);
    Map<String, dynamic>? order = await wcService.trackOrderById(query);

    // Fallback to locally saved in-app orders if not yet returned by WooCommerce
    if (order == null) {
      final cleanQuery = query.replaceAll('#', '').trim();
      final localOrders = ref.read(localOrdersProvider);
      for (final o in localOrders) {
        final oId = (o['id'] ?? '').toString().trim();
        final oNum = (o['order_number'] ?? '').toString().trim();
        if (oId == cleanQuery || oNum == cleanQuery) {
          order = o;
          break;
        }
      }
    }

    if (!mounted) return;
    setState(() {
      _isSearchingOrder = false;
      if (order != null) {
        _selectedOrder = order;
        _trackError = null;
      } else {
        _trackError = 'No order found with ID #$query. Please check your order number.';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final ordersAsync = ref.watch(ordersProvider);

    return ordersAsync.when(
      loading: () => Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0.5,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF1F2937)),
            onPressed: () => context.pop(),
          ),
          title: const Text(
            'ORDER DETAILS',
            style: TextStyle(
              color: Color(0xFF1F2937),
              fontSize: 15,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
            ),
          ),
        ),
        body: const Center(
          child: LoadingView(message: 'Loading order details...'),
        ),
      ),
      error: (err, _) => Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0.5,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF1F2937)),
            onPressed: () => context.pop(),
          ),
          title: const Text('ORDER DETAILS'),
        ),
        body: ErrorView(
          title: 'Unable to load order',
          message: err is AppException ? err.message : err.toString(),
          onRetry: () => ref.refresh(ordersProvider),
        ),
      ),
      data: (orders) {
        // If an order is explicitly selected, use it. Otherwise, default to the most recent order.
        final currentOrder = _selectedOrder ?? (orders.isNotEmpty ? orders.first : null);

        if (currentOrder == null) {
          // Empty State with Order Search Box
          return Scaffold(
            backgroundColor: const Color(0xFFF8FAFC),
            appBar: AppBar(
              backgroundColor: Colors.white,
              elevation: 0.5,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF1F2937)),
                onPressed: () {
                  if (context.canPop()) {
                    context.pop();
                  } else {
                    context.go('/profile');
                  }
                },
              ),
              title: const Text(
                'ORDER DETAILS',
                style: TextStyle(
                  color: Color(0xFF1F2937),
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.6,
                ),
              ),
            ),
            body: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  _buildSearchBox(),
                  const SizedBox(height: 24),
                  EmptyView(
                    title: 'No Orders Placed Yet',
                    message: 'Enter your order ID above to track delivery, or browse our latest fashion collection.',
                    icon: Icons.receipt_long_outlined,
                    actionLabel: 'Browse Products',
                    onAction: () => context.go('/catalog'),
                  ),
                ],
              ),
            ),
          );
        }

        // Render Image 1: Order Details & Status Screen
        return _OrderDetailsView(
          order: currentOrder,
          allOrders: orders,
          onSelectOrder: (newOrder) {
            setState(() {
              _selectedOrder = newOrder;
            });
          },
          searchBoxWidget: _buildSearchBox(),
        );
      },
    );
  }

  Widget _buildSearchBox() {
    const primaryColor = Color(0xFFE53935);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.search_rounded, color: primaryColor, size: 18),
              SizedBox(width: 8),
              Text(
                'Track by Order ID',
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1F2937),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 42,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: TextField(
                    controller: _trackController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(fontSize: 13),
                    decoration: const InputDecoration(
                      hintText: 'e.g. 3532122955',
                      hintStyle: TextStyle(fontSize: 12.5, color: Colors.grey),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                    ),
                    onSubmitted: (_) => _searchOrder(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _isSearchingOrder ? null : _searchOrder,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: _isSearchingOrder
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text(
                        'Track',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
              ),
            ],
          ),
          if (_trackError != null) ...[
            const SizedBox(height: 8),
            Text(
              _trackError!,
              style: const TextStyle(fontSize: 11.5, color: Color(0xFFEF4444), fontWeight: FontWeight.w600),
            ),
          ],
        ],
      ),
    );
  }
}

/// Screen 1: ORDER DETAILS
/// Faithful representation of the first reference screenshot with:
/// - AppBar with HELP action
/// - Product Summary card
/// - Status & 4-step Horizontal Stepper with Truck & Speech Bubble Tooltip ("● Jhajjar", "View Details >")
/// - Cancellation policy row with "KNOW MORE"
/// - Delivery Address card with "KNOW MORE"
/// - Promotion / Perks card
/// - Recently Viewed horizontal product carousel
class _OrderDetailsView extends ConsumerWidget {
  final Map<String, dynamic> order;
  final List<Map<String, dynamic>> allOrders;
  final ValueChanged<Map<String, dynamic>> onSelectOrder;
  final Widget searchBoxWidget;

  const _OrderDetailsView({
    required this.order,
    required this.allOrders,
    required this.onSelectOrder,
    required this.searchBoxWidget,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const purpleBrandColor = Color(0xFFE53935); // Black, White & Red theme
    const darkTextColor = Color(0xFF1E293B);

    final orderNum = (order['order_number'] ?? order['id'] ?? '353212295512261696').toString();
    final status = (order['status'] as String? ?? 'processing').toLowerCase();
    final paymentMethod = (order['payment_method_title'] ?? order['payment_method'] ?? 'Prepaid').toString();
    final isPrepaid = !paymentMethod.toLowerCase().contains('cod') &&
        !paymentMethod.toLowerCase().contains('cash');

    // Extract line items
    final lineItems = (order['line_items'] is List) ? (order['line_items'] as List) : [];
    final firstItem = lineItems.isNotEmpty && lineItems.first is Map
        ? lineItems.first as Map<String, dynamic>
        : <String, dynamic>{};

    final productTitle = (firstItem['name'] ?? 'FAMISS JACKET').toString();
    final productId = (firstItem['product_id'] ?? '').toString();

    // Extract size from metadata or variation
    String sizeText = 'L';
    if (firstItem['meta_data'] is List) {
      for (final m in firstItem['meta_data']) {
        if (m is Map) {
          final k = m['key']?.toString().toLowerCase() ?? '';
          if (k.contains('size')) {
            sizeText = m['value']?.toString() ?? 'L';
            break;
          }
        }
      }
    }

    // Try to get product image from item, else from wcProductsProvider
    String? imageUrl;
    final imgData = firstItem['image'];
    if (imgData is Map && imgData['src'] != null) {
      imageUrl = imgData['src'].toString();
    }
    if (imageUrl == null || imageUrl.isEmpty) {
      final allWc = ref.watch(wcProductsProvider).value ?? [];
      for (final p in allWc) {
        if (p.id == productId && p.images.isNotEmpty) {
          imageUrl = p.images.first;
          break;
        }
      }
    }

    // Recipient & Address
    final shipping = order['shipping'] is Map ? order['shipping'] as Map<String, dynamic> : <String, dynamic>{};
    final billing = order['billing'] is Map ? order['billing'] as Map<String, dynamic> : <String, dynamic>{};

    final firstName = (shipping['first_name'] ?? billing['first_name'] ?? 'Sanskriti').toString();
    final lastName = (shipping['last_name'] ?? billing['last_name'] ?? 'Mishra').toString();
    final recipientName = '$firstName $lastName'.trim();

    final address1 = (shipping['address_1'] ?? billing['address_1'] ?? 'krishna kunj, sharda kanti sadan').toString();
    final address2 = (shipping['address_2'] ?? billing['address_2'] ?? 'Goli Chowk, Neeljhara, sainik colony').toString();
    final city = (shipping['city'] ?? billing['city'] ?? 'Kashipur').toString();
    final state = (shipping['state'] ?? billing['state'] ?? 'Udham Singh Nagar District').toString();
    final postcode = (shipping['postcode'] ?? billing['postcode'] ?? '244713').toString();
    final phone = (billing['phone'] ?? shipping['phone'] ?? '9528109040').toString();

    final fullAddress = [
      if (address1.isNotEmpty) address1,
      if (address2.isNotEmpty) address2,
      if (city.isNotEmpty) city,
      if (state.isNotEmpty) state,
      if (postcode.isNotEmpty) postcode,
      if (phone.isNotEmpty) phone,
    ].join(', ');

    // Calculate dynamic dates for stepper based on order date
    final rawDate = order['date_created'] ?? order['created_at'];
    DateTime baseDate = DateTime.now().subtract(const Duration(days: 4));
    if (rawDate != null) {
      final parsed = DateTime.tryParse(rawDate.toString());
      if (parsed != null) baseDate = parsed;
    }
    final expectedDelivery = baseDate.add(const Duration(days: 6));
    final expectedDeliveryStr = 'Delivery by ${_formatWeekdayDate(expectedDelivery)}';

    final orderedDateStr = _formatDayMonth(baseDate);
    final shippedDateStr = _formatDayMonth(baseDate.add(const Duration(days: 1)));
    final outDeliveryDateStr = _formatDayMonth(expectedDelivery);
    final deliveryDateStr = _formatDayMonth(expectedDelivery);

    final hubName = city.isNotEmpty ? city : 'Jhajjar';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        scrolledUnderElevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: darkTextColor),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/profile');
            }
          },
        ),
        title: const Text(
          'ORDER DETAILS',
          style: TextStyle(
            color: darkTextColor,
            fontSize: 15,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.6,
          ),
        ),
        actions: [
          // "HELP" Button in Purple with Customer Care Icon
          TextButton.icon(
            onPressed: () => _showHelpBottomSheet(context, orderNum),
            icon: const Icon(Icons.headset_mic_outlined, size: 18, color: purpleBrandColor),
            label: const Text(
              'HELP',
              style: TextStyle(
                color: purpleBrandColor,
                fontWeight: FontWeight.w800,
                fontSize: 13,
                letterSpacing: 0.4,
              ),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Switch order selector if user has placed multiple orders
            if (allOrders.length > 1)
              _buildOrderSwitcherBar(context, orderNum, purpleBrandColor),

            // Card 1: Product / Order Details Tile
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
              child: InkWell(
                onTap: productId.isNotEmpty ? () => context.push('/product/$productId') : null,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Product Thumbnail
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        width: 72,
                        height: 72,
                        color: const Color(0xFFF1F5F9),
                        child: imageUrl != null && imageUrl.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: imageUrl,
                                fit: BoxFit.cover,
                                memCacheWidth: 200,
                                placeholder: (_, __) => const Center(
                                  child: SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  ),
                                ),
                                errorWidget: (_, __, ___) => const Icon(Icons.image_outlined, color: Colors.grey),
                              )
                            : const Icon(Icons.checkroom_rounded, size: 36, color: Color(0xFF94A3B8)),
                      ),
                    ),
                    const SizedBox(width: 14),

                    // Product & Order Specs
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Order #$orderNum',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            productTitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF111827),
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '$sizeText • ${isPrepaid ? 'Prepaid' : 'COD'}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                          const SizedBox(height: 3),
                          const Text(
                            'All issue easy returns',
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Chevron Right
                    const Icon(
                      Icons.chevron_right_rounded,
                      color: Color(0xFF9CA3AF),
                      size: 22,
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Card 2: Order Status & Interactive Stepper Card
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status Header with Delivery Icon
                  Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            const Icon(
                              Icons.inventory_2_outlined,
                              size: 20,
                              color: Color(0xFFD97706),
                            ),
                            Positioned(
                              top: 6,
                              left: 6,
                              child: Container(
                                padding: const EdgeInsets.all(1.5),
                                decoration: const BoxDecoration(
                                  color: Color(0xFF059669),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.arrow_forward_rounded,
                                  size: 8,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            status == 'completed' ? 'Delivered' : 'On the way',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF111827),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            expectedDeliveryStr,
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF4B5563),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Horizontal Stepper with Speech Bubble Tooltip & Truck
                  _buildInteractiveHorizontalStepper(
                    context,
                    order,
                    orderedDateStr,
                    shippedDateStr,
                    outDeliveryDateStr,
                    deliveryDateStr,
                    hubName,
                    isDelivered: status == 'completed',
                  ),

                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFFF1F5F9), height: 1),
                  const SizedBox(height: 12),

                  // Cancellation Policy Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Text(
                          'Order shipped, cancel unavailable.',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF4B5563),
                          ),
                        ),
                      ),
                      InkWell(
                        onTap: () => _showCancellationPolicySheet(context),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 4, horizontal: 4),
                          child: Text(
                            'KNOW MORE',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: purpleBrandColor,
                              letterSpacing: 0.4,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 8),

            // Card 3: Delivery Address Card
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      Container(
                        width: 26,
                        height: 26,
                        decoration: const BoxDecoration(
                          color: Color(0xFFEEF2FF),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.location_on_rounded,
                          size: 15,
                          color: Color(0xFFE53935),
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Delivery Address',
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF111827),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Recipient Name
                  Text(
                    recipientName,
                    style: const TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1F2937),
                    ),
                  ),
                  const SizedBox(height: 4),

                  // Full Address
                  Text(
                    fullAddress,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: Color(0xFF4B5563),
                      height: 1.4,
                    ),
                  ),

                  const SizedBox(height: 14),
                  const Divider(color: Color(0xFFF1F5F9), height: 1),
                  const SizedBox(height: 10),

                  // Address change notice
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Text(
                          'Address change unavailable!',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF4B5563),
                          ),
                        ),
                      ),
                      InkWell(
                        onTap: () => _showAddressPolicySheet(context),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 4, horizontal: 4),
                          child: Text(
                            'KNOW MORE',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: purpleBrandColor,
                              letterSpacing: 0.4,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 8),

            // Card 4: Promotional / Member Perks Card
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.account_balance_wallet_rounded,
                          color: Color(0xFF059669),
                          size: 24,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Loans from ₹2000 to ₹1 Lakh',
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF111827),
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'From Verified Financial Partners',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                    OutlinedButton(
                      onPressed: () => _showLoanOfferSheet(context),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: purpleBrandColor, width: 1.2),
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text(
                        'View',
                        style: TextStyle(
                          color: purpleBrandColor,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Card 5: Recently Viewed Products
            _buildRecentlyViewedSection(context, ref),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderSwitcherBar(BuildContext context, String currentOrderNum, Color purpleBrandColor) {
    return Container(
      color: const Color(0xFFFEF2F2),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(Icons.receipt_long_rounded, size: 16, color: purpleBrandColor),
              const SizedBox(width: 6),
              Text(
                'Showing Order #$currentOrderNum',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: purpleBrandColor,
                ),
              ),
            ],
          ),
          InkWell(
            onTap: () => _showAllOrdersSelector(context),
            child: Text(
              'Switch Order',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: purpleBrandColor,
                decoration: TextDecoration.underline,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAllOrdersSelector(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Select Order to Track',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              ...allOrders.map((o) {
                final oNum = (o['order_number'] ?? o['id'] ?? '').toString();
                final oTotal = o['total']?.toString() ?? '0.00';
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.local_shipping_outlined, color: Color(0xFFE53935)),
                  title: Text('Order #$oNum', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                  subtitle: Text('Total: ₹$oTotal • Status: ${(o['status'] ?? 'processing').toString().toUpperCase()}', style: const TextStyle(fontSize: 12)),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () {
                    Navigator.pop(ctx);
                    onSelectOrder(o);
                  },
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  /// Interactive Horizontal Stepper matching Image 1:
  /// - 4 nodes: Ordered, Shipped, Out for Delivery, Delivery
  /// - Delivery truck icon placed at current transit progress
  /// - Speech bubble pointing to the truck with:
  ///   - "● Jhajjar"
  ///   - "View Details >" (tapping opens Image 2)
  Widget _buildInteractiveHorizontalStepper(
    BuildContext context,
    Map<String, dynamic> order,
    String orderedDate,
    String shippedDate,
    String outDeliveryDate,
    String deliveryDate,
    String hubName, {
    required bool isDelivered,
  }) {
    const greenColor = Color(0xFFE53935);
    const lineGrey = Color(0xFFE2E8F0);

    return LayoutBuilder(
      builder: (context, constraints) {
        final totalWidth = constraints.maxWidth;
        // Total 4 nodes: step 0 (Ordered), step 1 (Shipped), step 2 (Out for Delivery), step 3 (Delivery)
        // Position of the truck: between Shipped (step 1) and Out for Delivery (step 2), at ~48% width
        final truckX = isDelivered ? totalWidth - 24 : totalWidth * 0.48;

        return Column(
          children: [
            // 1. Floating Speech Bubble Tooltip & Caret
            SizedBox(
              height: 52,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    left: (truckX - 58).clamp(8.0, totalWidth - 120.0),
                    bottom: 0,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Speech bubble box
                        GestureDetector(
                          onTap: () => _openTrackingDetails(context, order),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF111111),
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.15),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 6,
                                      height: 6,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFF10B981),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      hubName,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                const Text(
                                  'View Details >',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    decoration: TextDecoration.underline,
                                    decorationColor: Colors.white70,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        // Triangle Caret pointing down to truck
                        CustomPaint(
                          size: const Size(10, 5),
                          painter: _TooltipCaretPainter(const Color(0xFF111111)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // 2. Delivery Truck positioned on top of progress line
            SizedBox(
              height: 20,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    left: truckX - 10,
                    top: 0,
                    child: GestureDetector(
                      onTap: () => _openTrackingDetails(context, order),
                      child: const Icon(
                        Icons.local_shipping_rounded,
                        size: 20,
                        color: Color(0xFFE53935),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // 3. Horizontal Stepper Line with 4 nodes
            Row(
              children: [
                // Node 1: Ordered
                _buildStepperNode(true),
                // Segment 1: Ordered -> Shipped (Full Green)
                Expanded(
                  child: Container(
                    height: 2.5,
                    color: greenColor,
                  ),
                ),
                // Node 2: Shipped
                _buildStepperNode(true),
                // Segment 2: Shipped -> Out for Delivery (Half Green, Half Grey)
                Expanded(
                  child: Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 2.5,
                          color: greenColor,
                        ),
                      ),
                      Expanded(
                        child: Container(
                          height: 2.5,
                          color: isDelivered ? greenColor : lineGrey,
                        ),
                      ),
                    ],
                  ),
                ),
                // Node 3: Out for Delivery
                _buildStepperNode(isDelivered),
                // Segment 3: Out for Delivery -> Delivery (Grey unless completed)
                Expanded(
                  child: Container(
                    height: 2.5,
                    color: isDelivered ? greenColor : lineGrey,
                  ),
                ),
                // Node 4: Delivery
                _buildStepperNode(isDelivered),
              ],
            ),

            const SizedBox(height: 8),

            // 4. Milestone Labels and Dates
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildMilestoneLabel('Ordered', orderedDate, isActive: true),
                _buildMilestoneLabel('Shipped', shippedDate, isActive: true),
                _buildMilestoneLabel('Out for Delivery', outDeliveryDate, isActive: isDelivered),
                _buildMilestoneLabel('Delivery', deliveryDate, isActive: isDelivered),
              ],
            ),
          ],
        );
      },
    );
  }

  Widget _buildStepperNode(bool isCompleted) {
    const greenColor = Color(0xFFE53935);
    return Container(
      width: 18,
      height: 18,
      decoration: BoxDecoration(
        color: isCompleted ? greenColor : Colors.white,
        shape: BoxShape.circle,
        border: Border.all(
          color: isCompleted ? greenColor : const Color(0xFFCBD5E1),
          width: 1.5,
        ),
      ),
      child: isCompleted
          ? const Icon(
              Icons.check,
              size: 11,
              color: Colors.white,
            )
          : null,
    );
  }

  Widget _buildMilestoneLabel(String title, String date, {required bool isActive}) {
    return SizedBox(
      width: 72,
      child: Column(
        children: [
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              color: isActive ? const Color(0xFF1F2937) : const Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            date,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: isActive ? const Color(0xFF4B5563) : const Color(0xFF94A3B8),
            ),
          ),
        ],
      ),
    );
  }

  void _openTrackingDetails(BuildContext context, Map<String, dynamic> order) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => OrderTrackingUpdatesScreen(order: order),
      ),
    );
  }

  Widget _buildRecentlyViewedSection(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(wcProductsProvider);

    return productsAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (products) {
        if (products.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Text(
                'Recently Viewed',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF111827),
                ),
              ),
            ),
            SizedBox(
              height: 200,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                itemCount: products.take(10).length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  final p = products[index];
                  final imageUrl = p.images.isNotEmpty ? p.images.first : '';

                  return GestureDetector(
                    onTap: () => context.push('/product/${p.id}'),
                    child: Container(
                      width: 120,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE5E7EB)),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: imageUrl.isNotEmpty
                                ? CachedNetworkImage(
                                    imageUrl: imageUrl,
                                    width: double.infinity,
                                    fit: BoxFit.cover,
                                    memCacheWidth: 240,
                                    placeholder: (_, __) => Container(color: const Color(0xFFF1F5F9)),
                                    errorWidget: (_, __, ___) => const Icon(Icons.image_outlined, color: Colors.grey),
                                  )
                                : Container(
                                    color: const Color(0xFFF1F5F9),
                                    child: const Center(
                                      child: Icon(Icons.image_outlined, color: Colors.grey),
                                    ),
                                  ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  p.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF1F2937),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '₹${p.price.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF111827),
                                  ),
                                ),
                              ],
                            ),
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
      },
    );
  }

  // Help & Customer Support Sheet
  void _showHelpBottomSheet(BuildContext context, String orderNum) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Order Help & Support',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              Text(
                'Order #$orderNum',
                style: const TextStyle(fontSize: 12.5, color: Color(0xFF6B7280)),
              ),
              const SizedBox(height: 16),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(color: Color(0xFFECFDF5), shape: BoxShape.circle),
                  child: const Icon(Icons.phone_in_talk_rounded, color: Color(0xFF059669), size: 20),
                ),
                title: const Text('Call Customer Care', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                subtitle: const Text('Direct assistance for delivery issues', style: TextStyle(fontSize: 11.5)),
                onTap: () {
                  Navigator.pop(ctx);
                  launchUrl(Uri.parse('tel:+919528109040'));
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(color: Color(0xFFEFF6FF), shape: BoxShape.circle),
                  child: const Icon(Icons.chat_bubble_rounded, color: Color(0xFF2563EB), size: 20),
                ),
                title: const Text('Chat on WhatsApp', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                subtitle: const Text('Quick resolution with support executives', style: TextStyle(fontSize: 11.5)),
                onTap: () {
                  Navigator.pop(ctx);
                  final msg = Uri.encodeComponent('Hi, I need assistance with my Order #$orderNum on Livaan Fashion.');
                  launchUrl(Uri.parse('https://wa.me/919528109040?text=$msg'), mode: LaunchMode.externalApplication);
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(color: Color(0xFFFEF2F2), shape: BoxShape.circle),
                  child: const Icon(Icons.mail_outline_rounded, color: Color(0xFFE53935), size: 20),
                ),
                title: const Text('Email Support Team', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                subtitle: const Text('support@livaanfashion.com', style: TextStyle(fontSize: 11.5)),
                onTap: () {
                  Navigator.pop(ctx);
                  final subject = Uri.encodeComponent('Help with Order #$orderNum');
                  launchUrl(Uri.parse('mailto:support@livaanfashion.com?subject=$subject'));
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Cancellation Policy Sheet
  void _showCancellationPolicySheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.info_outline_rounded, color: Color(0xFFE53935), size: 22),
                  SizedBox(width: 8),
                  Text(
                    'Order Cancellation Policy',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                'Once your order has been dispatched from our fulfillment hub and handed over to the courier partner, cancellation cannot be processed directly in the app.',
                style: TextStyle(fontSize: 13, height: 1.4, color: Color(0xFF374151)),
              ),
              const SizedBox(height: 10),
              const Text(
                'What can you do?\n'
                '• Reject Delivery: You can simply decline the package when the courier executive arrives at your doorstep.\n'
                '• Easy Returns: You can accept delivery and initiate an instant return within 7 days for a 100% full refund.',
                style: TextStyle(fontSize: 12.5, height: 1.5, color: Color(0xFF4B5563)),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE53935),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Understood', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Address Change Policy Sheet
  void _showAddressPolicySheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.location_off_outlined, color: Color(0xFFE53935), size: 22),
                  SizedBox(width: 8),
                  Text(
                    'Address Change Policy',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                'Your parcel is already in transit to the nearest regional delivery hub. Modifying the destination address at this stage could lead to significant delivery delays or parcel return to origin.',
                style: TextStyle(fontSize: 13, height: 1.4, color: Color(0xFF374151)),
              ),
              const SizedBox(height: 10),
              const Text(
                'Need urgent assistance? Please tap the HELP button in the top right to get connected directly to our support team.',
                style: TextStyle(fontSize: 12.5, height: 1.4, color: Color(0xFF4B5563)),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE53935),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Got It', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Loan Offer Details Sheet
  void _showLoanOfferSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Exclusive Member Benefits',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              const Text(
                'Enjoy instant credit up to ₹1 Lakh with low interest rates from verified lending partners, plus exclusive seasonal fashion cashbacks.',
                style: TextStyle(fontSize: 13, color: Color(0xFF4B5563), height: 1.4),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE53935),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Explore Benefits', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _formatWeekdayDate(DateTime dt) {
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${weekdays[dt.weekday - 1]}, ${dt.day} ${months[dt.month - 1]}';
  }

  static String _formatDayMonth(DateTime dt) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${dt.day} ${months[dt.month - 1]}';
  }
}

/// Tooltip Caret Triangle Painter for pointing down to the truck
class _TooltipCaretPainter extends CustomPainter {
  final Color color;

  _TooltipCaretPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
