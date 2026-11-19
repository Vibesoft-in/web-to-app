import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:webintoapp_mobile/core/services/woocommerce_service.dart';
import 'package:webintoapp_mobile/features/product/product_details_screen.dart';

void main() {
  testWidgets('ProductDetailsScreen renders relatable products, reviews & delivery strip per screenshot', (tester) async {
    // Provide dummy screen size to allow scrolling
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final testProducts = [
      const WcProduct(
        id: '1',
        title: 'Fancy Partywear Women Pants',
        price: 267.0,
        regularPrice: 295.0,
        images: ['https://example.com/p1.jpg'],
        categories: ['Women', 'Bottomwear'],
        categoryIds: [1, 2],
        inStock: true,
      ),
      const WcProduct(
        id: '2',
        title: 'Trendy Fashionista Women Palazzo',
        price: 266.0,
        regularPrice: 314.0,
        images: ['https://example.com/p2.jpg'],
        categories: ['Women', 'Bottomwear'],
        categoryIds: [1, 2],
        inStock: true,
      ),
      const WcProduct(
        id: '3',
        title: 'Classic Cotton Blend Pantaloons',
        price: 247.0,
        regularPrice: 279.0,
        images: ['https://example.com/p3.jpg'],
        categories: ['Women', 'Bottomwear'],
        categoryIds: [1, 2],
        inStock: true,
      ),
    ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          wcProductsProvider.overrideWith((ref) async => testProducts),
        ],
        child: const MaterialApp(
          home: ProductDetailsScreen(productId: '1'),
        ),
      ),
    );

    // Initial pumps allowing async providers & microtasks to resolve
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    // Verify Features Section (collapsible 3 lines with View More / View Less)
    expect(find.text('Features'), findsOneWidget);
    expect(find.text('100% Premium Quality Fabric'), findsOneWidget);
    expect(find.text('Authentic Livaan Designer Wear'), findsOneWidget);
    expect(find.text('Comfortable All-Day Fit'), findsOneWidget);
    expect(find.text('Fast Shipping & Easy Returns'), findsNothing);
    expect(find.text('View More'), findsOneWidget);

    // Tap View More to expand
    await tester.tap(find.text('View More'));
    await tester.pump();
    expect(find.text('Fast Shipping & Easy Returns'), findsOneWidget);
    expect(find.text('View Less'), findsOneWidget);

    // Tap View Less to collapse
    await tester.tap(find.text('View Less'));
    await tester.pump();
    expect(find.text('Fast Shipping & Easy Returns'), findsNothing);
    expect(find.text('View More'), findsOneWidget);

    // Verify "You might also like" section
    expect(find.text('You might also like'), findsOneWidget);

    // Verify "Customer Ratings & Reviews" section
    expect(find.text('Customer Ratings & Reviews'), findsOneWidget);
    expect(find.text('VIEW ALL REVIEWS'), findsOneWidget);

    // Verify Delivery Strip & Pincode
    expect(find.textContaining('Delivery by'), findsOneWidget);
    expect(find.text('at 244713'), findsOneWidget);
    expect(find.text('Change'), findsOneWidget);

    // Verify Trust Badges
    expect(find.text('Lowest Price'), findsOneWidget);
    expect(find.text('Cash on Delivery'), findsOneWidget);
    expect(find.text('7-day Returns'), findsOneWidget);

    // Verify Bottom Sticky Bar Actions
    expect(find.text('Buy Now'), findsOneWidget);
    expect(find.text('Select Quantity'), findsOneWidget);

    // Verify "PEOPLE ALSO VIEWED" section
    expect(find.text('PEOPLE ALSO VIEWED'), findsOneWidget);
    expect(find.text('Free Delivery'), findsWidgets);
    expect(find.text('UPI'), findsWidgets);
  });
}
