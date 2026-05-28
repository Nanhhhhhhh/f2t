import { BadGatewayException } from '@nestjs/common';
import axios from 'axios';

export interface GHNCreateOrderParams {
  toName: string;
  toPhone: string;
  toAddress: string;
  toWardName: string;
  toDistrictName: string;
  toProvinceName: string;
  weight: number;         // grams
  codAmount: number;      // cash on delivery amount (0 if online payment)
  content: string;        // parcel description
  items: Array<{
    name: string;
    quantity: number;
    weight: number;
  }>;
}

export interface GHNOrderResult {
  orderCode: string;
  expectedDeliveryTime: string;
  totalFee: number;
}

export class GHNProvider {
  private readonly headers: Record<string, string>;

  constructor(
    private readonly apiUrl: string,
    private readonly token: string,
    private readonly shopId: string,
    private readonly serviceId: number,
  ) {
    this.headers = {
      'Token': this.token,
      'ShopId': this.shopId,
      'Content-Type': 'application/json',
    };
  }

  isConfigured(): boolean {
    return Boolean(this.token && this.shopId && this.apiUrl);
  }

  async createOrder(params: GHNCreateOrderParams): Promise<GHNOrderResult> {
    const body = {
      service_id: this.serviceId,
      service_type_id: 2,
      to_name: params.toName,
      to_phone: params.toPhone,
      to_address: params.toAddress,
      to_ward_name: params.toWardName,
      to_district_name: params.toDistrictName,
      to_province_name: params.toProvinceName,
      weight: params.weight,
      cod_amount: params.codAmount,
      content: params.content,
      items: params.items,
      required_note: 'KHONGCHOXEMHANG', // do not open parcel
    };

    try {
      const res = await axios.post<{
        code: number;
        data: {
          order_code: string;
          expected_delivery_time: string;
          total_fee: number;
        };
      }>(
        `${this.apiUrl}/v2/shipping-order/create`,
        body,
        { headers: this.headers },
      );

      if (res.data.code !== 200) {
        throw new BadGatewayException(`GHN order creation failed: ${res.data.code}`);
      }

      return {
        orderCode: res.data.data.order_code,
        expectedDeliveryTime: res.data.data.expected_delivery_time,
        totalFee: res.data.data.total_fee,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadGatewayException(`GHN API error: ${message}`);
    }
  }

  async getTracking(orderCode: string): Promise<{
    status: string;
    logs: Array<{
      status: string;
      description: string;
      updatedDate: string;
      location?: string;
    }>;
  }> {
    try {
      const res = await axios.post<{
        code: number;
        data: {
          status: string;
          log: Array<{
            status: string;
            description: string;
            updated_date: string;
            location?: { cell_name: string };
          }>;
        };
      }>(
        `${this.apiUrl}/v2/shipping-order/detail`,
        { order_code: orderCode },
        { headers: this.headers },
      );

      if (res.data.code !== 200) {
        throw new BadGatewayException('GHN tracking fetch failed');
      }

      return {
        status: res.data.data.status,
        logs: res.data.data.log.map(l => ({
          status: l.status,
          description: l.description,
          updatedDate: l.updated_date,
          location: l.location?.cell_name,
        })),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadGatewayException(`GHN API error: ${message}`);
    }
  }
}
