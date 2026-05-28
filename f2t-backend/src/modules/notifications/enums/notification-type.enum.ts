export enum NotificationType {
  // Order lifecycle — sent to consumer
  OrderPlaced = 'order_placed',
  OrderConfirmed = 'order_confirmed',
  OrderPreparing = 'order_preparing',
  OrderShipped = 'order_shipped',
  OrderReadyForPickup = 'order_ready_for_pickup',
  OrderDelivered = 'order_delivered',
  OrderCancelled = 'order_cancelled',

  // Order lifecycle — sent to farm
  NewOrder = 'new_order',

  // Stock — sent to farm
  LowStock = 'low_stock',

  // System
  System = "system",
  PriceSuggestion = "price_suggestion",
}
