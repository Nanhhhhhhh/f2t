# PHASE 5 — Posts (Text + Media)

## CONTEXT
Read CONTEXT.md first. That is your memory.
Phases 1–4 are complete. The Upload Module is available — use it.
Posts already have a basic schema and controller.
This phase upgrades them to support images AND videos.

---

## YOUR TASK THIS SESSION
Upgrade the Posts module to support text + mixed media (images and videos).
Wire the frontend post creation screen to the backend.

---

## STEP 1 — INVESTIGATE FIRST

```bash
# Current backend posts state
cat f2t-backend/src/modules/posts/schemas/post.schema.ts
cat f2t-backend/src/modules/posts/posts.service.ts
cat f2t-backend/src/modules/posts/posts.controller.ts
cat f2t-backend/src/modules/posts/dto/post.dto.ts

# Frontend posts state
cat f2t-frontend/src/api/posts/use-create-post.tsx
cat f2t-frontend/src/api/posts/use-get-posts.tsx
find f2t-frontend/src/app -name "*post*" -o -name "*add-post*" | sort

# What media fields does the frontend send/expect?
grep -rn "image\|video\|media\|url" \
  f2t-frontend/src/api/posts/ --include="*.tsx"
```

Build gap table:

| Field | Frontend sends | Schema has | Gap |
|-------|---------------|-----------|-----|
| title | | | |
| body/content | | | |
| media[].url | | | |
| media[].type | | | |
| authorId | | | |
| authorRole | | | |
| farmId | | | |

---

## STEP 2 — BACKEND: SCHEMA UPGRADE

### Update Post schema:

```typescript
// Replace any existing image/video fields with a unified media array:

class MediaItemSchema {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true, enum: ['image', 'video'] })
  type: string;

  @Prop()
  thumbnailUrl?: string; // for videos: preview frame
}

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  authorId: Types.ObjectId;

  @Prop({ required: true, enum: ['consumer', 'farm'] })
  authorRole: string;

  // farmId only set when authorRole === 'farm'
  @Prop({ type: Types.ObjectId, ref: 'Farm' })
  farmId?: Types.ObjectId;

  @Prop({ required: true, minlength: 1, maxlength: 200 })
  title: string;

  @Prop({ required: true, minlength: 1, maxlength: 2000 })
  body: string;

  @Prop({ type: [MediaItemSchema], default: [] })
  media: MediaItemSchema[];

  @Prop({ default: 0 })
  likesCount: number;

  @Prop({ default: 0 })
  commentsCount: number;
}
```

### Update `CreatePostDto`:
```typescript
export class MediaItemDto {
  @IsUrl()
  @IsString()
  url: string;

  @IsEnum(['image', 'video'])
  type: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;
}

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  @ArrayMaxSize(10) // max 10 media items per post
  media?: MediaItemDto[];
}
```

### Update `PostsService.create()`:
```typescript
async create(userId: string, postData: CreatePostDto): Promise<PostDocument> {
  const user = await this.usersService.findById(userId);
  
  const post = new this.postModel({
    ...postData,
    authorId: new Types.ObjectId(userId),
    authorRole: user.role,
    // if farm user, also attach farmId
    ...(user.role === 'farm' && user.farmId
      ? { farmId: user.farmId }
      : {}),
    media: postData.media ?? [],
  });

  return post.save();
}
```

### Update `PostsService.findAll()` — add pagination + populate author:
```typescript
async findAll(query: GetPostsQueryDto): Promise<PaginationResponseDto<Post>> {
  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    this.postModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'firstName lastName avatarUrl role')
      .populate('farmId', 'name logoUrl')
      .exec(),
    this.postModel.countDocuments(),
  ]);

  return { items, total, page, limit, hasMore: skip + items.length < total };
}
```

---

## STEP 3 — FRONTEND WIRING

```bash
# Find the add post screen
find f2t-frontend/src/app -name "*add*post*" -o -name "*create*post*" | sort
```

