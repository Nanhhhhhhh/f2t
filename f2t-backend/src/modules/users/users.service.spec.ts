import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockUserModel: any;

  beforeEach(async () => {
    mockUserModel = {
      new: jest.fn().mockResolvedValue({}),
      constructor: jest.fn().mockResolvedValue({}),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      exec: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchUsers', () => {
    it('returns empty array when query is less than 2 chars', async () => {
      expect(await service.searchUsers('')).toEqual([]);
      expect(await service.searchUsers('a')).toEqual([]);
      expect(mockUserModel.find).not.toHaveBeenCalled();
    });

    it('calls userModel.find with regex and returns mapped result', async () => {
      mockUserModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              {
                _id: { toHexString: () => 'uid1' },
                firstName: 'An',
                lastName: 'Nguyen',
                avatarUrl: undefined,
              },
            ]),
          }),
        }),
      });

      const result = await service.searchUsers('An');

      expect(mockUserModel.find).toHaveBeenCalledWith({
        $or: [
          { firstName: expect.any(RegExp) },
          { lastName: expect.any(RegExp) },
          { email: expect.any(RegExp) },
        ],
      });
      expect(result).toEqual([
        { id: 'uid1', name: 'An Nguyen', avatarUrl: undefined },
      ]);
    });
  });
});
