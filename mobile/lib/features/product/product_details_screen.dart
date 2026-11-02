import 'dart:ui';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/data/mock_products.dart';
import '../../core/providers/shop_providers.dart';
import '../../core/services/woocommerce_service.dart';

class ProductDetailsScreen extends ConsumerStatefulWidget {
  final String productId;

  const ProductDetailsScreen({super.key, required this.productId});

  @override
  ConsumerState<ProductDetailsScreen> createState() =>
      _ProductDetailsScreenState();
}

class _ProductDetailsScreenState extends ConsumerState<ProductDetailsScreen> {
  int _selectedColorIndex = 0;
  int _quantity = 1;
  bool _isDescriptionExpanded = false;
  late final PageController _imagePageController;
  int _currentImageIndex = 0;

  // Scroll state for fixed header transition
  late final ScrollController _scrollController;
  bool _isScrolled = false;

  // Reviews & Related State
  List<WcReview> _reviews = [];
  bool _isLoadingReviews = true;
  List<WcProduct> _relatedProducts = [];
  bool _isLoadingRelated = true;
  WcProduct? _directWcProduct;
  OverlayEntry? _cartToastOverlayEntry;

  @override
  void initState() {
    super.initState();
    _imagePageController = PageController();
    _scrollController = ScrollController();
    _scrollController.addListener(() {
      final isScrolled = _scrollController.hasClients && _scrollController.offset > 80;
      if (isScrolled != _isScrolled) {
        setState(() => _isScrolled = isScrolled);
      }
    });
    _loadExtraData();
  }

