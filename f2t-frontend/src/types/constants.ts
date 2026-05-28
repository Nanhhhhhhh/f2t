export const PAYMENT_METHODS = {
  CASH: 'cash',
  STRIPE: 'stripe',
} as const;

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'Pending Confirmation',
  [ORDER_STATUS.CONFIRMED]: 'Confirmed',
  [ORDER_STATUS.PREPARING]: 'Preparing',
  [ORDER_STATUS.READY_FOR_PICKUP]: 'Ready for Pickup',
  [ORDER_STATUS.SHIPPED]: 'Shipped',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
} as const;

export const ORDER_STATUS_DESCRIPTIONS = {
  [ORDER_STATUS.PENDING]: 'Order is waiting for farm confirmation',
  [ORDER_STATUS.CONFIRMED]: 'Farm has confirmed the order',
  [ORDER_STATUS.PREPARING]: 'Farm is preparing the products',
  [ORDER_STATUS.READY_FOR_PICKUP]: 'Order is ready to be picked up',
  [ORDER_STATUS.SHIPPED]: 'Products are being delivered to you',
  [ORDER_STATUS.DELIVERED]: 'Order has been delivered successfully',
  [ORDER_STATUS.CANCELLED]: 'Order has been cancelled',
} as const;

// Payment Status Constants
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.PENDING]: 'Pending',
  [PAYMENT_STATUS.PAID]: 'paid',
  [PAYMENT_STATUS.FAILED]: 'Failed',
  [PAYMENT_STATUS.REFUNDED]: 'Refunded',
} as const;

// Payment Method Constants
export const PAYMENT_METHOD = {
  CASH: 'cash',
  STRIPE: 'stripe',
} as const;

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHOD.CASH]: 'cash',
  [PAYMENT_METHOD.STRIPE]: 'stripe',
} as const;

// User Role Constants
export const USER_ROLE = {
  CONSUMER: 'consumer',
  FARM: 'farm',
  ADMIN: 'admin',
} as const;

export const USER_ROLE_LABELS = {
  [USER_ROLE.CONSUMER]: 'Consumer',
  [USER_ROLE.FARM]: 'Farm',
  [USER_ROLE.ADMIN]: 'Admin',
} as const;

// User Status Constants
export const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
} as const;

export const USER_STATUS_LABELS = {
  [USER_STATUS.ACTIVE]: 'Active',
  [USER_STATUS.SUSPENDED]: 'Suspended',
  [USER_STATUS.PENDING]: 'Pending',
} as const;

// Delivery Method Constants
export const DELIVERY_METHOD = {
  PICKUP: 'pickup',
  FARM_DELIVERY: 'farm_delivery',
  BOTH: 'both',
} as const;

export const DELIVERY_METHOD_LABELS = {
  [DELIVERY_METHOD.PICKUP]: 'Pickup at Farm',
  [DELIVERY_METHOD.FARM_DELIVERY]: 'Farm Delivery',
  [DELIVERY_METHOD.BOTH]: 'Both',
} as const;

// Product Category Constants
export const PRODUCT_CATEGORY = {
  VEGETABLES: 'vegetables',
  FRUITS: 'fruits',
  HERBS: 'herbs',
  MUSHROOMS: 'mushrooms',
  GRAINS: 'grains',
  DAIRY: 'dairy',
  EGGS: 'eggs',
  HONEY: 'honey',
  OTHER: 'other',
} as const;

export const PRODUCT_CATEGORY_LABELS = {
  [PRODUCT_CATEGORY.VEGETABLES]: 'Rau củ',
  [PRODUCT_CATEGORY.FRUITS]: 'Trái cây',
  [PRODUCT_CATEGORY.HERBS]: 'Rau thơm & Thảo mộc',
  [PRODUCT_CATEGORY.MUSHROOMS]: 'Nấm',
  [PRODUCT_CATEGORY.GRAINS]: 'Ngũ cốc & Hạt',
  [PRODUCT_CATEGORY.DAIRY]: 'Sữa & Sản phẩm từ sữa',
  [PRODUCT_CATEGORY.EGGS]: 'Trứng sạch',
  [PRODUCT_CATEGORY.HONEY]: 'Mật ong & Sản phẩm ong',
  [PRODUCT_CATEGORY.OTHER]: 'Khác',
} as const;

