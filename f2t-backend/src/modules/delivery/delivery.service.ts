import { Injectable, BadRequestException, Inject, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { GHNProvider } from './providers/ghn.provider';
import { ShippingAddressDto } from '../orders/dto/order.dto';
import { GhnWebhookDto } from './dto/ghn-webhook.dto';

// GHN statuses that map to a terminal order status on our side
const GHN_STATUS_MAP: Record<string, string> = {
  delivered: 'delivered',
  cancelled: 'cancelled',
};

export interface TrackingResponse {
  status: string;
  trackingCode: string | null;
  estimatedDeliveryDate: Date | null;
  driverLocation: {
    latitude: number;
    longitude: number;
    updatedAt: Date;
  } | null;
  routePolyline?: Array<{
    latitude: number;
    longitude: number;
  }>;
  steps: Array<{
    status: string;
    description: string;
    timestamp: Date;
    location?: string;
  }>;
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  private readonly ghnProvider: GHNProvider;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {
    this.ghnProvider = new GHNProvider(
      this.configService.get<string>('GHN_API_URL') || '',
      this.configService.get<string>('GHN_TOKEN') || '',
      this.configService.get<string>('GHN_SHOP_ID') || '',
      this.configService.get<number>('GHN_SERVICE_ID') || 53321,
    );
  }

  async createShipment(orderId: string): Promise<void> {
    if (!this.ghnProvider.isConfigured()) {
      return;
    }

    const order = await this.ordersService.findById(orderId);
    if (!order.shippingAddress) {
      throw new BadRequestException('Order has no shipping address');
    }

    const address = order.shippingAddress as ShippingAddressDto;

    try {
      // Build GHN order from our order data
      const ghnResult = await this.ghnProvider.createOrder({
        toName: address.recipientName || `${address.firstName || ''} ${address.lastName || ''}`.trim() || 'Customer',
        toPhone: address.phone || address.phoneNumber || '0000000000',
        toAddress: address.streetAddress || address.addressLine1 || address.street || 'No address',
        toWardName: address.ward || '',
        toDistrictName: address.district || address.city || '',
        toProvinceName: address.province || address.state || '',
        weight: Math.max(100, order.items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity * 100, 0)),
        codAmount: order.paymentStatus === 'paid' ? 0 : order.total,
        content: `F2T - ${order.items.map(i => i.productName).join(', ')}`,
        items: order.items.map(i => ({
          name: i.productName,
          quantity: i.quantity,
          weight: 100, // assume 100g per item
        })),
      });

      // Save GHN order code on our order
      await this.ordersService.saveShipmentInfo(orderId, {
        ghnOrderCode: ghnResult.orderCode,
        trackingCode: ghnResult.orderCode,
        estimatedDeliveryDate: new Date(ghnResult.expectedDeliveryTime),
      });
    } catch (error) {
      // Fire-and-forget: do not rethrow to avoid blocking order status update
    }
  }

  async getTracking(orderId: string, userId: string, role: string): Promise<TrackingResponse> {
    const order = await this.ordersService.findOneForUser(orderId, userId, role);

    if (!order.ghnOrderCode) {
      // Provide demo data for many statuses to allow testing
      const isTestableStatus = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'ready_for_pickup', 'cancelled'].includes(order.status);
      
      if (isTestableStatus) {
        const now = new Date();
        const baseTime = new Date(now.getTime() - 14400000); // 4 hours ago
        
        // --- MINI ROAD NETWORK (HCMC Area) ---
        // Nodes: Farm, Hubs, Intersections, Destination
        const nodes = [
          { id: 'farm', lat: 10.9833, lng: 106.4833 }, // Củ Chi
          { id: 'i1', lat: 10.9500, lng: 106.5500 },
          { id: 'i2', lat: 10.9000, lng: 106.6000 },
          { id: 'hub1', lat: 10.8672, lng: 106.6412 }, // D12 Hub
          { id: 'i3', lat: 10.8400, lng: 106.6600 },
          { id: 'hub2', lat: 10.8262, lng: 106.6762 }, // North Warehouse
          { id: 'i4', lat: 10.8000, lng: 106.6900 },
          { id: 'sort', lat: 10.7769, lng: 106.7009 }, // D1 Sort
          { id: 'i5', lat: 10.7650, lng: 106.6800 },
          { id: 'dest', lat: 10.7626, lng: 106.6602 }  // Customer
        ];

        // Edges: connections between nodes with "distance/cost"
        const edges = [
          ['farm', 'i1', 1], ['i1', 'i2', 1.2], ['i2', 'hub1', 0.8],
          ['hub1', 'i3', 0.5], ['i3', 'hub2', 0.4], ['hub2', 'i4', 0.6],
          ['i4', 'sort', 0.5], ['sort', 'i5', 0.3], ['i5', 'dest', 0.4],
          // Alternative "back-roads" to make Dijkstra actually choose
          ['i1', 'hub1', 2.5], ['i2', 'i3', 1.5], ['hub2', 'sort', 1.2]
        ];

        // Dijkstra's Algorithm Implementation
        const dijkstra = (startId: string, endId: string) => {
          const distances: Record<string, number> = {};
          const previous: Record<string, string | null> = {};
          const unvisited = new Set(nodes.map(n => n.id));

          nodes.forEach(node => {
            distances[node.id] = Infinity;
            previous[node.id] = null;
          });
          distances[startId] = 0;

          while (unvisited.size > 0) {
            const currentId = [...unvisited].reduce((min, id) => 
              distances[id] < distances[min] ? id : min
            );

            if (distances[currentId] === Infinity || currentId === endId) break;
            unvisited.delete(currentId);

            edges.forEach(([u, v, weight]) => {
              if (u === currentId || v === currentId) {
                const neighborId = (u === currentId ? v : u) as string;
                if (unvisited.has(neighborId)) {
                  const alt = distances[currentId] + (weight as number);
                  if (alt < distances[neighborId]) {
                    distances[neighborId] = alt;
                    previous[neighborId] = currentId;
                  }
                }
              }
            });
          }

          const path: string[] = [];
          let curr: string | null = endId;
          while (curr) {
            path.unshift(curr);
            curr = previous[curr];
          }
          return path.map(id => {
            const node = nodes.find(n => n.id === id)!;
            return { latitude: node.lat, longitude: node.lng };
          });
        };

        const fullRoute = dijkstra('farm', 'dest');

        // Dynamic driver movement
        const movementIndex = Math.floor((now.getTime() / 4000) % fullRoute.length);
        const currentLoc = fullRoute[movementIndex];

        const steps = [
          {
            status: 'confirmed',
            description: 'Nông trại đã xác nhận đơn hàng',
            timestamp: new Date(baseTime.getTime()),
            location: 'Củ Chi Organic Farm',
          }
        ];

        if (['preparing'].includes(order.status)) {
          steps.push({
            status: '[preparing]',
            description: 'Sản phẩm đang được thu hoạch và đóng gói',
            timestamp: new Date(baseTime.getTime() + 3600000),
            location: 'Củ Chi Organic Farm',
          });
        }

        if (['shipped'].includes(order.status)) {
          steps.push({
            status: 'picked_up',
            description: 'Tài xế đã lấy hàng thành công',
            timestamp: new Date(baseTime.getTime() + 7200000),
            location: 'Củ Chi Organic Farm',
          });
          steps.push({
            status: 'in_transit',
            description: 'Đơn hàng đã đến kho trung chuyển Củ Chi',
            timestamp: new Date(baseTime.getTime() + 9000000),
            location: 'GHN Củ Chi Collection Point',
          });
        }

        if (['shipped'].includes(order.status)) {
          steps.push({
            status: 'in_transit',
            description: 'Đơn hàng đang chuyển đến kho HCMC North',
            timestamp: new Date(baseTime.getTime() + 10800000),
            location: 'HCMC North Warehouse',
          });
          steps.push({
            status: 'out_for_delivery',
            description: 'Tài xế đang giao hàng đến bạn',
            timestamp: new Date(baseTime.getTime() + 12600000),
            location: 'District 1 Distribution Center',
          });
        }

        return {
          status: order.status,
          trackingCode: 'GHN-ALGO-F2T-99',
          estimatedDeliveryDate: new Date(now.getTime() + 3600000),
          driverLocation: {
            latitude: currentLoc.latitude,
            longitude: currentLoc.longitude,
            updatedAt: now,
          },
          routePolyline: fullRoute,
          steps: steps.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        };
      }

      // Shipment not created yet — return current tracking steps from DB
      return {
        status: order.status,
        trackingCode: null,
        estimatedDeliveryDate: null,
        driverLocation: null,
        steps: (order.trackingSteps as TrackingResponse['steps']) ?? [],
      };
    }

    try {
      // Fetch live from GHN
      const tracking = await this.ghnProvider.getTracking(order.ghnOrderCode as string);

      // Sync tracking steps back to our DB
      const steps = tracking.logs.map(l => ({
        status: l.status,
        description: l.description,
        timestamp: new Date(l.updatedDate),
        location: l.location,
      }));
      await this.ordersService.updateTrackingSteps(orderId, steps);

      return {
        status: order.status,
        trackingCode: order.ghnOrderCode,
        estimatedDeliveryDate: order.estimatedDeliveryDate || null,
        driverLocation: order.driverLocation || null,
        steps,
      };
    } catch (error) {
      // Degrade gracefully: return what we have in DB
      return {
        status: order.status,
        trackingCode: order.ghnOrderCode,
        estimatedDeliveryDate: order.estimatedDeliveryDate || null,
        driverLocation: order.driverLocation || null,
        steps: order.trackingSteps,
      };
    }
  }

  async handleGhnWebhook(payload: GhnWebhookDto): Promise<void> {
    const order = await this.ordersService.findByGhnOrderCode(payload.OrderCode);
    if (!order) {
      this.logger.warn(`GHN webhook: unknown OrderCode=${payload.OrderCode}`);
      return;
    }

    const step = {
      status: payload.Status,
      description: payload.Description ?? payload.Status,
      timestamp: payload.Time ? new Date(payload.Time) : new Date(),
    };
    await this.ordersService.appendTrackingStep(
      (order._id as { toHexString(): string }).toHexString(),
      step,
    );

    const mappedStatus = GHN_STATUS_MAP[payload.Status.toLowerCase()];
    if (mappedStatus && order.status !== mappedStatus) {
      await this.ordersService.updateOrderStatus(
        (order._id as { toHexString(): string }).toHexString(),
        mappedStatus,
      );
      this.logger.log(`GHN webhook: order ${payload.OrderCode} → status=${mappedStatus}`);
    }
  }
}
