import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:webintoapp_mobile/features/orders/order_tracking_updates_screen.dart';

void main() {
  group('Order Tracking Screens Widget Tests', () {
    testWidgets('OrderTrackingUpdatesScreen renders Image 2 UI elements accurately', (tester) async {
      final sampleOrder = {
        'id': '353212295512261696',
        'order_number': '353212295512261696',
        'status': 'processing',
        'courier_name': 'Valmo',
        'tracking_id': 'VL0086113289048',
        'date_created': '2026-11-14T21:49:00',
        'shipping': {
          'first_name': 'Sanskriti',
          'last_name': 'Mishra',
          'city': 'Jhajjar',
        },
      };

      await tester.pumpWidget(
        MaterialApp(
          home: OrderTrackingUpdatesScreen(order: sampleOrder),
        ),
      );

      // Verify Header
      expect(find.text('SEE ALL UPDATES'), findsOneWidget);
      expect(find.byIcon(Icons.share_outlined), findsOneWidget);

      // Verify Courier and Tracking ID
      expect(find.text('Courier: Valmo'), findsOneWidget);
      expect(find.text('Tracking ID: VL0086113289048'), findsOneWidget);

      // Verify Key Milestones & Badges from Image 2
      expect(find.text('Shipped'), findsOneWidget);
      expect(find.text('Your item has been shipped.'), findsOneWidget);
      expect(find.text('Reached at Delhi'), findsWidgets);
      expect(find.text('Reached at Jhajjar'), findsWidgets);
      expect(find.text('Out for Delivery'), findsOneWidget);
      expect(find.text('Delivered'), findsOneWidget);
    });
  });
}