export const PRODUCT_CATEGORY_DESCRIPTIONS = {
  [PRODUCT_CATEGORY.VEGETABLES]:
    'Rau lá xanh, rau củ, và rau theo mùa từ trang trại sạch',
  [PRODUCT_CATEGORY.FRUITS]:
    'Trái cây tươi theo mùa, trái cây nhiệt đới và các loại berry',
  [PRODUCT_CATEGORY.HERBS]: 'Rau thơm tươi, thảo mộc dùng trong ẩm thực và y học cổ truyền',
  [PRODUCT_CATEGORY.MUSHROOMS]: 'Các loại nấm tươi và khô từ trang trại sạch',
  [PRODUCT_CATEGORY.GRAINS]: 'Ngũ cốc, gạo, hạt và sản phẩm từ hạt',
  [PRODUCT_CATEGORY.DAIRY]: 'Sữa tươi, phô mai, sữa chua từ trang trại sạch',
  [PRODUCT_CATEGORY.EGGS]: 'Trứng gà, vịt sạch từ trang trại không dùng kháng sinh',
  [PRODUCT_CATEGORY.HONEY]: 'Mật ong nguyên chất và các sản phẩm từ ong',
  [PRODUCT_CATEGORY.OTHER]: 'Các thực phẩm sạch khác từ trang trại',
} as const;

// Detailed subcategories for better organization
export const VEGETABLE_SUBCATEGORIES = {
  LEAFY_GREENS: 'leafy_greens',
  ROOT_VEGETABLES: 'root_vegetables',
  CRUCIFEROUS: 'cruciferous',
  NIGHTSHADES: 'nightshades',
  SQUASHES: 'squashes',
  LEGUMES: 'legumes',
  ALLIUMS: 'alliums',
  MUSHROOMS: 'mushrooms',
} as const;

export const VEGETABLE_SUBCATEGORY_LABELS = {
  [VEGETABLE_SUBCATEGORIES.LEAFY_GREENS]: 'Leafy Greens',
  [VEGETABLE_SUBCATEGORIES.ROOT_VEGETABLES]: 'Root Vegetables',
  [VEGETABLE_SUBCATEGORIES.CRUCIFEROUS]: 'Cruciferous',
  [VEGETABLE_SUBCATEGORIES.NIGHTSHADES]: 'Nightshades',
  [VEGETABLE_SUBCATEGORIES.SQUASHES]: 'Squashes & Gourds',
  [VEGETABLE_SUBCATEGORIES.LEGUMES]: 'Legumes',
  [VEGETABLE_SUBCATEGORIES.ALLIUMS]: 'Onions & Garlic',
  [VEGETABLE_SUBCATEGORIES.MUSHROOMS]: 'Mushrooms',
} as const;

export const FRUIT_SUBCATEGORIES = {
  BERRIES: 'berries',
  STONE_FRUITS: 'stone_fruits',
  CITRUS: 'citrus',
  TREE_FRUITS: 'tree_fruits',
  TROPICAL: 'tropical',
  MELONS: 'melons',
  GRAPES: 'grapes',
} as const;

export const FRUIT_SUBCATEGORY_LABELS = {
  [FRUIT_SUBCATEGORIES.BERRIES]: 'Berries',
  [FRUIT_SUBCATEGORIES.STONE_FRUITS]: 'Stone Fruits',
  [FRUIT_SUBCATEGORIES.CITRUS]: 'Citrus Fruits',
  [FRUIT_SUBCATEGORIES.TREE_FRUITS]: 'Tree Fruits',
  [FRUIT_SUBCATEGORIES.TROPICAL]: 'Tropical Fruits',
  [FRUIT_SUBCATEGORIES.MELONS]: 'Melons',
  [FRUIT_SUBCATEGORIES.GRAPES]: 'Grapes',
} as const;

