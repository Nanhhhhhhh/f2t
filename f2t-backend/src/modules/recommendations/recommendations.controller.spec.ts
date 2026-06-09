import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

const mockService = { getCrossSell: jest.fn() };

describe('RecommendationsController', () => {
  let controller: RecommendationsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [{ provide: RecommendationsService, useValue: mockService }],
    }).compile();
    controller = module.get(RecommendationsController);
  });

  it('parses productIds csv and forwards to service with default limit 6', async () => {
    mockService.getCrossSell.mockResolvedValue([{ _id: 'p2' }]);
    const res = await controller.crossSell({ productIds: 'p1,p2', limit: undefined });
    expect(mockService.getCrossSell).toHaveBeenCalledWith(['p1', 'p2'], 6);
    expect(res).toEqual([{ _id: 'p2' }]);
  });

  it('returns [] for blank productIds', async () => {
    const res = await controller.crossSell({ productIds: '', limit: 6 });
    expect(res).toEqual([]);
    expect(mockService.getCrossSell).not.toHaveBeenCalled();
  });
});
