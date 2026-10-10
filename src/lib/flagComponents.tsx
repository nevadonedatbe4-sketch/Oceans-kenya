import KE from 'country-flag-icons/react/3x2/KE';
import UG from 'country-flag-icons/react/3x2/UG';
import TZ from 'country-flag-icons/react/3x2/TZ';
import RW from 'country-flag-icons/react/3x2/RW';
import ET from 'country-flag-icons/react/3x2/ET';
import SO from 'country-flag-icons/react/3x2/SO';
import SS from 'country-flag-icons/react/3x2/SS';
import BI from 'country-flag-icons/react/3x2/BI';
import GB from 'country-flag-icons/react/3x2/GB';
import US from 'country-flag-icons/react/3x2/US';
import AE from 'country-flag-icons/react/3x2/AE';
import IN from 'country-flag-icons/react/3x2/IN';
import CN from 'country-flag-icons/react/3x2/CN';
import ZA from 'country-flag-icons/react/3x2/ZA';
import NG from 'country-flag-icons/react/3x2/NG';
import DE from 'country-flag-icons/react/3x2/DE';
import FR from 'country-flag-icons/react/3x2/FR';
import IT from 'country-flag-icons/react/3x2/IT';
import CA from 'country-flag-icons/react/3x2/CA';
import AU from 'country-flag-icons/react/3x2/AU';

// Flags are imported statically from country-flag-icons as inline-SVG React
// components, so Vite bundles ONLY these countries into the app (no runtime
// network request, no external CDN). Keep this map in sync with DIAL_CODES.
// The type is derived from a flag import so it matches the package's own props.
export type FlagComponent = typeof KE;

export const FLAG_BY_ISO: Record<string, FlagComponent> = {
  KE, UG, TZ, RW, ET, SO, SS, BI, GB, US, AE, IN, CN, ZA, NG, DE, FR, IT, CA, AU,
};
