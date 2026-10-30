import '../services/woocommerce_service.dart';

class DetailedProduct {
  final String id;
  final String title;
  final double price;
  final double? originalPrice;
  final double rating;
  final int reviewsCount;
  final List<String> images;
  final String description;
  final List<String> colors;
  final List<String> features;

  const DetailedProduct({
    required this.id,
    required this.title,
    required this.price,
    this.originalPrice,
    required this.rating,
    required this.reviewsCount,
    required this.images,
    required this.description,
    required this.colors,
    required this.features,
  });
}

/// Fallback fashion products matching https://livaan.in
const mockProductList = <DetailedProduct>[
  DetailedProduct(
    id: '9274',
    title: 'Black Dotted Shirt for Women',
    price: 1200.0,
    originalPrice: 1500.0,
    rating: 4.9,
    reviewsCount: 32,
    images: [
      'https://livaan.in/wp-content/uploads/2025/02/black-solid-dots-dobby-shirt-theshimmerhouse-6_720x.webp',
    ],
    description:
        'Chic black dotted dobby shirt for women. Premium lightweight breathable fabric perfect for smart-casual and formal styling.',
    colors: [],
    features: [
      'Premium dobby textured fabric',
      'Elegant dot pattern',
      'Comfortable breathable fit',
      'Versatile smart-casual style',
    ],
  ),
  DetailedProduct(
    id: '9261',
    title: 'Leopard Print Shirt for Women',
    price: 1200.0,
    originalPrice: 1500.0,
    rating: 4.8,
    reviewsCount: 28,
    images: [
      'https://livaan.in/wp-content/uploads/2025/02/303a0ebd-8072-4e36-b2c4-4c889da0c6191676286619510-Hancock-Leopard-Printed-Regular-Fit-Casual-Shirt-54216762866-1.webp',
    ],
    description:
        'Trendy leopard printed regular fit casual shirt. Elevate your wardrobe with this bold, stylish animal print statement piece.',
    colors: [],
    features: [
      'Statement leopard print',
      'Regular comfortable fit',
      'Smooth soft-touch fabric',
      'Great for day or night outings',
    ],
  ),
  DetailedProduct(
    id: '8803',
    title: 'Solid Satin Formal Shirt for Women',
    price: 1099.0,
    originalPrice: 1500.0,
    rating: 4.9,
    reviewsCount: 45,
    images: [
      'https://livaan.in/wp-content/uploads/2025/01/LV1007-1-png.webp',
      'https://livaan.in/wp-content/uploads/2025/01/LV1007-2-png.webp',
      'https://livaan.in/wp-content/uploads/2025/01/LV1007-3-png.webp',
      'https://livaan.in/wp-content/uploads/2025/01/LV1007-4-png.webp',
      'https://livaan.in/wp-content/uploads/2025/01/LV1007-21-png.webp',
      'https://livaan.in/wp-content/uploads/2025/01/LV1007-22-png.webp',
    ],
    description:
        'Enhance your wardrobe with this formal satin shirt, a perfect blend of elegance and versatility designed to make a statement wherever you go.',
    colors: ['Wine', 'pink', 'Maroon', 'Blue', 'Black'],
    features: [
      'Luxurious silky satin sheen',
      'Tailored formal silhouette',
      'Wrinkle-resistant fabric',
      'Ideal for office and evening wear',
    ],
  ),
  DetailedProduct(
    id: '7818',
    title: 'Navy Blue Women Capri Night Suit Set',
    price: 1199.0,
    originalPrice: 1499.0,
    rating: 4.9,
    reviewsCount: 54,
    images: [
      'https://livaan.in/wp-content/uploads/2025/01/4-12.avif',
      'https://livaan.in/wp-content/uploads/2025/01/2-16.avif',
      'https://livaan.in/wp-content/uploads/2025/01/3-16.avif',
      'https://livaan.in/wp-content/uploads/2025/01/5-13.avif',
    ],
    description:
        'Ultra-comfortable navy blue capri night suit set. Crafted from soft breathable cotton blend for peaceful night sleep.',
    colors: [],
    features: [
      'Includes soft top & capri bottom',
      'Breathable cotton blend',
      'Elasticated waistband with drawstrings',
      'All-season loungewear comfort',
    ],
  ),
  DetailedProduct(
    id: '8409',
    title: 'Square Neck High Waist Bikini for Women',
    price: 1299.0,
    originalPrice: 1699.0,
    rating: 4.8,
    reviewsCount: 19,
    images: [
      'https://livaan.in/wp-content/uploads/2025/01/AC1166.jpg',
    ],
    description:
        'Chic square neck bikini with flattering high-waisted bottoms. Quick-drying stretch fabric perfect for tropical beach holidays.',
    colors: [],
    features: [
      'Flattering square neck top',
      'High waist silhouette',
      'Quick-dry chlorine-resistant material',
      'Four-way stretch for total mobility',
    ],
  ),
];

DetailedProduct? getProductById(String id) {
  final clean = id.trim();
  final cached = WooCommerceService.getCachedProduct(clean);
  if (cached != null) {
    return cached.toDetailedProduct();
  }
  for (final p in mockProductList) {
    if (p.id == clean) return p;
  }
  return null;
}
