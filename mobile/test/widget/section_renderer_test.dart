import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:webintoapp_mobile/core/config/app_config_model.dart';
import 'package:webintoapp_mobile/features/catalog/models/product_model.dart';
import 'package:webintoapp_mobile/features/home/section_renderer.dart';
import 'package:webintoapp_mobile/features/home/widgets/banner_section.dart';
import 'package:webintoapp_mobile/features/home/widgets/categories_section.dart';

void main() {
  group('SectionRenderer Widget Tests', () {
    testWidgets('renders BannerSection when type is banner', (tester) async {
      const section = HomeSection(
        type: 'banner',
        items: [
          BannerItem(image: '', link: 'category:skincare'),
        ],
      );

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: SectionRenderer(section: section),
            ),
          ),
        ),
      );

      expect(find.byType(BannerSection), findsOneWidget);
      expect(find.text('Discover New Season Arrivals'), findsOneWidget);
    });

    testWidgets('renders CategoriesSection when type is categories', (tester) async {
      const section = HomeSection(type: 'categories');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            categoriesProvider.overrideWith((ref) => [
              const Category(id: '1', name: 'Skincare', slug: 'skincare'),
            ]),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: SectionRenderer(section: section),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(CategoriesSection), findsOneWidget);
      expect(find.text('Shop by Category'), findsOneWidget);
    });

    testWidgets('safely ignores unknown section types without crashing or rendering anything', (tester) async {
      const unknownSection = HomeSection(
        type: 'future_metaverse_hub',
        raw: {'extra': 'future_token'},
      );

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: SectionRenderer(section: unknownSection),
            ),
          ),
        ),
      );

      // Must render SizedBox.shrink without any errors or unexpected widgets
      expect(find.byType(BannerSection), findsNothing);
      expect(find.byType(CategoriesSection), findsNothing);
      expect(tester.takeException(), isNull);
    });
  });
}