export const HERB_SUBCATEGORIES = {
  CULINARY: 'culinary',
  MEDICINAL: 'medicinal',
  AROMATIC: 'aromatic',
  TEA_HERBS: 'tea_herbs',
} as const;

export const HERB_SUBCATEGORY_LABELS = {
  [HERB_SUBCATEGORIES.CULINARY]: 'Culinary Herbs',
  [HERB_SUBCATEGORIES.MEDICINAL]: 'Medicinal Herbs',
  [HERB_SUBCATEGORIES.AROMATIC]: 'Aromatic Herbs',
  [HERB_SUBCATEGORIES.TEA_HERBS]: 'Tea Herbs',
} as const;

// Common product examples by category
export const PRODUCT_EXAMPLES = {
  [PRODUCT_CATEGORY.VEGETABLES]: [
    'Lettuce',
    'Spinach',
    'Kale',
    'Carrots',
    'Potatoes',
    'Tomatoes',
    'Cucumbers',
    'Bell Peppers',
    'Broccoli',
    'Cauliflower',
    'Onions',
    'Garlic',
    'Zucchini',
    'Eggplant',
    'Peas',
    'Beans',
  ],
  [PRODUCT_CATEGORY.FRUITS]: [
    'Apples',
    'Oranges',
    'Bananas',
    'Strawberries',
    'Blueberries',
    'Peaches',
    'Grapes',
    'Watermelon',
    'Cantaloupe',
    'Pears',
    'Plums',
    'Cherries',
    'Raspberries',
    'Blackberries',
    'Lemons',
    'Limes',
  ],
  [PRODUCT_CATEGORY.HERBS]: [
    'Basil',
    'Oregano',
    'Thyme',
    'Rosemary',
    'Sage',
    'Parsley',
    'Cilantro',
    'Dill',
    'Mint',
    'Chives',
    'Lavender',
    'Chamomile',
    'Lemon Balm',
    'Tarragon',
  ],
  [PRODUCT_CATEGORY.GRAINS]: [
    'Wheat',
    'Corn',
    'Rice',
    'Oats',
    'Barley',
    'Quinoa',
    'Buckwheat',
    'Millet',
    'Sunflower Seeds',
    'Pumpkin Seeds',
    'Flax Seeds',
    'Chia Seeds',
  ],
  [PRODUCT_CATEGORY.MUSHROOMS]: [
    'Nấm rơm',
    'Nấm hương',
    'Nấm bào ngư',
    'Nấm kim châm',
    'Nấm mộc nhĩ',
    'Nấm linh chi',
    'Nấm đùi gà',
    'Nấm đông cô',
  ],
  [PRODUCT_CATEGORY.DAIRY]: [
    'Sữa tươi',
    'Phô mai',
    'Sữa chua',
    'Bơ',
    'Kem tươi',
    'Kefir',
  ],
  [PRODUCT_CATEGORY.EGGS]: [
    'Trứng gà ta',
    'Trứng vịt',
    'Trứng cút',
    'Trứng ngỗng',
  ],
  [PRODUCT_CATEGORY.HONEY]: [
    'Wildflower Honey',
    'Clover Honey',
    'Orange Blossom Honey',
    'Manuka Honey',
    'Honeycomb',
    'Bee Pollen',
    'Propolis',
    'Beeswax',
  ],
} as const;

// Product Status Constants
export const PRODUCT_STATUS = {
  AVAILABLE: 'available',
  SOLD_OUT: 'sold_out',
  UNAVAILABLE: 'unavailable',
  SEASONAL: 'seasonal',
} as const;

export const PRODUCT_STATUS_LABELS = {
  [PRODUCT_STATUS.AVAILABLE]: 'Available',
  [PRODUCT_STATUS.SOLD_OUT]: 'Sold Out',
  [PRODUCT_STATUS.UNAVAILABLE]: 'Unavailable',
  [PRODUCT_STATUS.SEASONAL]: 'Seasonal',
} as const;

