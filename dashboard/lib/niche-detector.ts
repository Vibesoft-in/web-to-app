export interface NichePreset {
  id: string;
  name: string;
  badge: string;
  title: string;
  button_text: string;
  image: string;
}

export interface DetectedNiche {
  key: string;
  name: string;
  badge: string;
  preset_heading: string;
  hero_title: string;
  hero_badge: string;
  hero_button: string;
  hero_image: string;
  presets: NichePreset[];
  sample_products?: any[];
}

export function detectStoreNicheFromData(
  categories: any[] = [],
  products: any[] = [],
  storeName: string = "",
  siteUrl: string = ""
): DetectedNiche {
  const categoryNames = (categories || []).map((c) =>
    typeof c === "string" ? c : c?.name || c?.slug || ""
  );

  const productNames = (products || []).map((p) =>
    typeof p === "string" ? p : p?.title || p?.name || ""
  );

  // Extract first valid real product image if available
  let firstProductImage: string | null = null;
  for (const p of products || []) {
    if (!p) continue;
    let img: string | null = null;
    if (Array.isArray(p.images) && p.images.length > 0) {
      img = typeof p.images[0] === "string" ? p.images[0] : p.images[0]?.src || null;
    } else if (p.image) {
      img = typeof p.image === "string" ? p.image : p.image?.src || null;
    }
    if (
      img &&
      typeof img === "string" &&
      !img.includes("placeholder") &&
      !img.includes("Formula-Rally") &&
      !img.includes("lighting.rishabhtyagi.in")
    ) {
      firstProductImage = img;
      break;
    }
  }

  // Scoring table
  const scores: Record<string, number> = {
    fashion: 0,
    beauty: 0,
    jewelry: 0,
    electronics: 0,
    home: 0,
    grocery: 0,
    fitness: 0,
    lighting: 0,
  };

  const patterns: Record<string, RegExp> = {
    fashion:
      /\b(clothing|apparel|dress|dresses|shirt|shirts|tshirt|tshirts|t-shirt|t-shirts|jeans|denim|jacket|jackets|hoodie|hoodies|trousers|pants|skirt|skirts|tops?|sweater|sweaters|footwear|shoes?|sneakers?|boots?|heels?|sandals?|menswear|womenswear|kidswear|fashion|streetwear|ethnic|saree|sari|kurti|kurtas?|lehenga|suits?|activewear|sportswear|lingerie|accessories|handbags?|wallets?|scarf|scarves|belts?|eyewear|sunglasses)\b/i,
    beauty:
      /\b(beauty|cosmetics?|skincare|skin care|serums?|moisturizers?|cleansers?|toners?|sunscreen|lipsticks?|lip gloss|mascara|foundations?|makeup|make-up|fragrances?|perfumes?|eau de parfum|haircare|shampoos?|conditioners?|hair oil|lotion|body butter|ayurvedic|glow|anti-aging)\b/i,
    jewelry:
      /\b(jewel|jewelry|jewellery|gold|silver 925|diamonds?|platinum|necklaces?|rings?|earrings?|bracelets?|bangles?|pendants?|gemstones?|luxury watches?|chronographs?|bridal jewelry|pearls?|solitaires?)\b/i,
    electronics:
      /\b(electronics?|gadgets?|smartphones?|mobile phones?|laptops?|computers?|tablets?|headphones?|earphones?|earbuds?|bluetooth speakers?|smartwatches?|chargers?|power banks?|keyboards?|monitors?|gaming gear)\b/i,
    home:
      /\b(furniture|home decor|interiors?|sofas?|couch|chairs?|dining tables?|beds?|mattresses?|wardrobes?|cabinets?|bookshelves?|cushions?|curtains?|rugs?|carpets?|bedsheets?|linens?|blankets?|kitchenware|cookware)\b/i,
    grocery:
      /\b(grocery|groceries|supermarkets?|organic food|fresh fruits?|vegetables?|grains|pulses|spices|herbs|cooking oils?|snacks?|chocolates?|sweets|dry fruits|coffee beans?|tea leaves?|bakery|farm-fresh)\b/i,
    fitness:
      /\b(fitness|gym|workout|athletic|running shoes?|cycling|yoga mats?|dumbbells?|supplements?|whey protein|sports gear|badminton|football|cricket)\b/i,
    lighting:
      /\b(headlights?|headlamps?|taillights?|fog lamps?|fog lights?|xenon bulbs?|halogen bulbs?|car bulbs?|\bh7\b|\bh4\b|\bh1\b|\bh11\b|blade fuses?|maxi fuses?|capless bulbs?|automotive lighting|car spare parts?|automotive electrical)\b/i,
  };

  // 1. Categories Weight = 10
  for (const cat of categoryNames) {
    if (!cat) continue;
    for (const [key, regex] of Object.entries(patterns)) {
      if (regex.test(cat)) {
        scores[key] += 10;
      }
    }
  }

  // 2. Products Weight = 5
  for (const prod of productNames) {
    if (!prod) continue;
    for (const [key, regex] of Object.entries(patterns)) {
      if (regex.test(prod)) {
        scores[key] += 5;
      }
    }
  }

  // 3. Store name & URL Weight = 8
  const brandHaystack = `${storeName} ${siteUrl}`;
  for (const [key, regex] of Object.entries(patterns)) {
    if (regex.test(brandHaystack)) {
      scores[key] += 8;
    }
  }

  // Find winner
  let topNiche = "fashion";
  let maxScore = 0;
  for (const [key, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      topNiche = key;
    }
  }

  const cleanName = storeName && storeName.trim() ? storeName.trim() : "Exclusive";

  switch (topNiche) {
    case "beauty":
      return {
        key: "beauty",
        name: "Beauty & Cosmetics",
        badge: "Auto-Detected Niche: Beauty & Cosmetics Store",
        preset_heading: "Curated Beauty & Skincare Presets (1-Click)",
        hero_title: `${cleanName} Beauty & Skincare Collection`,
        hero_badge: "CLEAN BEAUTY ESSENTIALS",
        hero_button: "Shop Beauty Routine →",
        hero_image:
          firstProductImage ||
          "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
        presets: [
          {
            id: "skincare_serum",
            name: "Glow Vitamin C Serum",
            badge: "Radiance Boost",
            title: "Active Botanical Glow Elixir",
            button_text: "Explore Skincare →",
            image:
              firstProductImage ||
              "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80",
          },
          {
            id: "matte_lipstick",
            name: "Velvet Lip Color",
            badge: "Long-Wear 16H",
            title: "Ultra-Pigmented Matte Lipstick Set",
            button_text: "Find Your Shade →",
            image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80",
          },
          {
            id: "organic_cream",
            name: "Deep Hydration Cream",
            badge: "100% Organic",
            title: "Ceramide Nourishing Night Cream",
            button_text: "Shop Moisturizer →",
            image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80",
          },
        ],
      };

    case "jewelry":
      return {
        key: "jewelry",
        name: "Jewelry & Luxury",
        badge: "Auto-Detected Niche: Fine Jewelry & Luxury Store",
        preset_heading: "Curated Jewelry & Luxury Presets (1-Click)",
        hero_title: `${cleanName} Timeless Fine Jewels`,
        hero_badge: "HANDCRAFTED LUXURY",
        hero_button: "Explore Jewels →",
        hero_image:
          firstProductImage ||
          "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=80",
        presets: [
          {
            id: "solitaire_rings",
            name: "Solitaire Diamond Rings",
            badge: "Certified Stones",
            title: "Timeless Solitaire & Engagement Rings",
            button_text: "Discover Rings →",
            image:
              firstProductImage ||
              "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80",
          },
          {
            id: "gold_necklaces",
            name: "Handcrafted Gold Sets",
            badge: "Pure 22K Gold",
            title: "Royal Traditional Gold Necklaces",
            button_text: "Shop Collection →",
            image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
          },
        ],
      };

    case "electronics":
      return {
        key: "electronics",
        name: "Electronics & Tech",
        badge: "Auto-Detected Niche: Electronics & Tech Store",
        preset_heading: "Curated Tech & Gadget Presets (1-Click)",
        hero_title: `${cleanName} Smart Gadgets & Audio`,
        hero_badge: "LATEST INNOVATION • 2026",
        hero_button: "Shop Electronics →",
        hero_image:
          firstProductImage ||
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
        presets: [
          {
            id: "wireless_audio",
            name: "Wireless ANC Audio",
            badge: "Hi-Res Audio",
            title: "Next-Gen Wireless Headphones & Buds",
            button_text: "Shop Audio →",
            image:
              firstProductImage ||
              "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
          },
        ],
      };

    case "home":
      return {
        key: "home",
        name: "Home Decor & Living",
        badge: "Auto-Detected Niche: Home Decor & Living Store",
        preset_heading: "Curated Home & Living Presets (1-Click)",
        hero_title: `${cleanName} Modern Living & Interiors`,
        hero_badge: "COZY SPACE MAKEOVER",
        hero_button: "Explore Living →",
        hero_image:
          firstProductImage ||
          "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80",
        presets: [
          {
            id: "nordic_decor",
            name: "Nordic Minimal Living",
            badge: "Cozy Space",
            title: "Modern Scandinavian Living Interiors",
            button_text: "Explore Living →",
            image:
              firstProductImage ||
              "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
          },
        ],
      };

    case "grocery":
      return {
        key: "grocery",
        name: "Grocery & Organics",
        badge: "Auto-Detected Niche: Organic Food & Grocery Store",
        preset_heading: "Curated Farm & Grocery Presets (1-Click)",
        hero_title: `${cleanName} Fresh Organics & Staples`,
        hero_badge: "100% PURE & FRESH",
        hero_button: "Shop Fresh Basket →",
        hero_image:
          firstProductImage ||
          "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
        presets: [
          {
            id: "organic_farm",
            name: "Farm-Fresh Harvest",
            badge: "100% Organic",
            title: "Locally Sourced Organic Fruit & Veggies",
            button_text: "Shop Fresh →",
            image:
              firstProductImage ||
              "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
          },
        ],
      };

    case "lighting":
      return {
        key: "lighting",
        name: "Automotive Lighting & Electrical",
        badge: "Auto-Detected Niche: Lighting & Auto Electrical Store",
        preset_heading: "Curated Lighting & Electrical Presets (1-Click)",
        hero_title: `${cleanName} High-Performance Lighting & Bulbs`,
        hero_badge: "SUPER BRIGHT • 2026 EDITION",
        hero_button: "Shop Halogen & LED →",
        hero_image:
          firstProductImage ||
          "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1200&q=80",
        presets: [
          {
            id: "h7_halogen",
            name: "Formula Rally H7",
            badge: "Super Bright 55W",
            title: "Formula Rally H7 Halogen Headlights",
            button_text: "Shop Halogen Lamps →",
            image:
              firstProductImage ||
              "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80",
          },
        ],
      };

    case "fashion":
    default:
      return {
        key: "fashion",
        name: "Fashion & Apparel",
        badge: "Auto-Detected Niche: Fashion & Apparel Store",
        preset_heading: "Curated Fashion & Apparel Presets (1-Click)",
        hero_title: `${cleanName} Exclusive Fashion Collection`,
        hero_badge: "NEW SEASON ARRIVALS • 2026",
        hero_button: "Shop Collection →",
        hero_image:
          firstProductImage ||
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
        presets: [
          {
            id: "summer_fashion",
            name: "Summer Fashion",
            badge: "New Arrivals",
            title: `${cleanName} Summer Collection 2026`,
            button_text: "Shop Collection →",
            image:
              firstProductImage ||
              "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
          },
          {
            id: "streetwear",
            name: "Streetwear Drops",
            badge: "Trending Drop",
            title: "Urban Sneakers & Graphic Tees",
            button_text: "Get First Access →",
            image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=800&q=80",
          },
          {
            id: "luxury_watches",
            name: "Luxury Watches",
            badge: "Limited Edition",
            title: "Timeless Minimalist Essentials",
            button_text: "Discover Now →",
            image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
          },
          {
            id: "athleisure",
            name: "Athletic Activewear",
            badge: "Breathable Fit",
            title: "High-Performance Gym & Running Gear",
            button_text: "Shop Active →",
            image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80",
          },
          {
            id: "mega_sale",
            name: "Mega Sale 50%",
            badge: "Flash Deal 50% Off",
            title: "Biggest Clearance Sale of the Season",
            button_text: "Claim Discounts →",
            image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80",
          },
        ],
      };
  }
}
