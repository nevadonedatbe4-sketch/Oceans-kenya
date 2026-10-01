/**
 * VideoTour - surfaces a listing's video tour / virtual tour.
 *
 * The CRM already captures `video_url` and `virtual_tour_url`, but nothing on
 * the public detail page ever read them. This block gives visitors access to
 * whichever is attached:
 *   • an embeddable YouTube / Vimeo link renders inline (16:9),
 *   • any other link becomes a clear "watch" button that opens in a new tab,
 *   • a virtual tour link becomes its own button.
 *
 * It renders nothing at all when the listing carries neither link.
 */

interface VideoTourProps {
  videoUrl?: string;
  virtualTourUrl?: string;
  title?: string;
}

/** Convert a YouTube / Vimeo URL into an embeddable player URL (or null). */
function toEmbedUrl(url: string): string | null {
  const u = (url || '').trim();
  if (!u) return null;
  const yt = u.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export default function VideoTour({ videoUrl = '', virtualTourUrl = '', title = '' }: VideoTourProps) {
  const video = videoUrl.trim();
  const tour = virtualTourUrl.trim();
  if (!video && !tour) return null;

  const embed = video ? toEmbedUrl(video) : null;
  const hasInlinePlayer = Boolean(embed);

  return (
    <div
      id="section-video"
      className="border-2 border-primary/20 rounded-lg overflow-hidden bg-white"
    >
      <div className="flex items-center gap-2.5 px-5 md:px-6 py-4 bg-primary border-b-2 border-primary/20">
        <span className="w-5 h-5 flex items-center justify-center text-teal">
          <i className="ri-play-circle-line"></i>
        </span>
        <h2 className="font-roboto font-bold text-white text-base md:text-lg">Video &amp; Virtual Tour</h2>
      </div>

      <div className="p-4 md:p-6">
        {hasInlinePlayer && (
          <div className="aspect-video w-full rounded-md overflow-hidden border border-primary/15 bg-black">
            <iframe
              src={embed as string}
              className="w-full h-full"
              title={title ? `${title} - video tour` : 'Video tour'}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        )}

        <div className={`flex flex-col sm:flex-row sm:flex-wrap gap-3 ${hasInlinePlayer ? 'mt-4' : ''}`}>
          {video && (
            <a
              href={video}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-primary text-white font-roboto text-sm font-semibold cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-play-circle-line"></i>
              </span>
              {hasInlinePlayer ? 'Open video in new tab' : 'Watch video tour'}
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-arrow-right-up-line"></i>
              </span>
            </a>
          )}

          {tour && (
            <a
              href={tour}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border-2 border-primary text-primary font-roboto text-sm font-semibold cursor-pointer whitespace-nowrap hover:bg-primary/5 transition-colors"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-compass-3-line"></i>
              </span>
              Open 3D virtual tour
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-arrow-right-up-line"></i>
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}