The frontend post creation flow must be:

```
1. User writes title + body (text)
2. User optionally taps "Add Media" → expo-image-picker
3. For each selected file:
   a. POST to /api/uploads/image or /api/uploads/video
   b. Receive { url, type } in response
   c. Add to local media[] state as { url, type }
4. User taps "Post"
5. POST to /api/posts/add with:
   {
     title: "...",
     body: "...",
     media: [{ url: "https://...", type: "image" }, ...]
   }
```

If the add post screen already exists, wire it.
If it's a shell, implement the form using `react-hook-form` + `zod`:
```typescript
const postSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  media: z.array(z.object({
    url: z.string().url(),
    type: z.enum(['image', 'video']),
  })).max(10).optional(),
});
```

---

## STEP 4 — VERIFICATION

```bash
npm run build && npm run lint && npm test

# Test text-only post
curl -s -X POST http://localhost:3000/api/posts/add \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Xoài ngon quá!", "body": "Vừa mua được mẻ xoài từ Nông Trại Xanh, ngon lắm!"}' \
  | jq '.data.title, .data.media'

# Test post with media
curl -s -X POST http://localhost:3000/api/posts/add \
  -H "Authorization: Bearer $FARM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Thu hoạch cà chua hôm nay",
    "body": "Vụ mùa cà chua hữu cơ đã sẵn sàng!",
    "media": [
      {"url": "https://cloudinary.com/tomato-harvest.jpg", "type": "image"}
    ]
  }' | jq '.data.media'
# Must return the media array

# Test media limit enforcement (11 items should fail)
curl -s -X POST http://localhost:3000/api/posts/add \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "body": "Test",
    "media": [
      {"url": "https://x.com/1.jpg", "type": "image"},
      {"url": "https://x.com/2.jpg", "type": "image"},
      {"url": "https://x.com/3.jpg", "type": "image"},
      {"url": "https://x.com/4.jpg", "type": "image"},
      {"url": "https://x.com/5.jpg", "type": "image"},
      {"url": "https://x.com/6.jpg", "type": "image"},
      {"url": "https://x.com/7.jpg", "type": "image"},
      {"url": "https://x.com/8.jpg", "type": "image"},
      {"url": "https://x.com/9.jpg", "type": "image"},
      {"url": "https://x.com/10.jpg", "type": "image"},
      {"url": "https://x.com/11.jpg", "type": "image"}
    ]
  }' | jq '.statusCode'
# Must return 400

# Test list with pagination and author populated
curl -s "http://localhost:3000/api/posts?page=1&limit=5" \
  | jq '.data.items[0] | {title, authorId, media}'
# authorId should be populated with {firstName, lastName, avatarUrl, role}

# Test unauthenticated cannot post
curl -s -X POST http://localhost:3000/api/posts/add \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "body": "Test"}' | jq '.statusCode'
# Must return 401
```

---

## STEP 5 — UPDATE CONTEXT.md

At session end:
- Mark Phase 5 (Posts — Text + Media) as ✅ Complete
- Note: Post schema now has `media[]` with `{ url, type, thumbnailUrl? }` instead of `images[]`
- Note: Posts list now populates `authorId` (firstName, lastName, avatarUrl) and `farmId` (name, logoUrl)
- Output full updated CONTEXT.md

---

## RULES
- The `media` field replaces any previous `images: string[]` field on the Post schema
- Max 10 media items per post — enforce with `@ArrayMaxSize(10)` in DTO
- `farmId` on a post is only set when the author's role is `farm` — never set by the client directly
- Author info must be populated on list and single post endpoints
- URL validation must be applied to every media item's `url` field
- Do not touch Orders, Notifications, Statistics, or Transactions
- `npm run build && npm run lint && npm test` must pass

## START
Say: **"Starting Phase 5 — Posts Media. Reading current Post schema and frontend add-post screen."**