// Product Unit Constants
export const PRODUCT_UNIT = {
  KG: 'kg',
  G: 'g',
  PIECE: 'piece',
  BUNCH: 'bunch',
  BOX: 'box',
  BAG: 'bag',
  LITER: 'liter',
} as const;

export const PRODUCT_UNIT_LABELS = {
  [PRODUCT_UNIT.KG]: 'Kilogram',
  [PRODUCT_UNIT.G]: 'Gram',
  [PRODUCT_UNIT.PIECE]: 'Piece',
  [PRODUCT_UNIT.BUNCH]: 'Bunch',
  [PRODUCT_UNIT.BOX]: 'Box',
  [PRODUCT_UNIT.BAG]: 'Bag',
  [PRODUCT_UNIT.LITER]: 'Liter',
} as const;

// Seasonal availability constants
export const SEASONS = {
  SPRING: 'spring',
  SUMMER: 'summer',
  FALL: 'fall',
  WINTER: 'winter',
  YEAR_ROUND: 'year_round',
} as const;

export const SEASON_LABELS = {
  [SEASONS.SPRING]: 'Spring',
  [SEASONS.SUMMER]: 'Summer',
  [SEASONS.FALL]: 'Fall',
  [SEASONS.WINTER]: 'Winter',
  [SEASONS.YEAR_ROUND]: 'Year Round',
} as const;

// Farming methods and certifications
export const FARMING_METHODS = {
  ORGANIC: 'organic',
  CONVENTIONAL: 'conventional',
  BIODYNAMIC: 'biodynamic',
  PERMACULTURE: 'permaculture',
  HYDROPONIC: 'hydroponic',
  GREENHOUSE: 'greenhouse',
  SUSTAINABLE: 'sustainable',
  NATURAL: 'natural',
} as const;

export const FARMING_METHOD_LABELS = {
  [FARMING_METHODS.ORGANIC]: 'Hữu cơ',
  [FARMING_METHODS.CONVENTIONAL]: 'Thông thường',
  [FARMING_METHODS.BIODYNAMIC]: 'Sinh động học',
  [FARMING_METHODS.PERMACULTURE]: 'Nông nghiệp bền vững',
  [FARMING_METHODS.HYDROPONIC]: 'Thủy canh',
  [FARMING_METHODS.GREENHOUSE]: 'Nhà kính',
  [FARMING_METHODS.SUSTAINABLE]: 'Bền vững',
  [FARMING_METHODS.NATURAL]: 'Tự nhiên',
} as const;

// Product quality indicators
export const QUALITY_INDICATORS = {
  PREMIUM: 'premium',
  STANDARD: 'standard',
  SECONDS: 'seconds', // slightly blemished but still good
  BULK: 'bulk',
} as const;

export const QUALITY_INDICATOR_LABELS = {
  [QUALITY_INDICATORS.PREMIUM]: 'Premium Quality',
  [QUALITY_INDICATORS.STANDARD]: 'Standard Quality',
  [QUALITY_INDICATORS.SECONDS]: 'Seconds (Minor Blemishes)',
  [QUALITY_INDICATORS.BULK]: 'Bulk/Processing Grade',
} as const;

// Harvest freshness indicators
export const FRESHNESS_LEVELS = {
  SAME_DAY: 'same_day',
  NEXT_DAY: 'next_day',
  WITHIN_WEEK: 'within_week',
  STORED: 'stored',
} as const;

export const FRESHNESS_LEVEL_LABELS = {
  [FRESHNESS_LEVELS.SAME_DAY]: 'Harvested Same Day',
  [FRESHNESS_LEVELS.NEXT_DAY]: 'Harvested Yesterday',
  [FRESHNESS_LEVELS.WITHIN_WEEK]: 'Harvested This Week',
  [FRESHNESS_LEVELS.STORED]: 'Stored/Aged',
} as const;

