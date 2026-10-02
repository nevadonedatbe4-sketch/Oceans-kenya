import { Link } from 'react-router-dom';
import EntityImage from '@/components/feature/EntityImage';

export interface RelatedPost {
  slug: string;
  title: string;
  category: string | null;
  excerpt: string | null;
  featured_image: string | null;
}

interface RelatedReadingProps {
  posts: RelatedPost[];
  className?: string;
}

/**
 * "Related reading" block - surfaces editorially-selected sibling articles at
 * the foot of an article. The list is driven by the post's `related_posts`
 * slugs, so editors control exactly which guides a reader is nudged toward.
 */
export default function RelatedReading({ posts, className = '' }: RelatedReadingProps) {
  if (posts.length === 0) return null;

  return (
    <section className={className}>
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 flex items-center justify-center rounded-full bg-accent-100 text-accent-700 shrink-0">
          <i className="ri-book-open-line text-lg"></i>
        </span>
        <div>
          <h2 className="font-prata font-semibold text-primary text-[22px] md:text-[27px] leading-tight">
            Related reading
          </h2>
          <p className="font-roboto text-[14px] text-[#636363]">
            Go deeper before you decide.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {posts.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="group flex bg-white overflow-hidden rounded-lg border-2 border-primary/12 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <div className="relative w-28 sm:w-32 shrink-0 self-stretch overflow-hidden bg-[#F5F5F5]">
              <EntityImage
                src={post.featured_image}
                alt={post.title}
                icon="ri-article-line"
                className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
            <div className="py-4 pr-4 pl-4 min-w-0 flex flex-col justify-center">
              {post.category && (
                <span className="font-jost text-[11px] font-semibold uppercase tracking-[0.1em] text-golden mb-1.5 whitespace-nowrap">
                  {post.category}
                </span>
              )}
              <h3 className="font-prata font-semibold text-primary text-[18px] leading-snug mb-1 group-hover:text-[#0D5959] transition-colors line-clamp-2">
                {post.title}
              </h3>
              {post.excerpt && (
                <p className="font-roboto text-[13px] text-[#636363] leading-relaxed line-clamp-2">
                  {post.excerpt}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}