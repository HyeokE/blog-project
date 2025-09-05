const timeZone = 'Asia/Seoul';

function formatYmdInTimeZone(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getPostYmd(post: any, tz: string): string {
  const start: string | undefined = post?.date?.start_date;
  if (start) {
    return start.slice(0, 10);
  }
  const createdStr: string | undefined = post?.createdTime;
  const created = createdStr ? new Date(createdStr) : new Date(0);
  return formatYmdInTimeZone(created, tz);
}

export default function filterPublishedPosts({
  posts,
  includePages,
}: {
  posts: any;
  includePages: any;
}) {
  if (!posts || !posts.length) {
    return [];
  }
  const publishedPosts = posts
    .filter((post: any) =>
      includePages
        ? post?.type?.[0] === 'Post' || post?.type?.[0] === 'Page' || post?.type?.[0] === 'About'
        : post?.type?.[0] === 'Post',
    )

    .filter((post: any) => {
      const todayYmd = formatYmdInTimeZone(new Date(), timeZone);
      const postYmd = getPostYmd(post, timeZone);
      return post.title && post.slug && post?.status?.[0] === 'Published' && postYmd <= todayYmd;
    });
  return publishedPosts;
}
