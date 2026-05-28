# Product Requirements Document: Farm Marketplace MVP

## Introduction/Overview

The Farm Marketplace is a mobile application that connects consumers with local farms to purchase fresh farm products directly from producers. The platform enables farms to list their products with detailed information including harvest times, delivery schedules, and pricing, while consumers can browse, search, and order products from farms within a 100km radius. The application focuses on transparency in the farm-to-table process and provides full order tracking from placement to delivery.

**Problem Statement:** Consumers struggle to find fresh, local farm products while farms lack direct channels to reach customers, often relying on intermediaries that reduce their profit margins.

**Goal:** Create a direct marketplace that connects local farms with consumers, enabling transparent transactions and fresh product delivery within a defined geographic area.

## Goals

1. Enable farms to easily register and list their products with comprehensive information
2. Provide consumers with an intuitive platform to discover and purchase local farm products
3. Facilitate transparent order management with real-time status tracking
4. Support farms in managing their orders from acceptance through delivery
5. Build a foundation for scaling to multiple cities/regions

## User Stories

### Consumer Stories
- As a consumer, I want to register with my email and phone number so that I can access the marketplace
- As a consumer, I want to browse farms in my area so that I can discover local producers
- As a consumer, I want to search and filter products by type, price, and availability so that I can find what I need
- As a consumer, I want to view detailed product information including harvest and delivery times so that I can make informed purchases
- As a consumer, I want to place orders and track their status so that I know when to expect my products
- As a consumer, I want to make online payments securely so that transactions are convenient and safe

### Farm Stories
- As a farm owner, I want to register my farm and create a profile so that consumers can learn about my business
- As a farm owner, I want to list my products with detailed information so that customers understand what they're purchasing
- As a farm owner, I want to receive and manage orders so that I can fulfill customer requests efficiently
- As a farm owner, I want to update order status throughout the fulfillment process so that customers are informed
- As a farm owner, I want to set my own delivery methods and radius so that I can manage logistics according to my capabilities

## Functional Requirements

### Authentication & User Management
1. The system must allow users to register using email and password
2. The system must require phone numbers during registration for order communications
3. The system must provide separate registration flows for consumers and farms
4. The system must automatically approve farm registrations without manual verification
5. The system must allow users to login and logout securely

### Farm Management
6. The system must allow farms to create and edit their farm profile including name, description, location, and contact information
7. The system must allow farms to specify their preferred delivery methods
8. The system must display farm profiles to consumers with relevant information

### Product Management
9. The system must allow farms to create product listings with the following information:
    - Product name and description
    - Price per unit
    - Available quantity
    - Product images
    - Harvest time/date
    - Delivery time/date
10. The system must allow farms to edit and delete their product listings
11. The system must display products to consumers with all relevant information
12. The system must show product availability status

### Product Discovery
13. The system must display a list of available farms nearby the consumer's location
14. The system must provide basic search functionality for products by name
15. The system must provide filtering options for products by:
    - Product category (vegetables, fruits, etc.)
    - Price range
    - Delivery timeframe
    - Farm location

### Order Management
16. The system must allow consumers to add products to cart and place orders
17. The system must calculate total order amount including any delivery fees
18. The system must support online payment processing for orders
19. The system must send order notifications to farms when new orders are placed
20. The system must allow farms to accept or decline orders
21. The system must track orders through the following statuses:
    - Pending (waiting for farm acceptance)
    - Accepted (farm confirmed the order)
    - Harvesting (farm is preparing products)
    - Delivering (products are in transit)
    - Finished (order completed successfully)
    - Cancelled (order cancelled by farm or consumer)
    - Refunded (payment returned to consumer)
22. The system must allow farms to update order status
23. The system must display order status to consumers in real-time
24. The system must maintain order history for both consumers and farms

### Location & Delivery
25. The system must determine user location for farm and product discovery
26. The system must calculate distance between consumers and farms
28. The system must allow farms to specify delivery methods and associated costs

## Non-Goals (Out of Scope)

1. Admin panel or dashboard for platform management
2. Rating and review system for farms or products
3. In-app messaging between consumers and farms
4. Push notifications (basic email/SMS notifications only)
5. Social media integration or sharing features
6. Advanced analytics or reporting features
7. Multiple payment methods (focus on one reliable payment processor)
8. Subscription or recurring order features
9. Inventory management tools for farms
10. Third-party delivery service integration

## Design Considerations

- **Mobile-First Design:** Prioritize mobile user experience as primary interface
- **Location-Based UI:** Prominently display farm locations and delivery areas
- **Order Status Visualization:** Clear, intuitive order tracking interface
- **Product Gallery:** High-quality image display for farm products
- **Simple Navigation:** Easy switching between farm browsing and product search
- **Farm Profile Layout:** Comprehensive yet scannable farm information display

## Technical Considerations

- **Authentication:** Integrate with existing auth module in the React Native app
- **Location Services:** Utilize device GPS for user location detection
- **Payment Integration:** Implement secure online payment processing
- **Data Storage:** Design database schema for users, farms, products, and orders
- **API Design:** RESTful APIs for mobile app communication
- **Image Handling:** Efficient image upload and storage for product photos
- **Real-time Updates:** Consider implementing real-time order status updates

## Implementation Priority

### Phase 1 (Core MVP)
- User authentication and registration
- Basic farm profile creation
- Product listing and management
- Basic product search and filtering
- Order placement and payment

### Phase 2 (Order Management)
- Complete order status tracking
- Farm order management interface
- Order history and status updates

### Phase 3 (Enhancement)
- Advanced search and filtering
- Location-based optimizations
- Performance improvements and bug fixes