// Storage and handling requirements
export const STORAGE_REQUIREMENTS = {
  REFRIGERATED: 'refrigerated',
  FROZEN: 'frozen',
  ROOM_TEMPERATURE: 'room_temperature',
  COOL_DRY: 'cool_dry',
  HUMID: 'humid',
} as const;

export const STORAGE_REQUIREMENT_LABELS = {
  [STORAGE_REQUIREMENTS.REFRIGERATED]: 'Keep Refrigerated',
  [STORAGE_REQUIREMENTS.FROZEN]: 'Keep Frozen',
  [STORAGE_REQUIREMENTS.ROOM_TEMPERATURE]: 'Room Temperature',
  [STORAGE_REQUIREMENTS.COOL_DRY]: 'Cool & Dry Place',
  [STORAGE_REQUIREMENTS.HUMID]: 'High Humidity',
} as const;

// Product packaging types
export const PACKAGING_TYPES = {
  LOOSE: 'loose',
  BAGGED: 'bagged',
  BOXED: 'boxed',
  BUNDLED: 'bundled',
  WRAPPED: 'wrapped',
  VACUUM_SEALED: 'vacuum_sealed',
  GLASS_JAR: 'glass_jar',
  PLASTIC_CONTAINER: 'plastic_container',
} as const;

export const PACKAGING_TYPE_LABELS = {
  [PACKAGING_TYPES.LOOSE]: 'Loose/Bulk',
  [PACKAGING_TYPES.BAGGED]: 'Bagged',
  [PACKAGING_TYPES.BOXED]: 'Boxed',
  [PACKAGING_TYPES.BUNDLED]: 'Bundled',
  [PACKAGING_TYPES.WRAPPED]: 'Wrapped',
  [PACKAGING_TYPES.VACUUM_SEALED]: 'Vacuum Sealed',
  [PACKAGING_TYPES.GLASS_JAR]: 'Glass Jar',
  [PACKAGING_TYPES.PLASTIC_CONTAINER]: 'Plastic Container',
} as const;

// Sort Options Constants
export const SORT_OPTIONS = {
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  DISTANCE: 'distance',
  HARVEST_DATE: 'harvest_date',
  CREATED_AT: 'created_at',
} as const;

export const SORT_OPTIONS_LABELS = {
  [SORT_OPTIONS.PRICE_ASC]: 'Price: Low to High',
  [SORT_OPTIONS.PRICE_DESC]: 'Price: High to Low',
  [SORT_OPTIONS.DISTANCE]: 'Distance',
  [SORT_OPTIONS.HARVEST_DATE]: 'Harvest Date',
  [SORT_OPTIONS.CREATED_AT]: 'Newest',
} as const;

// API Error Codes
export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const;

