export type MediaItem = {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
};

export type PostAuthor = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  role: 'consumer' | 'farm';
};

export type PostFarm = {
  id: string;
  name: string;
  logoUrl: string;
};

export type Tag = {
  id: string;
  type: 'consumer' | 'farm';
  name: string;
};

export type Comment = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  content: string;
  createdAt: string;
};

export type Post = {
  id: string;
  authorId: PostAuthor;
  authorRole: 'consumer' | 'farm';
  farmId?: PostFarm;
  title: string;
  body: string;
  media: MediaItem[];
  tags: Tag[];
  hashtags: string[];
  comments: Comment[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
};
