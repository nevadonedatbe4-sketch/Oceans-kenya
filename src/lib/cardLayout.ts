/**
 * ONE source of truth for the directory/amenity listing-card geometry.
 *
 * Every horizontal place/amenity card across the directory surfaces
 * (Social Directory, category pages, Night Life, Neighbourhood "Around Here"
 * and Schools) imports these constants, so the cards stay UNIFORM:
 * a fixed card height, a fixed image column and a lower-middle crop.
 *
 * Because the height is FIXED (not a minimum) and the body content is
 * clipped, cards never grow or shrink based on how much text or how tall
 * the photo is - every card is pixel-identical.
 *
 * Change it here once and every card follows.
 */

/** FIXED card height on every breakpoint so all cards share one size. */
export const CARD_HEIGHT = 'h-[372px] sm:h-[252px]';

/**
 * Image frame: full-width banner on mobile, fixed-width portrait column on sm+.
 * The mobile height is fixed so stacked cards stay identical too.
 */
export const CARD_IMAGE_FRAME = 'relative w-full h-[168px] sm:h-full sm:w-[260px] shrink-0 overflow-hidden';

/**
 * Image element inside the frame - always cropped to fill, anchored to the
 * centre of the photo (50% across, 50% down) so the central subject stays
 * visible rather than only the top of the shot.
 */
export const CARD_IMAGE =
  'w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105';

/**
 * Card body: fills the remaining fixed height, keeps the footer pinned to the
 * bottom and clips any overflow so the card never grows.
 */
export const CARD_BODY = 'flex-1 min-w-0 flex flex-col justify-between overflow-hidden p-3';