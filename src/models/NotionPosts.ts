export type NotionPost = {
  id: string;
  date: { start_date: string };
  type: string[];
  slug: string;
  tags?: string[];
  summary?: string;
  author?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    profile_photo: string;
  }>;
  title: string;
  status: string[];
  createdTime: string;
  fullWidth: boolean;
  thumbnail?: string;
};

export type NotionPosts = NotionPost[];
