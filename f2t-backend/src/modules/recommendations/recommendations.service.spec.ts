import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { of, throwError } from 'rxjs';
import { Product } from '@modules/products/schemas/product.schema';
import { RecommendationsService } from './recommendations.service';

const mockHttp = { post: jest.fn() };
const mockConfig = { get: jest.fn((k: string, d?: string) => d ?? '') };

function leanResult(rows: any[]) {
  return { select: () => ({ lean: () => Promise.resolve(rows) }) };
}

const mockProductModel = { find: jest.fn() };

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: HttpService, useValue: mockHttp },
        { provide: ConfigService, useValue: mockConfig },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
      ],
    }).compile();
    service = module.get(RecommendationsService);
  });

  it('returns [] for empty productIds', async () => {
    const res = await service.getCrossSell([], 6);
    expect(res).toEqual([]);
    expect(mockHttp.post).not.toHaveBeenCalled();
  });

  it('maps sidecar categories to in-stock products, excludes cart items, boosts same farm', async () => {
    mockProductModel.find.mockReturnValueOnce(
      leanResult([{ _id: 'p1', category: 'leafy', farmId: 'farmA' }]),
    );
    mockHttp.post.mockReturnValue(
      of({ data: { recommendations: [{ category: 'herbs', score: 2.1, source: 'rule' }] } }),
    );
    mockProductModel.find.mockReturnValueOnce(
      leanResult([
        { _id: 'p2', category: 'herbs', farmId: 'farmB', availableQuantity: 5 },
        { _id: 'p3', category: 'herbs', farmId: 'farmA', availableQuantity: 5 },
      ]),
    );
    const res = await service.getCrossSell(['p1'], 6);
    expect(mockHttp.post).toHaveBeenCalledWith(
      expect.stringContaining('/recommend'),
      expect.objectContaining({ cart_categories: ['leafy'] }),
      expect.any(Object),
    );
    expect(res.map((p: any) => p._id)).toEqual(['p3', 'p2']);
  });

  it('falls back to same-farm products when sidecar errors', async () => {
    mockProductModel.find.mockReturnValueOnce(
      leanResult([{ _id: 'p1', category: 'leafy', farmId: 'farmA' }]),
    );
    mockHttp.post.mockReturnValue(throwError(() => new Error('sidecar down')));
    mockProductModel.find.mockReturnValueOnce(
      leanResult([{ _id: 'p9', category: 'root', farmId: 'farmA', availableQuantity: 3 }]),
    );
    const res = await service.getCrossSell(['p1'], 6);
    expect(res.map((p: any) => p._id)).toEqual(['p9']);
  });
});