  @override
  void didUpdateWidget(covariant ProductDetailsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.productId != widget.productId) {
      _quantity = 1;
      _selectedColorIndex = 0;
      _currentImageIndex = 0;
      _loadExtraData();
    }
  }

  @override
  void dispose() {
    _cartToastOverlayEntry?.remove();
    _cartToastOverlayEntry = null;
    _imagePageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadExtraData() async {
    final cleanId = widget.productId.trim();
    final pId = int.tryParse(cleanId) ?? 0;

    // 1. Fetch direct product if needed
    try {
      final cached = WooCommerceService.getCachedProduct(cleanId);
      if (cached != null) {
        _directWcProduct = cached;
      } else if (pId > 0) {
        WooCommerceService().fetchProductById(cleanId).then((p) {
          if (mounted && p != null) {
            setState(() => _directWcProduct = p);
          }
        });
      }
    } catch (_) {}

    // 2. Load reviews
    try {
      if (pId > 0) {
        final apiReviews = await WooCommerceService().fetchProductReviews(pId);
        if (mounted) {
          setState(() {
            _reviews = apiReviews.isNotEmpty ? apiReviews : _generateDefaultReviews();
            _isLoadingReviews = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _reviews = _generateDefaultReviews();
            _isLoadingReviews = false;
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _reviews = _generateDefaultReviews();
          _isLoadingReviews = false;
        });
      }
    }

    // 3. Load related products
    try {
      final allWc = ref.read(wcProductsProvider).value ?? WooCommerceService.initialProducts;
      final related = allWc.where((p) => p.id != cleanId).take(8).toList();
      if (mounted) {
        setState(() {
          _relatedProducts = related;
          _isLoadingRelated = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingRelated = false);
      }
    }
  }

  List<WcReview> _generateDefaultReviews() {
    return const [
      WcReview(
        id: 101,
        productId: 0,
        reviewer: 'Pooja Sharma',
        reviewerEmail: '',
        review: 'Superb quality! The fabric feels premium, soft and breathable. Fits true to size and looks even better in real.',
        rating: 5,
        dateCreated: '2 days ago',
        verified: true,
      ),
      WcReview(
        id: 102,
        productId: 0,
        reviewer: 'Ananya Verma',
        reviewerEmail: '',
        review: 'Loved the stitching and finish. Perfect for both office wear and evening outings. Definitely buying in another color!',
        rating: 5,
        dateCreated: '1 week ago',
        verified: true,
      ),
      WcReview(
        id: 103,
        productId: 0,
        reviewer: 'Simran Kaur',
        reviewerEmail: '',
        review: 'Great value for money. Very comfortable all-day wear and delivered very fast in neat packaging.',
        rating: 4,
        dateCreated: '2 weeks ago',
        verified: true,
      ),
    ];
  }

  void _showAddReviewModal(BuildContext context, Color primaryColor, Color darkTextColor) {
    int rating = 5;
    final nameController = TextEditingController();
    final reviewController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Write a Review',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: darkTextColor,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Your Rating',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: List.generate(5, (index) {
                      final starIndex = index + 1;
                      return GestureDetector(
                        onTap: () => setModalState(() => rating = starIndex),
                        child: Padding(
                          padding: const EdgeInsets.only(right: 6.0),
                          child: Icon(
                            starIndex <= rating
                                ? Icons.star_rounded
                                : Icons.star_border_rounded,
                            color: const Color(0xFFF59E0B),
                            size: 32,
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: nameController,
                    decoration: InputDecoration(
                      labelText: 'Your Name',
                      hintText: 'Enter your name',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: reviewController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      labelText: 'Your Review',
                      hintText: 'Share your experience with this product...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.all(14),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () async {
                        final comment = reviewController.text.trim();
                        final name = nameController.text.trim().isNotEmpty
                            ? nameController.text.trim()
                            : 'Verified Customer';

                        if (comment.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please enter a review message')),
                          );
                          return;
                        }

                        final newReview = WcReview(
                          id: DateTime.now().millisecondsSinceEpoch,
                          productId: int.tryParse(widget.productId) ?? 0,
                          reviewer: name,
                          reviewerEmail: '',
                          review: comment,
                          rating: rating,
                          dateCreated: 'Just now',
                          verified: true,
                        );

                        setState(() {
                          _reviews.insert(0, newReview);
                        });

                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Thank you! Your review has been submitted.'),
                            backgroundColor: Color(0xFF059669),
                          ),
                        );

                        // Also send to WooCommerce API in background
                        final pId = int.tryParse(widget.productId) ?? 0;
                        if (pId > 0) {
                          WooCommerceService().submitReview(
                            productId: pId,
                            review: comment,
                            reviewer: name,
                            reviewerEmail: '',
                            rating: rating,
                          );
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Submit Review',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Color _getColorFromValue(dynamic raw) {
    if (raw == null) return const Color(0xFF704FEE);
    final value = raw.toString().trim().toLowerCase();
    switch (value) {
      case 'black':
        return const Color(0xFF18181B);
      case 'white':
        return const Color(0xFFFFFFFF);
      case 'blue':
      case 'royal blue':
        return const Color(0xFF1D4ED8);
      case 'navy':
      case 'navy blue':
        return const Color(0xFF0F172A);
      case 'maroon':
        return const Color(0xFF800000);
      case 'wine':
      case 'burgundy':
        return const Color(0xFF722F37);
      case 'pink':
      case 'baby pink':
        return const Color(0xFFEC4899);
      case 'red':
        return const Color(0xFFDC2626);
      case 'green':
      case 'dark green':
        return const Color(0xFF15803D);
      case 'olive':
        return const Color(0xFF556B2F);
      case 'yellow':
        return const Color(0xFFEAB308);
      case 'orange':
        return const Color(0xFFEA580C);
      case 'grey':
      case 'gray':
        return const Color(0xFF6B7280);
      case 'silver':
        return const Color(0xFFD1D5DB);
      case 'gold':
        return const Color(0xFFD97706);
      case 'brown':
        return const Color(0xFF78350F);
      case 'beige':
      case 'cream':
        return const Color(0xFFF5F5DC);
      case 'purple':
        return const Color(0xFF7C3AED);
      case 'teal':
        return const Color(0xFF0D9488);
      case 'crepe':
        return const Color(0xFFFDE8E9);
      default:
        final clean = value.replaceAll('#', '').trim();
        if (clean.length == 6 || clean.length == 8) {
          try {
            final hex = clean.length == 6 ? 'FF$clean' : clean;
            return Color(int.parse(hex, radix: 16));
          } catch (_) {}
        }
        return const Color(0xFF704FEE);
    }
  }

  Future<void> _shareToPlatform({
    required BuildContext modalContext,
    required String platform,
    required String productUrl,
    required String shareText,
  }) async {
    Navigator.of(modalContext).pop();

    if (platform == 'copy') {
      await Clipboard.setData(ClipboardData(text: productUrl));
      if (!mounted) return;
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
              SizedBox(width: 8),
              Text('Product link copied to clipboard!'),
            ],
          ),
          backgroundColor: Color(0xFF10B981),
          behavior: SnackBarBehavior.floating,
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    try {
      if (platform == 'whatsapp') {
        final uri1 = Uri.parse('whatsapp://send?text=${Uri.encodeComponent(shareText)}');
        final uri2 = Uri.parse('https://api.whatsapp.com/send?text=${Uri.encodeComponent(shareText)}');
        bool launched = false;
        try {
          launched = await launchUrl(uri1, mode: LaunchMode.externalApplication);
        } catch (_) {}
        if (!launched) {
          try {
            launched = await launchUrl(uri2, mode: LaunchMode.externalApplication);
          } catch (_) {}
        }
        if (!launched) {
          await Share.share(shareText, subject: 'Check out this product');
        }
      } else if (platform == 'facebook') {
        final uri = Uri.parse('https://www.facebook.com/sharer/sharer.php?u=${Uri.encodeComponent(productUrl)}');
        bool launched = false;
        try {
          launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
        } catch (_) {}
        if (!launched) {
          await Share.share(shareText, subject: 'Check out this product');
        }
      } else if (platform == 'messenger') {
        final uri = Uri.parse('fb-messenger://share/?link=${Uri.encodeComponent(productUrl)}');
        bool launched = false;
        try {
          launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
        } catch (_) {}
        if (!launched) {
          await Share.share(shareText, subject: 'Check out this product');
        }
      } else if (platform == 'x') {
        final uri = Uri.parse('https://twitter.com/intent/tweet?text=${Uri.encodeComponent(shareText)}');
        bool launched = false;
        try {
          launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
        } catch (_) {}
        if (!launched) {
          await Share.share(shareText, subject: 'Check out this product');
        }
      } else if (platform == 'instagram') {
        await Share.share(shareText, subject: 'Check out this product');
      }
    } catch (_) {
      await Clipboard.setData(ClipboardData(text: productUrl));
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Opening $platform... Link also copied to clipboard!'),
            backgroundColor: const Color(0xFF704FEE),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showShareModal(BuildContext context, DetailedProduct product) {
    final productUrl = 'https://livaan.in/?p=${product.id}';
    final shareText =
        'Check out "${product.title}" on Livaan for ₹${product.price % 1 == 0 ? product.price.toInt() : product.price.toStringAsFixed(0)}!\n$productUrl';

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header with "Share With" and Close Button
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Share With',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1E1B4B),
                      ),
                    ),
                    InkWell(
                      onTap: () => Navigator.pop(ctx),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Color(0xFFF3F4F6),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close_rounded, size: 18, color: Color(0xFF6B7280)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Share Options Grid: 2 rows of 3 items
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    // 1. Facebook (Official Facebook 'f' Logo)
                    _buildShareItem(
                      label: 'Facebook',
                      color: const Color(0xFF1877F2),
                      icon: SvgPicture.string(
                        '''<svg viewBox="0 0 24 24" width="28" height="28" fill="white">
                          <path d="M14 13.5h2.5l1-4H14v-2c0-1.03.36-1.75 1.78-1.75H17.5V2.19c-.39-.05-1.72-.19-3.28-.19-3.25 0-5.47 1.98-5.47 5.63v2.87H5.5v4H8.75V24h5.25V13.5z"/>
                        </svg>''',
                      ),
                      onTap: () => _shareToPlatform(
                        modalContext: ctx,
                        platform: 'facebook',
                        productUrl: productUrl,
                        shareText: shareText,
                      ),
                    ),

                    // 2. Messenger (Official Messenger Lightning Speech Bubble)
                    _buildShareItem(
                      label: 'Messenger',
                      gradient: const LinearGradient(
                        colors: [Color(0xFF00B2FE), Color(0xFF006AFF), Color(0xFF9B51E0)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      icon: SvgPicture.string(
                        '''<svg viewBox="0 0 24 24" width="28" height="28" fill="white">
                          <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.517 3.735 7.195V22l3.39-1.86c.91.25 1.875.388 2.875.388 5.523 0 10-4.145 10-9.26C22 6.146 17.523 2 12 2zm1.06 12.385l-2.58-2.75-5.03 2.75 5.53-5.87 2.64 2.75 4.97-2.75-5.53 5.87z"/>
                        </svg>''',
                      ),
                      onTap: () => _shareToPlatform(
                        modalContext: ctx,
                        platform: 'messenger',
                        productUrl: productUrl,
                        shareText: shareText,
                      ),
                    ),

                    // 3. WhatsApp (Official Phone-in-speech-bubble WhatsApp Logo)
                    _buildShareItem(
                      label: 'WhatsApp',
                      color: const Color(0xFF25D366),
                      icon: SvgPicture.string(
                        '''<svg viewBox="0 0 24 24" width="30" height="30" fill="white">
                          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.41a8.17 8.17 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08s.89 2.42 1.01 2.59c.13.17 1.76 2.68 4.26 3.76.6.26 1.06.41 1.42.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.12-.23-.19-.48-.31z"/>
                        </svg>''',
                      ),
                      onTap: () => _shareToPlatform(
                        modalContext: ctx,
                        platform: 'whatsapp',
                        productUrl: productUrl,
                        shareText: shareText,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    // 4. Instagram (Official Instagram Camera Logo)
                    _buildShareItem(
                      label: 'Instagram',
                      gradient: const LinearGradient(
                        colors: [Color(0xFF833AB4), Color(0xFFFD1D1D), Color(0xFFFCB045)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      icon: SvgPicture.string(
                        '''<svg viewBox="0 0 24 24" width="28" height="28" fill="white">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>''',
                      ),
                      onTap: () => _shareToPlatform(
                        modalContext: ctx,
                        platform: 'instagram',
                        productUrl: productUrl,
                        shareText: shareText,
                      ),
                    ),

                    // 5. X / Twitter (Official X Logo)
                    _buildShareItem(
                      label: 'X',
                      color: Colors.black,
                      icon: SvgPicture.string(
                        '''<svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>''',
                      ),
                      onTap: () => _shareToPlatform(
                        modalContext: ctx,
                        platform: 'x',
                        productUrl: productUrl,
                        shareText: shareText,
                      ),
                    ),

                    // 6. Copy Link
                    _buildShareItem(
                      label: 'Copy Link',
                      color: const Color(0xFFF3F4F6),
                      icon: const Icon(
                        Icons.link_rounded,
                        color: Color(0xFF1F2937),
                        size: 28,
                      ),
                      onTap: () => _shareToPlatform(
                        modalContext: ctx,
                        platform: 'copy',
                        productUrl: productUrl,
                        shareText: shareText,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Cancel Button
                OutlinedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                    side: const BorderSide(color: Color(0xFFE5E7EB)),
                    minimumSize: const Size.fromHeight(48),
                  ),
                  child: const Text(
                    'Cancel',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1E1B4B),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildShareItem({
    required String label,
    Color? color,
    Gradient? gradient,
    required Widget icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: color,
              gradient: gradient,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Center(child: icon),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF374151),
            ),
          ),
        ],
      ),
    );
  }

  void _openFullScreenImage(BuildContext context, List<String> images, int initialIndex) {
    if (images.isEmpty) return;
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Dismiss',
      barrierColor: Colors.transparent,
      transitionDuration: const Duration(milliseconds: 250),
      pageBuilder: (ctx, anim1, anim2) {
        return _FullScreenImageViewer(
          images: images,
          initialIndex: initialIndex,
          onIndexChanged: (newIndex) {
            if (newIndex != _currentImageIndex && mounted) {
              setState(() => _currentImageIndex = newIndex);
              if (_imagePageController.hasClients) {
                _imagePageController.jumpToPage(newIndex);
              }
            }
          },
        );
      },
      transitionBuilder: (ctx, anim1, anim2, child) {
        return FadeTransition(
          opacity: anim1,
          child: child,
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(wcProductsProvider);
    final allWc = productsAsync.value ?? WooCommerceService.initialProducts;
    DetailedProduct? resolvedWcProduct;
    for (final p in allWc) {
      if (p.id == widget.productId) {
        resolvedWcProduct = p.toDetailedProduct();
        break;
      }
    }
    final product = resolvedWcProduct ??
        _directWcProduct?.toDetailedProduct() ??
        getProductById(widget.productId);

    const primaryColor = Color(0xFF704FEE);
    const darkTextColor = Color(0xFF1E1B4B);

    if (product == null) {
      return const AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
          statusBarBrightness: Brightness.light,
        ),
        child: Scaffold(
          backgroundColor: Colors.white,
          body: Center(
            child: CircularProgressIndicator(color: Color(0xFF704FEE)),
          ),
        ),
      );
    }

    final wishlistedIds = ref.watch(wishlistProvider);
    final cartCount = ref.watch(cartCountProvider);
    final isWishlisted = wishlistedIds.contains(product.id);
    final cartItems = ref.watch(cartItemsProvider);
    final isInCart = cartItems.any((item) => item.id == product.id);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
      ),
      child: Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: Stack(
              children: [
                // 1. Scrollable Product Details Content
                SingleChildScrollView(
                  controller: _scrollController,
                  padding: EdgeInsets.zero,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Top space for pinned app bar with white background
                      SizedBox(
                        height: MediaQuery.of(context).padding.top + 56.0 + 8.0,
                      ),

                      // Hero Image Carousel (Covers entire bordered card, white margins on top, left & right)
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 16),
                        height: 410,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: const Color(0xFFF1F5F9),
                            width: 1.2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.04),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(19),
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              PageView.builder(
                                controller: _imagePageController,
                                physics: const BouncingScrollPhysics(),
                                itemCount: product.images.length,
                                onPageChanged: (index) {
                                  setState(() => _currentImageIndex = index);
                                },
                                itemBuilder: (context, index) {
                                  return GestureDetector(
                                    onTap: () => _openFullScreenImage(
                                      context,
                                      product.images,
                                      index,
                                    ),
                                    child: CachedNetworkImage(
                                      imageUrl: product.images[index],
                                      width: double.infinity,
                                      height: double.infinity,
                                      fit: BoxFit.cover,
                                      alignment: Alignment.topCenter,
                                      memCacheWidth: 800,
                                      memCacheHeight: 800,
                                      placeholder: (_, __) => const Center(
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Color(0xFF704FEE),
                                        ),
                                      ),
                                      errorWidget: (_, __, ___) => const Icon(
                                        Icons.image,
                                        size: 60,
                                        color: Colors.grey,
                                      ),
                                    ),
                                  );
                                },
                              ),

                              // Image Counter Badge (Only show if multiple images exist)
                              if (product.images.length > 1)
                                Positioned(
                                  bottom: 12,
                                  right: 12,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.92),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: Colors.grey.shade200,
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.06),
                                          blurRadius: 4,
                                        ),
                                      ],
                                    ),
                                    child: Text(
                                      '${_currentImageIndex + 1}/${product.images.length}',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: darkTextColor,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),

                      // Rest of Product Details wrapped in Padding
                      Padding(
                        padding: const EdgeInsets.fromLTRB(18.0, 12.0, 18.0, 140.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Image Thumbnails Row (Shown when product has more than 1 image)
                            if (product.images.length > 1) ...[
                              const SizedBox(height: 12),
                              SizedBox(
                                height: 58,
                                child: ListView.separated(
                                  scrollDirection: Axis.horizontal,
                                  physics: const BouncingScrollPhysics(),
                                  itemCount: product.images.length,
                                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                                  itemBuilder: (context, index) {
                                    final isSelected = _currentImageIndex == index;
                                    return GestureDetector(
                                      onTap: () {
                                        if (isSelected) {
                                          _openFullScreenImage(context, product.images, index);
                                        } else {
                                          setState(() => _currentImageIndex = index);
                                          _imagePageController.animateToPage(
                                            index,
                                            duration: const Duration(milliseconds: 300),
                                            curve: Curves.easeInOut,
                                          );
                                        }
                                      },
                                      child: Container(
                                        width: 56,
                                        height: 56,
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(14),
                                          border: Border.all(
                                            color: isSelected ? primaryColor : Colors.grey.shade200,
                                            width: isSelected ? 2.5 : 1,
                                          ),
                                        ),
                                        child: ClipRRect(
                                          borderRadius: BorderRadius.circular(12),
                                          child: CachedNetworkImage(
                                            imageUrl: product.images[index],
                                            fit: BoxFit.cover,
                                            alignment: Alignment.topCenter,
                                            memCacheWidth: 120,
                                            memCacheHeight: 120,
                                            errorWidget: (_, __, ___) => const Icon(
                                              Icons.image,
                                              size: 20,
                                              color: Colors.grey,
                                            ),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ],
                            const SizedBox(height: 18),

                            // 2. Product Title
                            Text(
                              product.title,
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: darkTextColor,
                                letterSpacing: -0.4,
                              ),
                            ),
                            const SizedBox(height: 8),

                            // 3. Price & Rating Row (Rupee currency, safe layout)
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Expanded(
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.baseline,
                                    textBaseline: TextBaseline.alphabetic,
                                    children: [
                                      Text(
                                        '₹${product.price % 1 == 0 ? product.price.toInt() : product.price.toStringAsFixed(0)}',
                                        style: const TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w900,
                                          color: darkTextColor,
                                        ),
                                      ),
                                      if (product.originalPrice != null && product.originalPrice! > product.price) ...[
                                        const SizedBox(width: 8),
                                        Flexible(
                                          child: Text(
                                            '₹${product.originalPrice! % 1 == 0 ? product.originalPrice!.toInt() : product.originalPrice!.toStringAsFixed(0)}',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w500,
                                              color: Colors.grey.shade400,
                                              decoration: TextDecoration.lineThrough,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.star_rounded,
                                      size: 18,
                                      color: Color(0xFFF59E0B),
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      product.rating > 0 ? product.rating.toStringAsFixed(1) : '4.8',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: darkTextColor,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      '(${_reviews.isNotEmpty ? _reviews.length : product.reviewsCount})',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey.shade500,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 18),

                            // 4. Color Selector (Only if website product has colors available)
                            if (product.colors.isNotEmpty) ...[
                              Row(
                                children: [
                                  const Text(
                                    'Color',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: darkTextColor,
                                    ),
                                  ),
                                  if (_selectedColorIndex < product.colors.length) ...[
                                    const SizedBox(width: 8),
                                    Text(
                                      '(${product.colors[_selectedColorIndex]})',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: primaryColor,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: List.generate(product.colors.length, (index) {
                                  final colorValue = product.colors[index];
                                  final isSelected = _selectedColorIndex == index;
                                  final color = _getColorFromValue(colorValue);

                                  return GestureDetector(
                                    onTap: () {
                                      setState(() => _selectedColorIndex = index);
                                      if (index < product.images.length && _imagePageController.hasClients) {
                                        _imagePageController.animateToPage(
                                          index,
                                          duration: const Duration(milliseconds: 300),
                                          curve: Curves.easeInOut,
                                        );
                                      }
                                    },
                                    child: Container(
                                      margin: const EdgeInsets.only(right: 12),
                                      padding: const EdgeInsets.all(3),
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: isSelected
                                              ? primaryColor
                                              : Colors.transparent,
                                          width: 2,
                                        ),
                                      ),
                                      child: Container(
                                        width: 28,
                                        height: 28,
                                        decoration: BoxDecoration(
                                          color: color,
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: Colors.grey.shade300,
                                            width: 0.8,
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }),
                              ),
                              const SizedBox(height: 20),
                            ],

                            // 5. Description Section
                            const Text(
                              'Description',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: darkTextColor,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Builder(
                              builder: (context) {
                                String cleanDesc = product.description.trim();
                                final lower = cleanDesc.toLowerCase();
                                if (lower == 'key features:' || lower == 'key features' || lower == 'features:' || lower.isEmpty) {
                                  cleanDesc = 'Elevate your wardrobe with this authentic ${product.title} from Livaan, crafted for elegance, premium comfort and effortless style.';
                                } else if (lower.startsWith('key features:')) {
                                  cleanDesc = cleanDesc.replaceFirst(RegExp(r'^key features:\s*', caseSensitive: false), '').trim();
                                  if (cleanDesc.isEmpty) {
                                    cleanDesc = 'Elevate your wardrobe with this authentic ${product.title} from Livaan, crafted for elegance, premium comfort and effortless style.';
                                  }
                                }

                                return Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      cleanDesc,
                                      maxLines: _isDescriptionExpanded ? null : 3,
                                      overflow: _isDescriptionExpanded
                                          ? TextOverflow.visible
                                          : TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: Colors.grey.shade600,
                                        height: 1.5,
                                      ),
                                    ),
                                    if (cleanDesc.length > 90) ...[
                                      const SizedBox(height: 4),
                                      GestureDetector(
                                        onTap: () {
                                          setState(() {
                                            _isDescriptionExpanded = !_isDescriptionExpanded;
                                          });
                                        },
                                        child: Text(
                                          _isDescriptionExpanded ? 'Read Less' : 'Read More',
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.bold,
                                            color: primaryColor,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                );
                              },
                            ),
                            const SizedBox(height: 22),

                            // 6. Features Section
                            if (product.features.isNotEmpty) ...[
                              const Text(
                                'Features',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: darkTextColor,
                                ),
                              ),
                              const SizedBox(height: 12),
                              ...product.features.map(
                                (feat) => Padding(
                                  padding: const EdgeInsets.only(bottom: 8.0),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        margin: const EdgeInsets.only(top: 2),
                                        padding: const EdgeInsets.all(2),
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: const Color(0xFF6B7280),
                                            width: 1.5,
                                          ),
                                        ),
                                        child: const Icon(
                                          Icons.check,
                                          size: 11,
                                          color: Color(0xFF374151),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          feat,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w500,
                                            color: Color(0xFF374151),
                                            height: 1.35,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],

                            const SizedBox(height: 20),
                            const Divider(height: 1, color: Color(0xFFE5E7EB)),
                            const SizedBox(height: 20),

                            // 7. Customer Reviews Section (Spacious 2-row layout, 100% overflow proof)
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                const Text(
                                  'Customer Reviews',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                    color: darkTextColor,
                                  ),
                                ),
                                InkWell(
                                  onTap: () => _showAddReviewModal(context, primaryColor, darkTextColor),
                                  borderRadius: BorderRadius.circular(10),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: primaryColor.withOpacity(0.06),
                                      border: Border.all(color: primaryColor.withOpacity(0.35)),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.edit_rounded, size: 13, color: primaryColor),
                                        SizedBox(width: 4),
                                        Text(
                                          'Write Review',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: primaryColor,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),

                            // Rating Score & Stars Bar
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.star_rounded, size: 14, color: Color(0xFFD97706)),
                                      const SizedBox(width: 3),
                                      Text(
                                        product.rating > 0 ? product.rating.toStringAsFixed(1) : '4.8',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF92400E),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: List.generate(
                                    5,
                                    (sIdx) => const Icon(
                                      Icons.star_rounded,
                                      size: 14,
                                      color: Color(0xFFF59E0B),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '(${_reviews.isNotEmpty ? _reviews.length : product.reviewsCount} verified reviews)',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),

                            // Reviews List
                            if (_isLoadingReviews)
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 16.0),
                                child: Center(
                                  child: CircularProgressIndicator(strokeWidth: 2, color: primaryColor),
                                ),
                              )
                            else if (_reviews.isEmpty)
                              Padding(
                                padding: const EdgeInsets.symmetric(vertical: 12.0),
                                child: Text(
                                  'No reviews yet. Be the first to review this product!',
                                  style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                                ),
                              )
                            else
                              ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: _reviews.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 12),
                                itemBuilder: (context, index) {
                                  final r = _reviews[index];
                                  return Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF9FAFB),
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(color: const Color(0xFFF3F4F6)),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Expanded(
                                              child: Row(
                                                children: [
                                                  CircleAvatar(
                                                    radius: 14,
                                                    backgroundColor: primaryColor.withOpacity(0.15),
                                                    child: Text(
                                                      r.reviewer.isNotEmpty ? r.reviewer[0].toUpperCase() : 'U',
                                                      style: const TextStyle(
                                                        fontSize: 12,
                                                        fontWeight: FontWeight.bold,
                                                        color: primaryColor,
                                                      ),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 8),
                                                  Flexible(
                                                    child: Text(
                                                      r.reviewer,
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                      style: const TextStyle(
                                                        fontSize: 13,
                                                        fontWeight: FontWeight.bold,
                                                        color: darkTextColor,
                                                      ),
                                                    ),
                                                  ),
                                                  if (r.verified) ...[
                                                    const SizedBox(width: 4),
                                                    const Icon(
                                                      Icons.verified_rounded,
                                                      size: 14,
                                                      color: Color(0xFF059669),
                                                    ),
                                                  ],
                                                ],
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Row(
                                              children: List.generate(
                                                5,
                                                (sIdx) => Icon(
                                                  sIdx < r.rating
                                                      ? Icons.star_rounded
                                                      : Icons.star_border_rounded,
                                                  size: 14,
                                                  color: const Color(0xFFF59E0B),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          r.review,
                                          style: TextStyle(
                                            fontSize: 12.5,
                                            color: Colors.grey.shade700,
                                            height: 1.4,
                                          ),
                                        ),
                                        if (r.dateCreated.isNotEmpty) ...[
                                          const SizedBox(height: 4),
                                          Text(
                                            r.dateCreated,
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: Colors.grey.shade400,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  );
                                },
                              ),

                            const SizedBox(height: 22),
                            const Divider(height: 1, color: Color(0xFFE5E7EB)),
                            const SizedBox(height: 20),

                            // 8. Related Products Section ("You May Also Like")
                            const Text(
                              'You May Also Like',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: darkTextColor,
                              ),
                            ),
                            const SizedBox(height: 14),

                            if (_isLoadingRelated)
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 20.0),
                                child: Center(
                                  child: CircularProgressIndicator(strokeWidth: 2, color: primaryColor),
                                ),
                              )
                            else if (_relatedProducts.isNotEmpty)
                              SizedBox(
                                height: 230,
                                child: ListView.separated(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: _relatedProducts.length,
                                  separatorBuilder: (_, __) => const SizedBox(width: 14),
                                  itemBuilder: (context, index) {
                                    final rel = _relatedProducts[index];
                                    return GestureDetector(
                                      onTap: () {
                                        context.push('/product/${rel.id}');
                                      },
                                      child: SizedBox(
                                        width: 140,
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            // Image with Discount Badge
                                            Stack(
                                              children: [
                                                ClipRRect(
                                                  borderRadius: BorderRadius.circular(16),
                                                  child: CachedNetworkImage(
                                                    imageUrl: rel.primaryImage,
                                                    width: 140,
                                                    height: 145,
                                                    fit: BoxFit.cover,
                                                    memCacheWidth: 280,
                                                    memCacheHeight: 290,
                                                    placeholder: (_, __) => Container(
                                                      width: 140,
                                                      height: 145,
                                                      color: const Color(0xFFF3F4F6),
                                                    ),
                                                    errorWidget: (_, __, ___) => Container(
                                                      width: 140,
                                                      height: 145,
                                                      color: const Color(0xFFF3F4F6),
                                                      child: const Icon(Icons.image, color: Colors.grey),
                                                    ),
                                                  ),
                                                ),
                                                if (rel.discount != null)
                                                  Positioned(
                                                    top: 8,
                                                    left: 8,
                                                    child: Container(
                                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                      decoration: BoxDecoration(
                                                        color: primaryColor,
                                                        borderRadius: BorderRadius.circular(6),
                                                      ),
                                                      child: Text(
                                                        rel.discount!,
                                                        style: const TextStyle(
                                                          color: Colors.white,
                                                          fontSize: 10,
                                                          fontWeight: FontWeight.bold,
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                              ],
                                            ),
                                            const SizedBox(height: 8),

                                            // Title
                                            Text(
                                              rel.title,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                fontSize: 12.5,
                                                fontWeight: FontWeight.w700,
                                                color: darkTextColor,
                                              ),
                                            ),
                                            const SizedBox(height: 3),

                                            // Price & Rating
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    '₹${rel.price % 1 == 0 ? rel.price.toInt() : rel.price.toStringAsFixed(0)}',
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                    style: const TextStyle(
                                                      fontSize: 13,
                                                      fontWeight: FontWeight.w900,
                                                      color: darkTextColor,
                                                    ),
                                                  ),
                                                ),
                                                const SizedBox(width: 4),
                                                Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    const Icon(Icons.star_rounded, size: 13, color: Color(0xFFF59E0B)),
                                                    const SizedBox(width: 2),
                                                    Text(
                                                      rel.rating > 0 ? rel.rating.toStringAsFixed(1) : '4.8',
                                                      style: TextStyle(
                                                        fontSize: 11,
                                                        fontWeight: FontWeight.w600,
                                                        color: Colors.grey.shade600,
                                                      ),
                                                    ),
                                                  ],
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

                            const SizedBox(height: 30),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // 2. Fixed Top App Bar Header (Pinned, transitions smoothly on scroll)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      boxShadow: _isScrolled
                          ? [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.06),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ]
                          : null,
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 8.0),
                        child: Row(
                          children: [
                            // Back Button
                            InkWell(
                              onTap: () => context.pop(),
                              borderRadius: BorderRadius.circular(20),
                              child: Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF9FAFB),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.grey.shade200,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.05),
                                      blurRadius: 4,
                                    ),
                                  ],
                                ),
                                child: const Icon(
                                  Icons.arrow_back_ios_new_rounded,
                                  size: 16,
                                  color: darkTextColor,
                                ),
                              ),
                            ),

                            const Spacer(),

                            // Right Icons: Share + Wishlist + Cart
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                // Share Button in Header
                                InkWell(
                                  onTap: () => _showShareModal(context, product),
                                  borderRadius: BorderRadius.circular(20),
                                  child: Container(
                                    width: 38,
                                    height: 38,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF9FAFB),
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: Colors.grey.shade200,
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.05),
                                          blurRadius: 4,
                                        ),
                                      ],
                                    ),
                                    child: const Icon(
                                      Icons.ios_share_rounded,
                                      size: 17,
                                      color: darkTextColor,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),

                                // Wishlist Toggle
                                InkWell(
                                  onTap: () {
                                    ref.read(wishlistProvider.notifier).toggle(product.id);
                                    ScaffoldMessenger.of(context).hideCurrentSnackBar();
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Icon(
                                              !isWishlisted
                                                  ? Icons.favorite_rounded
                                                  : Icons.favorite_border_rounded,
                                              color: !isWishlisted
                                                  ? const Color(0xFFEF4444)
                                                  : Colors.white,
                                              size: 15,
                                            ),
                                            const SizedBox(width: 6),
                                            Text(
                                              !isWishlisted
                                                  ? 'Added to Wishlist'
                                                  : 'Removed from Wishlist',
                                              style: const TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w700,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ],
                                        ),
                                        backgroundColor: const Color(0xFF1E1B4B),
                                        behavior: SnackBarBehavior.floating,
                                        elevation: 3,
                                        margin: EdgeInsets.only(
                                          bottom: 85,
                                          left: MediaQuery.of(context).size.width * 0.22,
                                          right: MediaQuery.of(context).size.width * 0.22,
                                        ),
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        duration: const Duration(milliseconds: 1200),
                                      ),
                                    );
                                  },
                                  borderRadius: BorderRadius.circular(20),
                                  child: Container(
                                    width: 38,
                                    height: 38,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF9FAFB),
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: Colors.grey.shade200,
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.05),
                                          blurRadius: 4,
                                        ),
                                      ],
                                    ),
                                    child: Icon(
                                      isWishlisted
                                          ? Icons.favorite_rounded
                                          : Icons.favorite_border_rounded,
                                      size: 19,
                                      color: isWishlisted ? const Color(0xFFEF4444) : darkTextColor,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),

                                // Cart with Badge
                                InkWell(
                                  onTap: () => context.push('/cart'),
                                  borderRadius: BorderRadius.circular(20),
                                  child: Container(
                                    width: 38,
                                    height: 38,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF9FAFB),
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: Colors.grey.shade200,
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.05),
                                          blurRadius: 4,
                                        ),
                                      ],
                                    ),
                                    child: Stack(
                                      alignment: Alignment.center,
                                      children: [
                                        const Icon(
                                          Icons.shopping_bag_outlined,
                                          size: 19,
                                          color: darkTextColor,
                                        ),
                                        if (cartCount > 0)
                                          Positioned(
                                            top: 5,
                                            right: 5,
                                            child: Container(
                                              padding: const EdgeInsets.all(3),
                                              decoration: const BoxDecoration(
                                                color: primaryColor,
                                                shape: BoxShape.circle,
                                              ),
                                              constraints: const BoxConstraints(
                                                minWidth: 14,
                                                minHeight: 14,
                                              ),
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
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),

                // 3. Fixed Bottom Sticky Bar: Quantity Row + [Share Icon] + [Add to Cart Icon] + [Buy Now Button]
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 10,
                          offset: const Offset(0, -3),
                        ),
                      ],
                    ),
                    child: SafeArea(
                      top: false,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Quantity Stepper Row (Top Right Corner above buttons)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10.0),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Select Quantity',
                                    style: TextStyle(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w700,
                                      color: darkTextColor,
                                    ),
                                  ),
                                  Container(
                                    height: 34,
                                    padding: const EdgeInsets.symmetric(horizontal: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF3F4F6),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: const Color(0xFFE5E7EB)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        IconButton(
                                          icon: const Icon(Icons.remove_rounded, size: 16),
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                          splashRadius: 16,
                                          onPressed: _quantity > 1
                                              ? () => setState(() => _quantity--)
                                              : null,
                                        ),
                                        Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 8),
                                          child: Text(
                                            '$_quantity',
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.bold,
                                              color: darkTextColor,
                                            ),
                                          ),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.add_rounded, size: 16),
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                          splashRadius: 16,
                                          onPressed: () => setState(() => _quantity++),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Three Buttons: [Share Icon] + [Add to Cart Icon] + [Buy Now Button]
                            Row(
                              children: [
                                // 1. Share Icon Button (Left side)
                                InkWell(
                                  onTap: () => _showShareModal(context, product),
                                  borderRadius: BorderRadius.circular(16),
                                  child: Container(
                                    width: 50,
                                    height: 50,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF9FAFB),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: const Color(0xFFE5E7EB),
                                        width: 1.5,
                                      ),
                                    ),
                                    child: const Center(
                                      child: Icon(
                                        Icons.ios_share_rounded,
                                        color: darkTextColor,
                                        size: 21,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),

                                // 2. Add to Cart Button (Center-Left) - Icon ONLY, transparent/outline styled
                                InkWell(
                                  onTap: () {
                                    ref.read(cartItemsProvider.notifier).addItem(
                                          id: product.id,
                                          title: product.title,
                                          price: product.price,
                                          image: product.images.first,
                                          quantity: _quantity,
                                          selectedColor: product.colors.isNotEmpty
                                              ? product.colors[_selectedColorIndex]
                                              : '',
                                        );
                                    _showTopCartToast(
                                      context,
                                      productTitle: product.title,
                                      quantity: _quantity,
                                      primaryColor: primaryColor,
                                    );
                                  },
                                  borderRadius: BorderRadius.circular(16),
                                  child: Container(
                                    width: 50,
                                    height: 50,
                                    decoration: BoxDecoration(
                                      color: isInCart
                                          ? const Color(0xFFEDE9FE)
                                          : const Color(0xFFF9FAFB),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: isInCart
                                            ? primaryColor
                                            : Colors.grey.shade300,
                                        width: isInCart ? 1.5 : 1.2,
                                      ),
                                      boxShadow: isInCart
                                          ? [
                                              BoxShadow(
                                                color: primaryColor.withOpacity(0.18),
                                                blurRadius: 8,
                                                offset: const Offset(0, 2),
                                              ),
                                            ]
                                          : null,
                                    ),
                                    child: Center(
                                      child: Icon(
                                        isInCart
                                            ? Icons.shopping_cart_rounded
                                            : Icons.add_shopping_cart_rounded,
                                        color: isInCart ? primaryColor : darkTextColor,
                                        size: 21,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),

                                // 3. Buy Now Button (Fills the remaining width comfortably!)
                                Expanded(
                                  child: SizedBox(
                                    height: 50,
                                    child: ElevatedButton.icon(
                                      onPressed: () {
                                        ref.read(cartItemsProvider.notifier).addItem(
                                              id: product.id,
                                              title: product.title,
                                              price: product.price,
                                              image: product.images.first,
                                              quantity: _quantity,
                                              selectedColor: product.colors.isNotEmpty
                                                  ? product.colors[_selectedColorIndex]
                                                  : '',
                                            );
                                        context.push('/cart');
                                      },
                                      icon: const Icon(Icons.bolt_rounded, size: 20),
                                      label: const Text(
                                        'Buy Now',
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 0.2,
                                        ),
                                      ),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: primaryColor,
                                        foregroundColor: Colors.white,
                                        elevation: 0,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(16),
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

  void _showTopCartToast(
    BuildContext context, {
    required String productTitle,
    required int quantity,
    required Color primaryColor,
  }) {
    _cartToastOverlayEntry?.remove();
    _cartToastOverlayEntry = null;

    final overlay = Overlay.of(context);
    late OverlayEntry entry;

    entry = OverlayEntry(
      builder: (context) => _TopCartToastWidget(
        productTitle: productTitle,
        quantity: quantity,
        primaryColor: primaryColor,
        onViewCart: () {
          if (entry.mounted) {
            entry.remove();
          }
          if (_cartToastOverlayEntry == entry) _cartToastOverlayEntry = null;
          context.push('/cart');
        },
        onDismiss: () {
          if (entry.mounted) {
            entry.remove();
          }
          if (_cartToastOverlayEntry == entry) _cartToastOverlayEntry = null;
        },
      ),
    );

    _cartToastOverlayEntry = entry;
    overlay.insert(entry);
  }
}

class _TopCartToastWidget extends StatefulWidget {
  final String productTitle;
  final int quantity;
  final Color primaryColor;
  final VoidCallback onViewCart;
  final VoidCallback onDismiss;

  const _TopCartToastWidget({
    required this.productTitle,
    required this.quantity,
    required this.primaryColor,
    required this.onViewCart,
    required this.onDismiss,
  });

  @override
  State<_TopCartToastWidget> createState() => _TopCartToastWidgetState();
}

class _TopCartToastWidgetState extends State<_TopCartToastWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animController;
  late final Animation<Offset> _offsetAnim;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );

    _offsetAnim = Tween<Offset>(
      begin: const Offset(0, -0.6),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutCubic,
    ));

    _fadeAnim = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeIn,
    );

    _animController.forward();

    // Auto dismiss after 2.3 seconds
    Future.delayed(const Duration(milliseconds: 2300), () {
      if (mounted) {
        _animController.reverse().then((_) {
          if (mounted) widget.onDismiss();
        });
      }
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;

    return Positioned(
      top: topPadding + 10,
      left: 18,
      right: 18,
      child: SlideTransition(
        position: _offsetAnim,
        child: FadeTransition(
          opacity: _fadeAnim,
          child: Material(
            color: Colors.transparent,
            child: Container(
              height: 46,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF704FEE), Color(0xFF5B3EE0)],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF704FEE).withOpacity(0.35),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check_rounded,
                      color: Color(0xFF704FEE),
                      size: 14,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Added to cart!',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  InkWell(
                    onTap: widget.onViewCart,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'VIEW CART',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.3,
                            ),
                          ),
                          SizedBox(width: 3),
                          Icon(
                            Icons.arrow_forward_ios_rounded,
                            size: 10,
                            color: Colors.white,
                          ),
                        ],
                      ),
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
}

class _FullScreenImageViewer extends StatefulWidget {
  final List<String> images;
  final int initialIndex;
  final ValueChanged<int>? onIndexChanged;

  const _FullScreenImageViewer({
    required this.images,
    required this.initialIndex,
    this.onIndexChanged,
  });

  @override
  State<_FullScreenImageViewer> createState() => _FullScreenImageViewerState();
}

class _FullScreenImageViewerState extends State<_FullScreenImageViewer> {
  late int _currentIndex;
  late final PageController _pageController;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          // 1. Blurred Background + Tap outside/background to close
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
              child: GestureDetector(
                onTap: () => Navigator.of(context).pop(),
                behavior: HitTestBehavior.opaque,
                child: Container(
                  color: Colors.black.withOpacity(0.55),
                ),
              ),
            ),
          ),

          // 2. Swipable & Zoomable Images (Shown at natural aspect ratio with BoxFit.contain)
          SafeArea(
            child: Center(
              child: PageView.builder(
                controller: _pageController,
                physics: const BouncingScrollPhysics(),
                itemCount: widget.images.length,
                onPageChanged: (idx) {
                  setState(() => _currentIndex = idx);
                  widget.onIndexChanged?.call(idx);
                },
                itemBuilder: (context, index) {
                  return _ZoomableImagePage(
                    imageUrl: widget.images[index],
                    onTap: () => Navigator.of(context).pop(),
                  );
                },
              ),
            ),
          ),

          // 3. Top Controls (Counter Badge & Close Button)
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Image Counter Badge
                  if (widget.images.length > 1)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.4),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white24, width: 1),
                      ),
                      child: Text(
                        '${_currentIndex + 1} / ${widget.images.length}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                      ),
                    )
                  else
                    const SizedBox.shrink(),

                  // Close Button
                  InkWell(
                    onTap: () => Navigator.of(context).pop(),
                    borderRadius: BorderRadius.circular(22),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.4),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white24, width: 1),
                      ),
                      child: const Icon(
                        Icons.close_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ZoomableImagePage extends StatefulWidget {
  final String imageUrl;
  final VoidCallback? onTap;

  const _ZoomableImagePage({
    required this.imageUrl,
    this.onTap,
  });

  @override
  State<_ZoomableImagePage> createState() => _ZoomableImagePageState();
}

class _ZoomableImagePageState extends State<_ZoomableImagePage> {
  final TransformationController _transformController = TransformationController();

  @override
  void dispose() {
    _transformController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      behavior: HitTestBehavior.opaque,
      child: Center(
        child: InteractiveViewer(
          transformationController: _transformController,
          minScale: 1.0,
          maxScale: 4.0,
          clipBehavior: Clip.none,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 24.0),
            child: CachedNetworkImage(
              imageUrl: widget.imageUrl,
              fit: BoxFit.contain,
              placeholder: (_, __) => const Center(
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
              ),
              errorWidget: (_, __, ___) => const Icon(
                Icons.broken_image_rounded,
                size: 64,
                color: Colors.white54,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

