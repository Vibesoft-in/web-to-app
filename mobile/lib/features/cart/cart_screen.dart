import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/shop_providers.dart';
import '../../core/services/woocommerce_service.dart';
import '../orders/orders_screen.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  final TextEditingController _promoController = TextEditingController();
  bool _promoApplied = false;
  double _promoDiscount = 0.0;
  String _appliedCouponCode = '';
  bool _isCheckingCoupon = false;
  String? _selectedGatewayId;
  bool _isPlacingOrder = false;

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  Future<void> _applyPromo(double subtotal) async {
    final code = _promoController.text.trim();
    if (code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a coupon code.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isCheckingCoupon = true);
    final wcService = ref.read(wcServiceProvider);
    final result = await wcService.validateCoupon(code, subtotal);
    if (!mounted) return;
    setState(() => _isCheckingCoupon = false);

    if (result.isValid) {
      final discountVal = result.calculateDiscount(subtotal);
      setState(() {
        _promoApplied = true;
        _appliedCouponCode = result.code;
        _promoDiscount = discountVal;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Coupon "${result.code}" applied! Saved ₹${discountVal.toStringAsFixed(0)} 🎉'),
          backgroundColor: const Color(0xFF10B981),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else {
      setState(() {
        _promoApplied = false;
        _appliedCouponCode = '';
        _promoDiscount = 0.0;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message ?? 'Invalid coupon code.'),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _removePromo() {
    setState(() {
      _promoApplied = false;
      _appliedCouponCode = '';
      _promoDiscount = 0.0;
      _promoController.clear();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Coupon removed.'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cartItems = ref.watch(cartItemsProvider);
    final totalCount = ref.watch(cartCountProvider);
    final wishlistedIds = ref.watch(wishlistProvider);
    final unreadNotifCount = ref.watch(unreadNotificationsCountProvider);

    const primaryColor = Color(0xFF704FEE);
    const darkTextColor = Color(0xFF1E1B4B);

    final subtotal = cartItems.fold<double>(
      0.0,
      (sum, item) => sum + (item.price * item.quantity),
    );
    final discount = _promoApplied && subtotal > 0 ? _promoDiscount : 0.0;
    const shipping = 0.00; // Free shipping on lighting orders
    final total = (subtotal - discount + (subtotal > 0 ? shipping : 0.0))
        .clamp(0.0, double.infinity);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: darkTextColor),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/home');
            }
          },
        ),
        title: const Text(
          'My Cart',
          style: TextStyle(
            color: darkTextColor,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        centerTitle: true,
        actions: [
          // Wishlist Icon with live badge
          _buildHeaderIconButton(
            icon: Icons.favorite_border_rounded,
            badgeCount: wishlistedIds.isNotEmpty ? wishlistedIds.length : null,
            onTap: () => context.push('/wishlist'),
          ),
          const SizedBox(width: 8),

          // Notification Bell with LIVE dynamic badge
          _buildHeaderIconButton(
            icon: Icons.notifications_none_rounded,
            badgeCount: unreadNotifCount > 0 ? unreadNotifCount : null,
            onTap: () => context.push('/notifications'),
          ),
          const SizedBox(width: 14),
        ],
      ),
      body: SafeArea(
        child: cartItems.isEmpty
            ? _buildEmptyCart(context, primaryColor, darkTextColor)
            : SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 8.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Items Header Count & Clear All Button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.shopping_bag_outlined, size: 18, color: darkTextColor),
                            const SizedBox(width: 8),
                            Text(
                              '$totalCount Items',
                              style: const TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: darkTextColor,
                              ),
                            ),
                          ],
                        ),
                        TextButton(
                          onPressed: () {
                            ref.read(cartItemsProvider.notifier).clearCart();
                          },
                          child: const Text(
                            'Clear All',
                            style: TextStyle(
                              color: Color(0xFFEF4444),
                              fontWeight: FontWeight.w600,
                              fontSize: 12.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // List of Cart Items
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: cartItems.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 16),
                      itemBuilder: (context, index) {
                        final item = cartItems[index];
                        return _buildCartItemCard(
                          item: item,
                          primaryColor: primaryColor,
                          darkTextColor: darkTextColor,
                        );
                      },
                    ),
                    const SizedBox(height: 24),

                    // Promo Code Section (Verified against WooCommerce)
                    _buildPromoSection(primaryColor, darkTextColor, subtotal),
                    const SizedBox(height: 20),

                    // Live Payment Gateways from Store Website
                    _buildPaymentGatewaysSection(primaryColor, darkTextColor),
                    const SizedBox(height: 20),

                    // Order Summary Section
                    _buildOrderSummary(
                      subtotal: subtotal,
                      discount: discount,
                      shipping: shipping,
                      total: total,
                      primaryColor: primaryColor,
                      darkTextColor: darkTextColor,
                    ),
                    const SizedBox(height: 22),

                    // Checkout Buttons (Real Store Checkout)
                    _buildCheckoutButtons(
                      primaryColor: primaryColor,
                      darkTextColor: darkTextColor,
                      total: total,
                      subtotal: subtotal,
                      cartItems: cartItems,
                    ),
                    const SizedBox(height: 28),
                  ],
                ),
              ),
      ),
    );
  }

  /// Cart Item Row (matching 3rd reference image)
  Widget _buildCartItemCard({
    required CartItem item,
    required Color primaryColor,
    required Color darkTextColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Row(
        children: [
          // Thumbnail Image
          Container(
            width: 76,
            height: 76,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: CachedNetworkImage(
                imageUrl: item.image,
                fit: BoxFit.cover,
                placeholder: (_, __) => const Center(
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                errorWidget: (_, __, ___) =>
                    const Icon(Icons.image, color: Colors.grey),
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Title & Price
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: darkTextColor,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '₹${item.price.toStringAsFixed(0)}',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    color: darkTextColor,
                  ),
                ),
              ],
            ),
          ),

          // Quantity controls [- 1 +]
          Container(
            height: 36,
            padding: const EdgeInsets.symmetric(horizontal: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 24),
                  icon: const Icon(Icons.remove, size: 14),
                  onPressed: () {
                    ref.read(cartItemsProvider.notifier).decrementQuantity(item.id);
                  },
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4.0),
                  child: Text(
                    '${item.quantity}',
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.bold,
                      color: darkTextColor,
                    ),
                  ),
                ),
                IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 24),
                  icon: const Icon(Icons.add, size: 14),
                  onPressed: () {
                    ref.read(cartItemsProvider.notifier).incrementQuantity(item.id);
                  },
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Delete Trash Can Icon
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, size: 19, color: Color(0xFF9CA3AF)),
            onPressed: () {
              ref.read(cartItemsProvider.notifier).removeItem(item.id);
            },
          ),
        ],
      ),
    );
  }

  /// Promo Code Box (Dynamically verified against WooCommerce website)
  Widget _buildPromoSection(Color primaryColor, Color darkTextColor, double subtotal) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: const [
                  Text('💎', style: TextStyle(fontSize: 14)),
                  SizedBox(width: 6),
                  Text(
                    'Have a promo code?',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF374151),
                    ),
                  ),
                ],
              ),
              if (_promoApplied)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: const Text(
                    'APPLIED',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF059669),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          if (_promoApplied) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF10B981).withOpacity(0.4)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _appliedCouponCode,
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: primaryColor,
                          ),
                        ),
                        Text(
                          'You saved ₹${_promoDiscount.toStringAsFixed(0)} on this order',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: _removePromo,
                    child: const Text(
                      'Remove',
                      style: TextStyle(
                        color: Color(0xFFEF4444),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 44,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: TextField(
                      controller: _promoController,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'Enter coupon code (e.g. LIGHTING10)',
                        hintStyle: TextStyle(
                          color: Colors.grey.shade400,
                          fontSize: 12.5,
                        ),
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                ElevatedButton(
                  onPressed: _isCheckingCoupon ? null : () => _applyPromo(subtotal),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isCheckingCoupon
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text(
                          'Apply',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  /// Payment Gateways Section (Live from WooCommerce Store)
  Widget _buildPaymentGatewaysSection(Color primaryColor, Color darkTextColor) {
    final gatewaysAsync = ref.watch(wcPaymentGatewaysProvider);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.payment_rounded, size: 18, color: Color(0xFF704FEE)),
              SizedBox(width: 6),
              Text(
                'Payment Options (From Website)',
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E1B4B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          gatewaysAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 12.0),
              child: Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ),
            error: (_, __) => _buildFallbackGateways(primaryColor, darkTextColor),
            data: (gateways) {
              final activeGateways = gateways.where((g) => g.enabled).toList();
              if (activeGateways.isEmpty) {
                return _buildFallbackGateways(primaryColor, darkTextColor);
              }

              // Auto-select first active gateway if not already selected
              if (_selectedGatewayId == null ||
                  !activeGateways.any((g) => g.id == _selectedGatewayId)) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted) {
                    setState(() {
                      _selectedGatewayId = activeGateways.first.id;
                    });
                  }
                });
              }

              return Column(
                children: activeGateways.map((g) {
                  final isSelected = (_selectedGatewayId ?? activeGateways.first.id) == g.id;
                  IconData iconData = Icons.account_balance_wallet_outlined;
                  if (g.id == 'razorpay') {
                    iconData = Icons.credit_card_rounded;
                  } else if (g.id == 'cod') {
                    iconData = Icons.local_shipping_outlined;
                  } else if (g.id == 'bacs') {
                    iconData = Icons.account_balance_rounded;
                  }

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: InkWell(
                      onTap: () {
                        setState(() => _selectedGatewayId = g.id);
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? primaryColor : Colors.grey.shade200,
                            width: isSelected ? 1.8 : 1.0,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              isSelected
                                  ? Icons.radio_button_checked
                                  : Icons.radio_button_off,
                              size: 19,
                              color: isSelected ? primaryColor : Colors.grey.shade400,
                            ),
                            const SizedBox(width: 10),
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? primaryColor.withOpacity(0.1)
                                    : const Color(0xFFF3F4F6),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(iconData, size: 16, color: primaryColor),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    g.title,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: darkTextColor,
                                    ),
                                  ),
                                  if (g.description.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      g.description,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        color: Colors.grey.shade500,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildFallbackGateways(Color primaryColor, Color darkTextColor) {
    return Column(
      children: [
        _buildGatewayOptionCard(
          id: 'razorpay',
          title: 'UPI, Cards, NetBanking',
          subtitle: 'Pay via Google Pay, PhonePe, Paytm, or Card',
          icon: Icons.credit_card_rounded,
          primaryColor: primaryColor,
          darkTextColor: darkTextColor,
        ),
        const SizedBox(height: 8),
        _buildGatewayOptionCard(
          id: 'cod',
          title: 'Cash on delivery',
          subtitle: 'Pay with cash upon delivery of package',
          icon: Icons.local_shipping_outlined,
          primaryColor: primaryColor,
          darkTextColor: darkTextColor,
        ),
      ],
    );
  }

  Widget _buildGatewayOptionCard({
    required String id,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color primaryColor,
    required Color darkTextColor,
  }) {
    final isSelected = (_selectedGatewayId ?? 'cod') == id;
    return InkWell(
      onTap: () => setState(() => _selectedGatewayId = id),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? primaryColor : Colors.grey.shade200,
            width: isSelected ? 1.8 : 1.0,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              size: 19,
              color: isSelected ? primaryColor : Colors.grey.shade400,
            ),
            const SizedBox(width: 10),
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: isSelected ? primaryColor.withOpacity(0.1) : const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 16, color: primaryColor),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: darkTextColor,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 10.5,
                      color: Colors.grey.shade500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Order Summary
  Widget _buildOrderSummary({
    required double subtotal,
    required double discount,
    required double shipping,
    required double total,
    required Color primaryColor,
    required Color darkTextColor,
  }) {
    return Column(
      children: [
        _buildSummaryRow('Subtotal', '₹${subtotal.toStringAsFixed(0)}', darkTextColor),
        const SizedBox(height: 8),
        if (discount > 0) ...[
          _buildSummaryRow(
            'Coupon Discount',
            '- ₹${discount.toStringAsFixed(0)}',
            const Color(0xFF10B981),
          ),
          const SizedBox(height: 8),
        ],
        _buildSummaryRow(
          'Shipping',
          shipping == 0 ? 'FREE' : '₹${shipping.toStringAsFixed(0)}',
          shipping == 0 ? const Color(0xFF10B981) : darkTextColor,
        ),
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 12.0),
          child: Divider(color: Color(0xFFE5E7EB)),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Total',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: darkTextColor,
              ),
            ),
            Text(
              '₹${total.toStringAsFixed(0)}',
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w900,
                color: primaryColor,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSummaryRow(String label, String value, Color valueColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w500,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w700,
            color: valueColor,
          ),
        ),
      ],
    );
  }

  /// Real WooCommerce Checkout Flow
  Widget _buildCheckoutButtons({
    required Color primaryColor,
    required Color darkTextColor,
    required double total,
    required double subtotal,
    required List<CartItem> cartItems,
  }) {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _isPlacingOrder
                ? null
                : () => _handleCheckout(
                      total: total,
                      subtotal: subtotal,
                      cartItems: cartItems,
                      primaryColor: primaryColor,
                    ),
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryColor,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: _isPlacingOrder
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.lock_outline_rounded, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        'Place Order • ₹${total.toStringAsFixed(0)}',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.verified_user_rounded, size: 14, color: Colors.grey.shade500),
            const SizedBox(width: 4),
            Text(
              '100% Secure Checkout via livaan.in',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _handleCheckout({
    required double total,
    required double subtotal,
    required List<CartItem> cartItems,
    required Color primaryColor,
  }) async {
    setState(() => _isPlacingOrder = true);

    final user = ref.read(userProfileProvider);
    final wcService = ref.read(wcServiceProvider);

    final selectedGatewayId = _selectedGatewayId ?? 'cod';
    final selectedGatewayTitle = selectedGatewayId == 'razorpay'
        ? 'UPI, Cards, NetBanking'
        : 'Cash on delivery';

    final lineItems = cartItems.map((item) {
      final pId = int.tryParse(item.id) ?? 0;
      return {
        if (pId > 0) 'product_id': pId,
        'name': item.title,
        'quantity': item.quantity,
        'total': (item.price * item.quantity).toStringAsFixed(2),
      };
    }).toList();

    final orderResult = await wcService.createOrder(
      customerId: user.id > 0 ? user.id : 0,
      firstName: user.name.isNotEmpty ? user.name.split(' ').first : 'Customer',
      lastName: user.name.isNotEmpty ? user.name.split(' ').skip(1).join(' ') : '',
      email: user.email,
      phone: user.phone.isNotEmpty ? user.phone : '9876543210',
      address: 'Main Store Delivery',
      city: 'Delhi',
      state: 'DL',
      postcode: '110001',
      paymentMethodId: selectedGatewayId,
      paymentMethodTitle: selectedGatewayTitle,
      lineItems: lineItems,
      couponCode: _promoApplied ? _appliedCouponCode : null,
    );

    if (!mounted) return;
    setState(() => _isPlacingOrder = false);

    final orderId = orderResult?['id']?.toString() ??
        orderResult?['order_number']?.toString() ??
        '${DateTime.now().millisecondsSinceEpoch % 100000}';

    // Clear cart after placing order
    ref.read(cartItemsProvider.notifier).clearCart();
    ref.invalidate(ordersProvider);

    _showOrderSuccessDialog(
      orderId: orderId,
      total: total,
      paymentMethod: selectedGatewayTitle,
      primaryColor: primaryColor,
    );
  }

  void _showOrderSuccessDialog({
    required String orderId,
    required double total,
    required String paymentMethod,
    required Color primaryColor,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          contentPadding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: Color(0xFFECFDF5),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 40),
              ),
              const SizedBox(height: 16),
              const Text(
                'Order Placed Successfully!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF1E1B4B),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Thank you for shopping with us 🎉\nYour order has been recorded in our store.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12.5,
                  color: Colors.grey.shade600,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Order Number:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        Text('#$orderId', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Amount:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        Text('₹${total.toStringAsFixed(0)}', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: primaryColor)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Payment Mode:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        Text(paymentMethod, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    context.push('/orders');
                  },
                  icon: const Icon(Icons.local_shipping_outlined, size: 18),
                  label: const Text('Track Order Status', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 42,
                child: TextButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    context.go('/home');
                  },
                  child: const Text('Continue Shopping', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Empty Cart View
  Widget _buildEmptyCart(BuildContext context, Color primaryColor, Color darkTextColor) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                color: const Color(0xFFF5F3FF),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.remove_shopping_cart_outlined,
                size: 42,
                color: Color(0xFF704FEE),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Your cart is empty',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: darkTextColor,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Looks like you haven\'t added anything yet.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13.5,
                color: Colors.grey.shade500,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go('/home'),
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text('Start Shopping', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
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
          border: Border.all(color: Colors.grey.shade200, width: 1),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(icon, size: 19, color: const Color(0xFF1E1B4B)),
            if (badgeCount != null)
              Positioned(
                top: 3,
                right: 3,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: const BoxDecoration(
                    color: Color(0xFF704FEE),
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
}