export const API_ERROR_MESSAGES = {
  [API_ERROR_CODES.VALIDATION_ERROR]: 'Invalid data provided',
  [API_ERROR_CODES.UNAUTHORIZED]: 'Please log in to continue',
  [API_ERROR_CODES.FORBIDDEN]:
    'You do not have permission to perform this action',
  [API_ERROR_CODES.NOT_FOUND]: 'Data not found',
  [API_ERROR_CODES.CONFLICT]: 'Data already exists',
  [API_ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [API_ERROR_CODES.NETWORK_ERROR]: 'Network connection error',
  [API_ERROR_CODES.TIMEOUT_ERROR]: 'Request timeout',
} as const;

// Location and Geography Constants
export const LOCATION_CONSTANTS = {
  DEFAULT_DELIVERY_RADIUS: 50, // kilometers
  MAX_DELIVERY_RADIUS: 100, // kilometers
  MIN_DELIVERY_RADIUS: 5, // kilometers
  GPS_ACCURACY_THRESHOLD: 100, // meters
  LOCATION_TIMEOUT: 10000, // milliseconds
  DEFAULT_SEARCH_RADIUS: 25, // kilometers
  EARTH_RADIUS: 6371, // kilometers (for distance calculations)
} as const;

export const DISTANCE_UNITS = {
  KILOMETERS: 'km',
  MILES: 'miles',
} as const;

export const DISTANCE_UNIT_LABELS = {
  [DISTANCE_UNITS.KILOMETERS]: 'Kilometers',
  [DISTANCE_UNITS.MILES]: 'Miles',
} as const;

export const LOCATION_ACCURACY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export const LOCATION_ACCURACY_LABELS = {
  [LOCATION_ACCURACY.HIGH]: 'High Accuracy',
  [LOCATION_ACCURACY.MEDIUM]: 'Medium Accuracy',
  [LOCATION_ACCURACY.LOW]: 'Low Accuracy',
} as const;

export const TRANSPORTATION_MODES = {
  DRIVING: 'driving',
  WALKING: 'walking',
  CYCLING: 'cycling',
} as const;

export const TRANSPORTATION_MODE_LABELS = {
  [TRANSPORTATION_MODES.DRIVING]: 'Driving',
  [TRANSPORTATION_MODES.WALKING]: 'Walking',
  [TRANSPORTATION_MODES.CYCLING]: 'Cycling',
} as const;

export const DELIVERY_TRACKING_STATUS = {
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  ARRIVED: 'arrived',
  DELIVERED: 'delivered',
} as const;

export const DELIVERY_TRACKING_STATUS_LABELS = {
  [DELIVERY_TRACKING_STATUS.PICKED_UP]: 'Picked Up',
  [DELIVERY_TRACKING_STATUS.IN_TRANSIT]: 'In Transit',
  [DELIVERY_TRACKING_STATUS.ARRIVED]: 'Arrived',
  [DELIVERY_TRACKING_STATUS.DELIVERED]: 'Delivered',
} as const;

export const LOCATION_PERMISSION_STATUS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  RESTRICTED: 'restricted',
  UNDETERMINED: 'undetermined',
} as const;

export const LOCATION_PERMISSION_STATUS_LABELS = {
  [LOCATION_PERMISSION_STATUS.GRANTED]: 'Granted',
  [LOCATION_PERMISSION_STATUS.DENIED]: 'Denied',
  [LOCATION_PERMISSION_STATUS.RESTRICTED]: 'Restricted',
  [LOCATION_PERMISSION_STATUS.UNDETERMINED]: 'Not Determined',
} as const;

// Time Constants
export const TIME_CONSTANTS = {
  DELIVERY_RADIUS_MAX: 100, // kilometers
  ORDER_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  SEARCH_DEBOUNCE: 300, // milliseconds
  LOCATION_UPDATE_INTERVAL: 60 * 1000, // 1 minute in milliseconds
  GPS_UPDATE_INTERVAL: 30 * 1000, // 30 seconds in milliseconds
  DELIVERY_ETA_UPDATE_INTERVAL: 2 * 60 * 1000, // 2 minutes in milliseconds
} as const;

// Pagination Constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  PRODUCTS_PER_PAGE: 20,
  FARMS_PER_PAGE: 15,
  ORDERS_PER_PAGE: 10,
} as const;

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_IMAGES_PER_PRODUCT: 5,
} as const;

// Form Validation Constants
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PHONE_MIN_LENGTH: 10,
  PHONE_MAX_LENGTH: 15,
  PRODUCT_NAME_MAX_LENGTH: 100,
  PRODUCT_DESCRIPTION_MAX_LENGTH: 1000,
  FARM_NAME_MAX_LENGTH: 100,
  FARM_DESCRIPTION_MAX_LENGTH: 500,
} as const;

// Business Rules Constants
export const BUSINESS_RULES = {
  MIN_ORDER_VALUE: 50000, // VND
  MAX_DELIVERY_RADIUS: 100, // kilometers
  ORDER_CANCELLATION_DEADLINE: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  REFUND_PROCESSING_TIME: 3 * 24 * 60 * 60 * 1000, // 3 days in milliseconds
} as const;

