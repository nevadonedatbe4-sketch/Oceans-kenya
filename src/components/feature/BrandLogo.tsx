import { useSiteSettings } from '@/hooks/useSiteSettings';
import { FALLBACK_LOGO } from '@/lib/brandDefaults';

interface BrandLogoProps {
  alt?: string;
  className?: string;
}

/** Shared Oceans Kenya logo mark - uses the admin-managed logo with a safe fallback. */
export default function BrandLogo({ alt = 'Oceans Kenya', className = '' }: BrandLogoProps) {
  const { site, getBrand } = useSiteSettings();
  const logoUrl = site.logo_url || getBrand('main_logo') || FALLBACK_LOGO;
  return <img src={logoUrl} alt={alt} className={className} />;
}