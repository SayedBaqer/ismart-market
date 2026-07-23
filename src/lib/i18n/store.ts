export type StoreLang = 'en' | 'ar'

export const storeT = {
  en: {
    dir: 'ltr' as const,
    lang: 'en',
    // Header
    welcome: 'Welcome to',
    searchPlaceholder: 'Search products, SKUs…',
    searchBtn: 'Search',
    allProducts: 'All Products',
    cart: 'Cart',
    switchLang: 'عربي',
    // Footer
    tagline: 'Your trusted source for professional equipment and accessories. Quality products, reliable service.',
    categories: 'Categories',
    quickLinks: 'Quick Links',
    allProductsLink: 'All Products',
    trackOrder: 'Track Order',
    openShop: 'Open a Shop',
    adminPortal: 'Admin Portal',
    rights: 'All rights reserved.',
    // Products page
    filters: 'Filters',
    category: 'Category',
    allCategories: 'All Categories',
    searchProductsPlaceholder: 'Search products…',
    results: (n: number, q?: string) =>
      `${n} product${n !== 1 ? 's' : ''}${q ? ` for "${q}"` : ''}`,
    noProducts: 'No products found',
    clearFilters: 'Clear filters',
    prev: '← Prev',
    next: 'Next →',
    // Product detail
    addToCart: 'Add to Cart',
    outOfStock: 'Out of Stock',
    sku: 'SKU',
    specifications: 'Specifications',
    relatedProducts: 'Related Products',
    // Cart
    yourCart: 'Your Cart',
    emptyCart: 'Your cart is empty',
    continueShopping: 'Continue Shopping',
    subtotal: 'Subtotal',
    checkout: 'Proceed to Checkout',
    remove: 'Remove',
    qty: 'Qty',
    // Checkout
    orderSummary: 'Order Summary',
    shippingInfo: 'Shipping Information',
    fullName: 'Full Name',
    phone: 'Phone',
    address: 'Address',
    city: 'City',
    notes: 'Order Notes (optional)',
    placeOrder: 'Place Order',
    // Misc
    loading: 'Loading…',
    error: 'Something went wrong',
  },
  ar: {
    dir: 'rtl' as const,
    lang: 'ar',
    // Header
    welcome: 'مرحباً بكم في',
    searchPlaceholder: 'ابحث عن منتجات، رموز...',
    searchBtn: 'بحث',
    allProducts: 'جميع المنتجات',
    cart: 'السلة',
    switchLang: 'English',
    // Footer
    tagline: 'مصدرك الموثوق للمعدات والملحقات الاحترافية. منتجات عالية الجودة وخدمة موثوقة.',
    categories: 'التصنيفات',
    quickLinks: 'روابط سريعة',
    allProductsLink: 'جميع المنتجات',
    trackOrder: 'تتبع الطلب',
    openShop: 'افتح متجرك',
    adminPortal: 'لوحة التحكم',
    rights: 'جميع الحقوق محفوظة.',
    // Products page
    filters: 'التصفية',
    category: 'التصنيف',
    allCategories: 'جميع التصنيفات',
    searchProductsPlaceholder: 'ابحث عن منتجات...',
    results: (n: number, q?: string) =>
      `${n} منتج${q ? ` لـ "${q}"` : ''}`,
    noProducts: 'لا توجد منتجات',
    clearFilters: 'مسح الفلاتر',
    prev: 'السابق →',
    next: '← التالي',
    // Product detail
    addToCart: 'أضف إلى السلة',
    outOfStock: 'غير متوفر',
    sku: 'الرمز',
    specifications: 'المواصفات',
    relatedProducts: 'منتجات ذات صلة',
    // Cart
    yourCart: 'سلة التسوق',
    emptyCart: 'سلتك فارغة',
    continueShopping: 'متابعة التسوق',
    subtotal: 'المجموع الفرعي',
    checkout: 'متابعة للدفع',
    remove: 'حذف',
    qty: 'الكمية',
    // Checkout
    orderSummary: 'ملخص الطلب',
    shippingInfo: 'معلومات الشحن',
    fullName: 'الاسم الكامل',
    phone: 'الهاتف',
    address: 'العنوان',
    city: 'المدينة',
    notes: 'ملاحظات الطلب (اختياري)',
    placeOrder: 'إتمام الطلب',
    // Misc
    loading: 'جاري التحميل...',
    error: 'حدث خطأ ما',
  },
} satisfies Record<StoreLang, object>

export type StoreTranslations = typeof storeT['en']