// Permission Constants for Role-Based Access Control
export const PERMISSIONS = {
  // Consumer permissions
  BROWSE_PRODUCTS: 'browse_products',
  PLACE_ORDERS: 'place_orders',
  VIEW_ORDER_HISTORY: 'view_order_history',
  MANAGE_PROFILE: 'manage_profile',
  LEAVE_REVIEWS: 'leave_reviews',

  // Farm permissions
  MANAGE_FARM_PROFILE: 'manage_farm_profile',
  CREATE_PRODUCTS: 'create_products',
  EDIT_PRODUCTS: 'edit_products',
  DELETE_PRODUCTS: 'delete_products',
  MANAGE_ORDERS: 'manage_orders',
  UPDATE_ORDER_STATUS: 'update_order_status',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_DELIVERY_ZONES: 'manage_delivery_zones',

  // Admin permissions (for future use)
  ADMIN_ACCESS: 'admin_access',
  MODERATE_CONTENT: 'moderate_content',
  MANAGE_USERS: 'manage_users',
} as const;

export const PERMISSION_LABELS = {
  [PERMISSIONS.BROWSE_PRODUCTS]: 'Browse Products',
  [PERMISSIONS.PLACE_ORDERS]: 'Place Orders',
  [PERMISSIONS.VIEW_ORDER_HISTORY]: 'View Order History',
  [PERMISSIONS.MANAGE_PROFILE]: 'Manage Profile',
  [PERMISSIONS.LEAVE_REVIEWS]: 'Leave Reviews',
  [PERMISSIONS.MANAGE_FARM_PROFILE]: 'Manage Farm Profile',
  [PERMISSIONS.CREATE_PRODUCTS]: 'Create Products',
  [PERMISSIONS.EDIT_PRODUCTS]: 'Edit Products',
  [PERMISSIONS.DELETE_PRODUCTS]: 'Delete Products',
  [PERMISSIONS.MANAGE_ORDERS]: 'Manage Orders',
  [PERMISSIONS.UPDATE_ORDER_STATUS]: 'Update Order Status',
  [PERMISSIONS.VIEW_ANALYTICS]: 'View Analytics',
  [PERMISSIONS.MANAGE_DELIVERY_ZONES]: 'Manage Delivery Zones',
  [PERMISSIONS.ADMIN_ACCESS]: 'Admin Access',
  [PERMISSIONS.MODERATE_CONTENT]: 'Moderate Content',
  [PERMISSIONS.MANAGE_USERS]: 'Manage Users',
} as const;

// Default permissions by role
export const DEFAULT_PERMISSIONS = {
  [USER_ROLE.CONSUMER]: [
    PERMISSIONS.BROWSE_PRODUCTS,
    PERMISSIONS.PLACE_ORDERS,
    PERMISSIONS.VIEW_ORDER_HISTORY,
    PERMISSIONS.MANAGE_PROFILE,
    PERMISSIONS.LEAVE_REVIEWS,
  ],
  [USER_ROLE.FARM]: [
    PERMISSIONS.BROWSE_PRODUCTS,
    PERMISSIONS.MANAGE_FARM_PROFILE,
    PERMISSIONS.CREATE_PRODUCTS,
    PERMISSIONS.EDIT_PRODUCTS,
    PERMISSIONS.DELETE_PRODUCTS,
    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.UPDATE_ORDER_STATUS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_DELIVERY_ZONES,
    PERMISSIONS.MANAGE_PROFILE,
  ],
  [USER_ROLE.ADMIN]: [
    PERMISSIONS.ADMIN_ACCESS,
    PERMISSIONS.MODERATE_CONTENT,
    PERMISSIONS.MANAGE_USERS,
  ],
} as const;

// Feature Flags (for future use)
export const FEATURE_FLAGS = {
  ENABLE_NOTIFICATIONS: true,
  ENABLE_ANALYTICS: false,
  ENABLE_REVIEWS: false,
  ENABLE_SUBSCRIPTIONS: false,
  ENABLE_ADMIN_PANEL: false,
} as const;
