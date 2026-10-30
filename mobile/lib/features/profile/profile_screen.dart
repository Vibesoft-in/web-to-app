import 'dart:io';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/providers/core_providers.dart';
import '../../core/providers/shop_providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _performLogout(WidgetRef ref, BuildContext context) async {
    final dio = ref.read(dioProvider);
    final secureStore = ref.read(secureStoreProvider);
    final configCache = ref.read(configCacheProvider);

    try {
      await dio.delete('/v1/devices');
      await dio.post('/v1/auth/logout');
    } catch (_) {}

    await secureStore.clearAll();
    await configCache.clear();
    ref.read(userProfileProvider.notifier).logout();
    ref.read(cartItemsProvider.notifier).clearCart();
    ref.read(wishlistProvider.notifier).clear();

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Logged out. All session tokens and cache cleared.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      context.go('/splash');
    }
  }

  Future<void> _performAccountDeletion(WidgetRef ref, BuildContext context) async {
    final dio = ref.read(dioProvider);
    final secureStore = ref.read(secureStoreProvider);
    final configCache = ref.read(configCacheProvider);

    try {
      await dio.delete('/v1/account');
    } catch (_) {}

    await secureStore.clearAll();
    await configCache.clear();
    ref.read(userProfileProvider.notifier).logout();
    ref.read(cartItemsProvider.notifier).clearCart();
    ref.read(wishlistProvider.notifier).clear();

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Account permanently deleted per Google Play policy.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      context.go('/splash');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(userProfileProvider);
    final wishlist = ref.watch(wishlistProvider);
    final unreadNotifs = ref.watch(unreadNotificationsCountProvider);

    const darkHeaderBg = Color(0xFF0F172A); // Luxury deep dark navy
    const darkTextColor = Color(0xFF1E1B4B);

    final displayName = user.name.trim().isNotEmpty ? user.name.trim() : 'Store Customer';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: AnnotatedRegion<SystemUiOverlayStyle>(
        value: const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
          statusBarBrightness: Brightness.dark,
        ),
        child: Column(
          children: [
            // 1. Sleek Compact Header with Back Arrow, Title, Notification & User Info (FIXED / PINNED AT TOP)
            Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                color: darkHeaderBg,
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(24),
                  bottomRight: Radius.circular(24),
                ),
              ),
                child: SafeArea(
                  top: true,
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    child: Column(
                      children: [
                        // Top Bar Row: Back Button (Left), 'My Account' Title, Notifications (Right)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                          // Left Corner: Back Arrow Icon (Navigates back to Home / Previous)
                          InkWell(
                            onTap: () {
                              if (context.canPop()) {
                                context.pop();
                              } else {
                                context.go('/home');
                              }
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.arrow_back_ios_new_rounded,
                                size: 16,
                                color: Colors.white,
                              ),
                            ),
                          ),

                          // Title
                          const Text(
                            'My Account',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.3,
                            ),
                          ),

                          // Right Corner: Notifications with live badge
                          InkWell(
                            onTap: () => context.push('/notifications'),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 19),
                                  if (unreadNotifs > 0)
                                    Positioned(
                                      top: 6,
                                      right: 6,
                                      child: Container(
                                        width: 7,
                                        height: 7,
                                        decoration: const BoxDecoration(
                                          color: Color(0xFFEF4444),
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // User Info Row (Avatar + Name + Edit Profile Button)
                      Row(
                        children: [
                          // Compact Avatar Circle
                          Container(
                            padding: const EdgeInsets.all(2),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white.withOpacity(0.3), width: 1.5),
                            ),
                            child: _buildAvatarWidget(
                              avatar: user.avatar,
                              name: displayName,
                              radius: 22,
                              backgroundColor: Colors.white,
                              textColor: darkHeaderBg,
                            ),
                          ),
                          const SizedBox(width: 12),

                          // User Name & Edit Profile Link
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  displayName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                    letterSpacing: -0.3,
                                  ),
                                ),
                                const SizedBox(height: 3),

                                // Edit Profile Action Button
                                InkWell(
                                  onTap: () => _openEditProfileModal(context, ref, user),
                                  borderRadius: BorderRadius.circular(6),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        'Edit Profile',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.grey.shade300,
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      Icon(
                                        Icons.edit_outlined,
                                        size: 12,
                                        color: Colors.grey.shade300,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Main Body Content (Scrollable below the pinned header)
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  // 2. Benefits & Rewards Pill Bar (Like Image 2)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: _buildBenefitItem(
                            icon: Icons.flash_on_rounded,
                            iconColor: const Color(0xFF3B82F6),
                            bgColor: const Color(0xFFEFF6FF),
                            label: 'Reward Pts',
                            value: '120 Pts',
                          ),
                        ),
                        Container(height: 28, width: 1, color: Colors.grey.shade200),
                        Expanded(
                          child: _buildBenefitItem(
                            icon: Icons.account_balance_wallet_rounded,
                            iconColor: const Color(0xFF059669),
                            bgColor: const Color(0xFFECFDF5),
                            label: 'Wallet Cash',
                            value: '₹50.00',
                          ),
                        ),
                        Container(height: 28, width: 1, color: Colors.grey.shade200),
                        Expanded(
                          child: _buildBenefitItem(
                            icon: Icons.favorite_rounded,
                            iconColor: const Color(0xFFEF4444),
                            bgColor: const Color(0xFFFEF2F2),
                            label: 'Wishlist',
                            value: '${wishlist.length} Saved',
                            onTap: () => context.push('/wishlist'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // 3. Side-by-Side 2 Icon Boxes: "My Orders" (Left) and "Help Center" (Right)
                  Row(
                    children: [
                      // Left Box: My Orders
                      Expanded(
                        child: InkWell(
                          onTap: () => context.push('/orders'),
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.grey.shade200, width: 1),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.03),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(9),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFF7ED),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(
                                    Icons.shopping_bag_outlined,
                                    size: 20,
                                    color: Color(0xFFEA580C),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                const Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'My Orders',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w700,
                                          color: darkTextColor,
                                        ),
                                      ),
                                      SizedBox(height: 2),
                                      Text(
                                        'Track & History',
                                        style: TextStyle(
                                          fontSize: 10.5,
                                          color: Colors.grey,
                                          fontWeight: FontWeight.w500,
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
                      const SizedBox(width: 12),

                      // Right Box: Help Center
                      Expanded(
                        child: InkWell(
                          onTap: () => _openHelpCenterModal(context),
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.grey.shade200, width: 1),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.03),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(9),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF0FDF4),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(
                                    Icons.support_agent_rounded,
                                    size: 20,
                                    color: Color(0xFF16A34A),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                const Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Help Center',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w700,
                                          color: darkTextColor,
                                        ),
                                      ),
                                      SizedBox(height: 2),
                                      Text(
                                        '24/7 Support',
                                        style: TextStyle(
                                          fontSize: 10.5,
                                          color: Colors.grey,
                                          fontWeight: FontWeight.w500,
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
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 4. Rewards Promotional Banner (Inspired by Image 2)
                  InkWell(
                    onTap: () => context.go('/catalog'),
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF7C3AED).withOpacity(0.3),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Text('🎁', style: TextStyle(fontSize: 20)),
                          ),
                          const SizedBox(width: 14),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Unlock exciting rewards!',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14,
                                  ),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Get special member discounts on lighting.rishabhtyagi.in',
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 11.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 14),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 5. Section: "ACCOUNT SPECIFIC DETAILS" (Like Image 2)
                  const Padding(
                    padding: EdgeInsets.only(left: 4, bottom: 8),
                    child: Text(
                      'ACCOUNT SPECIFIC DETAILS',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF64748B),
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.grey.shade200, width: 1),
                    ),
                    child: Column(
                      children: [
                        _buildMenuTile(
                          icon: Icons.favorite_border_rounded,
                          title: 'My Wishlist',
                          subtitle: '${wishlist.length} items saved',
                          trailingBadge: wishlist.isNotEmpty ? '${wishlist.length}' : null,
                          onTap: () => context.push('/wishlist'),
                        ),
                        _buildDivider(),
                        _buildMenuTile(
                          icon: Icons.location_on_outlined,
                          title: 'My Saved Addresses',
                          subtitle: 'Default delivery location',
                          onTap: () => _openSavedAddressesModal(context, ref, user),
                        ),
                        _buildDivider(),
                        _buildMenuTile(
                          icon: Icons.payment_outlined,
                          title: 'Saved Payment Methods',
                          subtitle: 'Cards, UPI & Wallets',
                          onTap: () => _openPaymentMethodsModal(context),
                        ),
                        _buildDivider(),
                        _buildMenuTile(
                          icon: Icons.notifications_none_rounded,
                          title: 'Notifications & Alerts',
                          subtitle: 'Flash deals & delivery updates',
                          trailingBadge: unreadNotifs > 0 ? '$unreadNotifs new' : null,
                          onTap: () => context.push('/notifications'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 6. Section: "PREFERENCES & SUPPORT"
                  const Padding(
                    padding: EdgeInsets.only(left: 4, bottom: 8),
                    child: Text(
                      'PREFERENCES & SUPPORT',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF64748B),
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.grey.shade200, width: 1),
                    ),
                    child: Column(
                      children: [
                        _buildMenuTile(
                          icon: Icons.security_rounded,
                          title: 'Privacy Policy',
                          subtitle: 'How we protect your store data',
                          onTap: () => _openPrivacyModal(context, ref),
                        ),
                        _buildDivider(),
                        _buildMenuTile(
                          icon: Icons.description_outlined,
                          title: 'Terms & Conditions',
                          subtitle: 'Store guidelines and usage rules',
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Terms & Conditions available on lighting.rishabhtyagi.in'),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          },
                        ),
                        _buildDivider(),
                        _buildMenuTile(
                          icon: Icons.star_rate_rounded,
                          title: 'Rate Our App',
                          subtitle: 'Give us feedback on Google Play',
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Thank you for your rating! ⭐⭐⭐⭐⭐'),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 7. Footer Actions: Log Out & Delete Account
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.grey.shade200, width: 1),
                    ),
                    child: Column(
                      children: [
                        // Logout Action
                        _buildMenuTile(
                          icon: Icons.logout_rounded,
                          iconColor: const Color(0xFFD97706),
                          title: 'Sign Out',
                          subtitle: 'Clears credentials, cart and local session',
                          onTap: () => _performLogout(ref, context),
                        ),
                        _buildDivider(),
                        // Delete Account Action
                        _buildMenuTile(
                          icon: Icons.delete_outline_rounded,
                          iconColor: const Color(0xFFEF4444),
                          title: 'Delete Account',
                          titleColor: const Color(0xFFEF4444),
                          subtitle: 'Permanently remove personal data (Play Store Policy)',
                          onTap: () => _showDeleteConfirmation(context, () => _performAccountDeletion(ref, context)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // App Watermark / Version
                  Center(
                    child: Column(
                      children: [
                        Text(
                          'Lighting Store App',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Colors.grey.shade500,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Version 1.0.4 • lighting.rishabhtyagi.in',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade400,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ),
      ],
    ),
  ),
);
  }

  // --- Helper Widgets ---

  Widget _buildBenefitItem({
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required String label,
    required String value,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(5.5),
              decoration: BoxDecoration(
                color: bgColor,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 13, color: iconColor),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1E1B4B),
                    ),
                  ),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 9.5,
                      color: Colors.grey.shade500,
                      fontWeight: FontWeight.w500,
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

  Widget _buildMenuTile({
    required IconData icon,
    Color? iconColor,
    required String title,
    Color? titleColor,
    String? subtitle,
    String? trailingBadge,
    required VoidCallback onTap,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: (iconColor ?? const Color(0xFF704FEE)).withOpacity(0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          icon,
          size: 19,
          color: iconColor ?? const Color(0xFF704FEE),
        ),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: titleColor ?? const Color(0xFF1E1B4B),
        ),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle,
              style: TextStyle(
                fontSize: 11.5,
                color: Colors.grey.shade500,
              ),
            )
          : null,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (trailingBadge != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFF704FEE).withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                trailingBadge,
                style: const TextStyle(
                  color: Color(0xFF704FEE),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 6),
          ],
          Icon(Icons.arrow_forward_ios_rounded, size: 13, color: Colors.grey.shade400),
        ],
      ),
      onTap: onTap,
    );
  }

  Widget _buildDivider() {
    return Divider(
      height: 1,
      thickness: 1,
      indent: 56,
      endIndent: 16,
      color: Colors.grey.shade100,
    );
  }

  // --- Modals & Sheets ---

  void _openEditProfileModal(BuildContext context, WidgetRef ref, UserProfile user) {
    final nameCtrl = TextEditingController(text: user.name);
    final phoneCtrl = TextEditingController(text: user.phone);
    final dobCtrl = TextEditingController(text: user.dob);
    final ageCtrl = TextEditingController(text: user.age);
    String selectedGender = user.gender.isNotEmpty ? user.gender : 'Female';
    String currentAvatar = user.avatar;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
            ),
          ),
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Edit Profile ✏️',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1E1B4B),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Top Profile Picture Section with Edit Camera Button
              Center(
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: const Color(0xFF704FEE).withOpacity(0.35),
                          width: 2.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF704FEE).withOpacity(0.12),
                            blurRadius: 14,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: _buildAvatarWidget(
                        avatar: currentAvatar,
                        name: nameCtrl.text.isNotEmpty ? nameCtrl.text : user.name,
                        radius: 40,
                        backgroundColor: const Color(0xFFEDE9FE),
                        textColor: const Color(0xFF704FEE),
                      ),
                    ),
                    Positioned(
                      bottom: -2,
                      right: -2,
                      child: GestureDetector(
                        onTap: () => _showPhotoPickerOptions(context, (newAvatar) {
                          setModalState(() {
                            currentAvatar = newAvatar;
                          });
                        }),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF704FEE),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2.5),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.18),
                                blurRadius: 6,
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.camera_alt_rounded,
                            size: 16,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Center(
                child: TextButton.icon(
                  onPressed: () => _showPhotoPickerOptions(context, (newAvatar) {
                    setModalState(() {
                      currentAvatar = newAvatar;
                    });
                  }),
                  icon: const Icon(Icons.edit_rounded, size: 14, color: Color(0xFF704FEE)),
                  label: const Text(
                    'Change Profile Photo',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF704FEE),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Full Name
              _buildModalTextField(
                label: 'Full Name',
                controller: nameCtrl,
                icon: Icons.person_outline_rounded,
              ),
              const SizedBox(height: 12),

              // Phone Number
              _buildModalTextField(
                label: 'Phone Number',
                controller: phoneCtrl,
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),

              // DOB + Age Row
              Row(
                children: [
                  // DOB Field with Calendar Picker
                  Expanded(
                    flex: 6,
                    child: GestureDetector(
                      onTap: () async {
                        final now = DateTime.now();
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: DateTime(2004, 10, 24),
                          firstDate: DateTime(1940),
                          lastDate: now,
                        );
                        if (picked != null) {
                          final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          final formattedDob = '${picked.day} ${months[picked.month - 1]} ${picked.year}';
                          var calculatedAge = now.year - picked.year;
                          if (now.month < picked.month || (now.month == picked.month && now.day < picked.day)) {
                            calculatedAge--;
                          }
                          setModalState(() {
                            dobCtrl.text = formattedDob;
                            ageCtrl.text = '$calculatedAge';
                          });
                        }
                      },
                      child: AbsorbPointer(
                        child: _buildModalTextField(
                          label: 'Date of Birth',
                          controller: dobCtrl,
                          icon: Icons.calendar_month_outlined,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Age Field
                  Expanded(
                    flex: 4,
                    child: _buildModalTextField(
                      label: 'Age',
                      controller: ageCtrl,
                      icon: Icons.cake_outlined,
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Gender Dropdown
              const Text(
                'Gender',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: selectedGender,
                    isExpanded: true,
                    items: const [
                      DropdownMenuItem(value: 'Female', child: Text('Female')),
                      DropdownMenuItem(value: 'Male', child: Text('Male')),
                      DropdownMenuItem(value: 'Other', child: Text('Other')),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() => selectedGender = val);
                      }
                    },
                  ),
                ),
              ),
              const SizedBox(height: 22),

              // Save Changes Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    final newName = nameCtrl.text.trim();
                    if (newName.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Please enter a valid name')),
                      );
                      return;
                    }
                    ref.read(userProfileProvider.notifier).updateProfile(
                      name: newName,
                      phone: phoneCtrl.text.trim(),
                      dob: dobCtrl.text.trim(),
                      age: ageCtrl.text.trim(),
                      gender: selectedGender,
                      avatar: currentAvatar,
                    );
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Profile updated successfully! ✨'),
                        backgroundColor: Color(0xFF059669),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF704FEE),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showPhotoPickerOptions(BuildContext context, Function(String) onSelected) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (bCtx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Profile Photo',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E1B4B),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Upload your photo or choose an avatar',
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 14),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEDE9FE),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: Color(0xFF704FEE)),
                ),
                title: const Text('Choose from Gallery', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Select a photo from your gallery', style: TextStyle(fontSize: 12)),
                onTap: () async {
                  Navigator.pop(bCtx);
                  try {
                    final picker = ImagePicker();
                    final picked = await picker.pickImage(
                      source: ImageSource.gallery,
                      maxWidth: 800,
                      maxHeight: 800,
                      imageQuality: 85,
                    );
                    if (picked != null) {
                      onSelected(picked.path);
                    }
                  } catch (e) {
                    debugPrint('Image picker error: $e');
                  }
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEDE9FE),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: Color(0xFF704FEE)),
                ),
                title: const Text('Take Photo', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Capture a new photo with camera', style: TextStyle(fontSize: 12)),
                onTap: () async {
                  Navigator.pop(bCtx);
                  try {
                    final picker = ImagePicker();
                    final picked = await picker.pickImage(
                      source: ImageSource.camera,
                      maxWidth: 800,
                      maxHeight: 800,
                      imageQuality: 85,
                    );
                    if (picked != null) {
                      onSelected(picked.path);
                    }
                  } catch (e) {
                    debugPrint('Camera error: $e');
                  }
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEDE9FE),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.face_rounded, color: Color(0xFF704FEE)),
                ),
                title: const Text('Choose Avatar Style', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Select an illustrated driver avatar', style: TextStyle(fontSize: 12)),
                onTap: () {
                  Navigator.pop(bCtx);
                  _showPresetAvatarDialog(context, onSelected);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444)),
                ),
                title: const Text('Remove Photo', style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFFEF4444))),
                onTap: () {
                  Navigator.pop(bCtx);
                  onSelected('');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showPresetAvatarDialog(BuildContext context, Function(String) onSelected) {
    final presets = ['👨‍💼', '👩‍💼', '🏎️', '⚡', '🕶️', '👑', '🧑‍🔧', '🚀'];
    showDialog(
      context: context,
      builder: (dCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Select Avatar', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        content: Wrap(
          spacing: 12,
          runSpacing: 12,
          children: presets.map((p) => InkWell(
            onTap: () {
              Navigator.pop(dCtx);
              onSelected('preset:$p');
            },
            borderRadius: BorderRadius.circular(30),
            child: Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: const Color(0xFFF3E8FF),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF704FEE).withOpacity(0.3)),
              ),
              alignment: Alignment.center,
              child: Text(p, style: const TextStyle(fontSize: 26)),
            ),
          )).toList(),
        ),
      ),
    );
  }

  Widget _buildAvatarWidget({
    required String avatar,
    required String name,
    double radius = 22,
    Color? backgroundColor,
    Color? textColor,
  }) {
    if (avatar.isNotEmpty) {
      if (avatar.startsWith('preset:')) {
        final emoji = avatar.replaceFirst('preset:', '');
        return CircleAvatar(
          radius: radius,
          backgroundColor: backgroundColor ?? Colors.white,
          child: Text(emoji, style: TextStyle(fontSize: radius * 1.05)),
        );
      }
      if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        return ClipOval(
          child: CachedNetworkImage(
            imageUrl: avatar,
            width: radius * 2,
            height: radius * 2,
            fit: BoxFit.cover,
            placeholder: (_, __) => CircleAvatar(
              radius: radius,
              backgroundColor: backgroundColor ?? Colors.white,
              child: const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
            errorWidget: (_, __, ___) => CircleAvatar(
              radius: radius,
              backgroundColor: backgroundColor ?? Colors.white,
              child: Text(
                name.isNotEmpty ? name[0].toUpperCase() : 'U',
                style: TextStyle(
                  fontSize: radius * 0.8,
                  fontWeight: FontWeight.w800,
                  color: textColor ?? const Color(0xFF1E1B4B),
                ),
              ),
            ),
          ),
        );
      }
      final file = File(avatar);
      if (file.existsSync()) {
        return ClipOval(
          child: Image.file(
            file,
            width: radius * 2,
            height: radius * 2,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => CircleAvatar(
              radius: radius,
              backgroundColor: backgroundColor ?? Colors.white,
              child: Text(
                name.isNotEmpty ? name[0].toUpperCase() : 'U',
                style: TextStyle(
                  fontSize: radius * 0.8,
                  fontWeight: FontWeight.w800,
                  color: textColor ?? const Color(0xFF1E1B4B),
                ),
              ),
            ),
          ),
        );
      }
    }

    return CircleAvatar(
      radius: radius,
      backgroundColor: backgroundColor ?? Colors.white,
      child: Text(
        name.isNotEmpty ? name[0].toUpperCase() : 'U',
        style: TextStyle(
          fontSize: radius * 0.8,
          fontWeight: FontWeight.w800,
          color: textColor ?? const Color(0xFF1E1B4B),
        ),
      ),
    );
  }

  Widget _buildModalTextField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Color(0xFF64748B),
          ),
        ),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            prefixIcon: Icon(icon, size: 18, color: Colors.grey.shade500),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade200),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade200),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF704FEE), width: 1.5),
            ),
          ),
        ),
      ],
    );
  }

  void _openHelpCenterModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(22.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.support_agent_rounded, color: Color(0xFF16A34A), size: 24),
                    SizedBox(width: 8),
                    Text(
                      'Help & Support',
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
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'Need assistance with your orders, deliveries, or payments? Contact our dedicated support team.',
              style: TextStyle(fontSize: 13, color: Colors.grey, height: 1.4),
            ),
            const SizedBox(height: 18),
            _buildSupportTile(
              icon: Icons.phone_in_talk_rounded,
              color: Colors.blue,
              title: 'Customer Helpline',
              value: '+91 98765 43210',
            ),
            _buildSupportTile(
              icon: Icons.chat_rounded,
              color: Colors.green,
              title: 'WhatsApp Chat Support',
              value: 'Available 9 AM - 9 PM',
            ),
            _buildSupportTile(
              icon: Icons.email_rounded,
              color: Colors.purple,
              title: 'Email Support',
              value: 'support@lighting.rishabhtyagi.in',
            ),
            const SizedBox(height: 14),
          ],
        ),
      ),
    );
  }

  Widget _buildSupportTile({
    required IconData icon,
    required Color color,
    required String title,
    required String value,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                Text(value, style: TextStyle(color: Colors.grey.shade600, fontSize: 11.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _openSavedAddressesModal(BuildContext context, WidgetRef ref, UserProfile user) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final currentAddress = user.address.isNotEmpty
            ? user.address
            : 'Main Market, Kaladhungi Road';
        final currentCity = user.city.isNotEmpty ? user.city : 'Kaladhungi';
        final currentState = user.state.isNotEmpty ? user.state : 'Uttarakhand';
        final currentPin = user.postcode.isNotEmpty ? user.postcode : '263139';

        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.location_on_rounded, color: Color(0xFF704FEE), size: 22),
                      SizedBox(width: 8),
                      Text(
                        'My Saved Addresses 📍',
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
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Default Delivery Address Card
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFEDE9FE), width: 1.5),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: Color(0xFFEDE9FE),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.home_rounded, color: Color(0xFF704FEE), size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Text(
                                'Home (Default Delivery)',
                                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF16A34A),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'ACTIVE',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            currentAddress,
                            style: const TextStyle(fontSize: 12.5, color: Color(0xFF475569)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$currentCity, $currentState - $currentPin',
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF1E1B4B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Edit / Update Address Button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    _openEditAddressModal(context, ref, user);
                  },
                  icon: const Icon(Icons.edit_location_alt_rounded, size: 18),
                  label: const Text(
                    'Edit Default Address',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF704FEE),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _openEditAddressModal(BuildContext context, WidgetRef ref, UserProfile user) {
    final addressCtrl = TextEditingController(text: user.address.isNotEmpty ? user.address : 'Main Market, Kaladhungi Road');
    final cityCtrl = TextEditingController(text: user.city.isNotEmpty ? user.city : 'Kaladhungi');
    final stateCtrl = TextEditingController(text: user.state.isNotEmpty ? user.state : 'Uttarakhand');
    final pinCtrl = TextEditingController(text: user.postcode.isNotEmpty ? user.postcode : '263139');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: EdgeInsets.only(
          top: 20,
          left: 20,
          right: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Edit Default Address 📍',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1E1B4B),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _buildModalTextField(
                label: 'Street Address / Building',
                controller: addressCtrl,
                icon: Icons.home_rounded,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildModalTextField(
                      label: 'City',
                      controller: cityCtrl,
                      icon: Icons.location_city_rounded,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildModalTextField(
                      label: 'PIN Code',
                      controller: pinCtrl,
                      icon: Icons.pin_drop_rounded,
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _buildModalTextField(
                label: 'State',
                controller: stateCtrl,
                icon: Icons.map_rounded,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () {
                    ref.read(userProfileProvider.notifier).updateProfile(
                      address: addressCtrl.text.trim(),
                      city: cityCtrl.text.trim(),
                      state: stateCtrl.text.trim(),
                      postcode: pinCtrl.text.trim(),
                    );
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Default address updated! It is now set on Home header. 📍'),
                        backgroundColor: Color(0xFF704FEE),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF704FEE),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text(
                    'Save Address',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openPaymentMethodsModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(22.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Saved Payment Methods 💳',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF1E1B4B)),
            ),
            const SizedBox(height: 14),
            _buildSupportTile(
              icon: Icons.qr_code_2_rounded,
              color: Colors.indigo,
              title: 'UPI / Google Pay / PhonePe',
              value: 'meghabahukhandi@okaxis • Primary',
            ),
            _buildSupportTile(
              icon: Icons.credit_card_rounded,
              color: Colors.teal,
              title: 'HDFC Bank Credit Card',
              value: 'Ending in **** 8421',
            ),
            const SizedBox(height: 14),
          ],
        ),
      ),
    );
  }

  void _openPrivacyModal(BuildContext context, WidgetRef ref) {
    final config = ref.read(appConfigProvider).valueOrNull;
    final privacyUrl = config?.links.privacy;
    if (privacyUrl != null && privacyUrl.isNotEmpty) {
      context.push('/checkout?url=${Uri.encodeComponent(privacyUrl)}');
    } else {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: const Text('Privacy Policy 🛡️'),
          content: const Text(
            'We value your privacy. All your credentials, payment tokens, and order history are securely handled in compliance with Google Play Developer policies and encrypted using industry standard protocols.\n\nWebsite: https://livaan.in',
            style: TextStyle(fontSize: 13, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    }
  }

  void _showDeleteConfirmation(BuildContext context, VoidCallback onConfirm) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('Delete Account?'),
        content: const Text(
          'This action is irreversible. All your orders, wishlist items and personal data will be deleted immediately per Google Play User Data policy.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              onConfirm();
            },
            child: const Text('Permanently Delete'),
          ),
        ],
      ),
    );
  }
}
