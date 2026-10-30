import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/network/app_exception.dart';
import '../../core/providers/core_providers.dart';
import '../../core/providers/shop_providers.dart';
import '../../core/services/woocommerce_service.dart';
import '../../core/widgets/empty_view.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';

final ordersProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final user = ref.watch(userProfileProvider);
  final wcService = ref.watch(wcServiceProvider);

  // 1. Fetch live orders from WooCommerce for authenticated customer
  if (user.id > 0) {
    try {
      final storeOrders = await wcService.fetchCustomerOrders(customerId: user.id);
      if (storeOrders.isNotEmpty) {
        return storeOrders;
      }
    } catch (_) {}
  }

  // 2. Try by email if user has email
  if (user.email.isNotEmpty) {
    try {
      final storeOrders = await wcService.fetchCustomerOrders(email: user.email);
      if (storeOrders.isNotEmpty) {
        return storeOrders;
      }
    } catch (_) {}
  }

  // 3. Fallback to store orders
  try {
    final recent = await wcService.fetchCustomerOrders();
    if (recent.isNotEmpty) {
      return recent;
    }
  } catch (_) {}

  // 4. Fallback to API if any
  final dio = ref.watch(dioProvider);
  try {
    final response = await dio.get('/v1/orders');
    final data = response.data;
    if (data is Map<String, dynamic> && data['data'] is List) {
      return List<Map<String, dynamic>>.from(data['data']);
    }
  } catch (_) {}
  return [];
});

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  final TextEditingController _trackController = TextEditingController();
  Map<String, dynamic>? _trackedOrder;
  bool _isSearchingOrder = false;
  String? _trackError;

  @override
  void dispose() {
    _trackController.dispose();
    super.dispose();
  }

  Future<void> _searchOrder() async {
    final query = _trackController.text.trim();
    if (query.isEmpty) {
      setState(() {
        _trackedOrder = null;
        _trackError = 'Please enter an Order ID to track.';
      });
      return;
    }

    setState(() {
      _isSearchingOrder = true;
      _trackError = null;
    });

    final wcService = ref.read(wcServiceProvider);
    final order = await wcService.trackOrderById(query);

    if (!mounted) return;
    setState(() {
      _isSearchingOrder = false;
      if (order != null) {
        _trackedOrder = order;
        _trackError = null;
      } else {
        _trackedOrder = null;
        _trackError = 'No order found with ID #$query. Please check your order number.';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final ordersAsync = ref.watch(ordersProvider);
    const primaryColor = Color(0xFF704FEE);
    const darkTextColor = Color(0xFF1E1B4B);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
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
          'Track & View Orders',
          style: TextStyle(
            color: darkTextColor,
            fontSize: 17,
            fontWeight: FontWeight.w800,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order Tracking Search Box (Matches WooCommerce "Track Order" form)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
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
                  Row(
                    children: const [
                      Icon(Icons.local_shipping_rounded, color: primaryColor, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Track Any Order',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: darkTextColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Enter your order ID from your receipt to check live delivery updates.',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 44,
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: TextField(
                            controller: _trackController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              hintText: 'Order ID (e.g. 8253)',
                              hintStyle: TextStyle(fontSize: 13, color: Colors.grey),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.zero,
                            ),
                            onSubmitted: (_) => _searchOrder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      ElevatedButton(
                        onPressed: _isSearchingOrder ? null : _searchOrder,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryColor,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _isSearchingOrder
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Track', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ),
                    ],
                  ),
                  if (_trackError != null) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: Color(0xFFEF4444), size: 16),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              _trackError!,
                              style: const TextStyle(fontSize: 11.5, color: Color(0xFFEF4444), fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // If a specific order is tracked, display its full timeline prominently
            if (_trackedOrder != null) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Live Tracking Result',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: darkTextColor,
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _trackedOrder = null;
                          _trackController.clear();
                        });
                      },
                      child: const Text('Clear', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: _buildOrderCard(_trackedOrder!, primaryColor, darkTextColor, isExpanded: true),
              ),
            ],

            // All Recent Orders Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Recent Store Orders',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: darkTextColor,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded, size: 20),
                    onPressed: () => ref.refresh(ordersProvider),
                  ),
                ],
              ),
            ),

            // List of Recent Orders
            ordersAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(32.0),
                child: LoadingView(message: 'Loading orders from website...'),
              ),
              error: (err, _) => ErrorView(
                title: 'Unable to load orders',
                message: err is AppException ? err.message : err.toString(),
                onRetry: () => ref.refresh(ordersProvider),
              ),
              data: (orders) {
                if (orders.isEmpty) {
                  return EmptyView(
                    title: 'No orders found',
                    message: 'When you place an order on our store, you can track it live here.',
                    icon: Icons.receipt_long_outlined,
                    actionLabel: 'Browse Products',
                    onAction: () => context.go('/catalog'),
                  );
                }

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  itemCount: orders.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final order = orders[index];
                    return _buildOrderCard(order, primaryColor, darkTextColor);
                  },
                );
              },
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderCard(
    Map<String, dynamic> order,
    Color primaryColor,
    Color darkTextColor, {
    bool isExpanded = false,
  }) {
    final status = (order['status'] as String? ?? 'processing').toLowerCase();
    final total = order['total']?.toString() ?? '0.00';
    final orderNum = order['order_number']?.toString() ?? order['id']?.toString() ?? '';
    final paymentMethod = order['payment_method_title']?.toString() ?? 'Online Payment';
    final lineItems = (order['line_items'] is List) ? (order['line_items'] as List) : [];

    final rawDate = order['date_created'] ?? order['created_at'];
    String dateStr = '';
    if (rawDate != null) {
      try {
        final parsed = DateTime.parse(rawDate.toString());
        dateStr = '${parsed.day}/${parsed.month}/${parsed.year}';
      } catch (_) {
        dateStr = rawDate.toString().split('T').first;
      }
    }

    Color statusColor = const Color(0xFF2563EB);
    Color statusBg = const Color(0xFFEFF6FF);
    if (status == 'completed') {
      statusColor = const Color(0xFF059669);
      statusBg = const Color(0xFFECFDF5);
    } else if (status == 'cancelled' || status == 'failed') {
      statusColor = const Color(0xFFEF4444);
      statusBg = const Color(0xFFFEF2F2);
    } else if (status == 'on-hold' || status == 'pending') {
      statusColor = const Color(0xFFD97706);
      statusBg = const Color(0xFFFFFBEB);
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(color: Colors.grey.shade200),
      ),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Order Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Order #$orderNum',
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF1E1B4B)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Total & Payment method
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total: ₹$total',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: primaryColor,
                ),
              ),
              Text(
                paymentMethod,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade600,
                ),
              ),
            ],
          ),
          if (dateStr.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Placed on: $dateStr',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
            ),
          ],

          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12.0),
            child: Divider(color: Color(0xFFF1F5F9), height: 1),
          ),

          // Live Delivery Tracking Progress Timeline
          _buildTrackingTimeline(status, primaryColor),

          // Line items preview
          if (lineItems.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text(
              'Items:',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(height: 4),
            ...lineItems.map((item) {
              final name = item['name']?.toString() ?? 'Item';
              final qty = item['quantity']?.toString() ?? '1';
              final itemTotal = item['total']?.toString() ?? '';
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 2.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        '• $name (x$qty)',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: Color(0xFF374151)),
                      ),
                    ),
                    if (itemTotal.isNotEmpty)
                      Text('₹$itemTotal', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildTrackingTimeline(String status, Color primaryColor) {
    int activeStep = 1; // 0 = Placed, 1 = Processing, 2 = Shipped, 3 = Delivered
    if (status == 'pending' || status == 'on-hold') {
      activeStep = 0;
    } else if (status == 'processing') {
      activeStep = 1;
    } else if (status == 'completed') {
      activeStep = 3;
    } else if (status == 'cancelled' || status == 'failed') {
      activeStep = -1;
    }

    if (activeStep == -1) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF2F2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Row(
          children: [
            Icon(Icons.cancel_outlined, color: Color(0xFFEF4444), size: 16),
            SizedBox(width: 6),
            Text('This order was cancelled on the store.', style: TextStyle(fontSize: 11.5, color: Color(0xFFEF4444), fontWeight: FontWeight.w600)),
          ],
        ),
      );
    }

    final steps = ['Placed', 'Processing', 'Shipped', 'Delivered'];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(steps.length, (idx) {
        final isCompleted = idx <= activeStep;
        final isCurrent = idx == activeStep;

        return Expanded(
          child: Row(
            children: [
              Column(
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: isCompleted
                          ? (isCurrent ? primaryColor : const Color(0xFF10B981))
                          : Colors.grey.shade200,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isCompleted ? Icons.check : Icons.circle,
                      size: isCompleted ? 13 : 8,
                      color: isCompleted ? Colors.white : Colors.grey.shade400,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    steps[idx],
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
                      color: isCompleted ? const Color(0xFF1E1B4B) : Colors.grey.shade400,
                    ),
                  ),
                ],
              ),
              if (idx < steps.length - 1)
                Expanded(
                  child: Container(
                    height: 2,
                    margin: const EdgeInsets.only(bottom: 14),
                    color: idx < activeStep ? const Color(0xFF10B981) : Colors.grey.shade200,
                  ),
                ),
            ],
          ),
        );
      }),
    );
  }
}
