import { Link } from 'react-router-dom';

const socialLinks = [
  { icon: 'ri-facebook-fill', href: 'https://www.facebook.com/oceanskenya', label: 'Facebook' },
  { icon: 'ri-instagram-line', href: 'https://www.instagram.com/oceans_estateagents', label: 'Instagram' },
  { icon: 'ri-linkedin-fill', href: 'https://www.linkedin.com/company/oceans-estate-agents', label: 'LinkedIn' },
  { icon: 'ri-youtube-fill', href: 'https://www.youtube.com/@oceanskenya', label: 'YouTube' },
  { icon: 'ri-whatsapp-line', href: 'https://wa.me/254712345678', label: 'WhatsApp' },
];

export default function HeroSection() {
  return (
    <section className="relative w-full flex items-center justify-center overflow-hidden min-h-[600px] md:min-h-[700px] lg:min-h-[800px]">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/0551756e-243c-46c5-96d2-b607627173aa_oceans-ke-vip.jpg?v=db7f5a56d803035ed38b44c637e62fbc)',
        }}
      ></div>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60"></div>

      <div className="relative z-10 w-full px-6 md:px-8 lg:px-16 flex flex-col items-center text-center pt-24 md:pt-32">
        <h1 className="font-prata text-white text-5xl md:text-7xl lg:text-8xl mb-3 leading-snug">
          Oceans
        </h1>
        <p className="mb-4 font-roboto text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] whitespace-nowrap text-golden">
          Estate &amp; Letting Agent
        </p>

        <div className="flex items-center gap-4 sm:gap-6 justify-center mb-8 sm:mb-12">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              rel="nofollow noreferrer"
              aria-label={social.label}
              target="_blank"
              className="w-7 h-7 flex items-center justify-center hover:text-golden transition-colors duration-300 cursor-pointer text-white"
            >
              <i className={`${social.icon} text-2xl sm:text-3xl`}></i>
            </a>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          <div className="flex flex-row w-full gap-3">
            <Link
              to="/rent"
              className="flex-1 transition-all duration-300 text-center whitespace-nowrap cursor-pointer bg-white/10 backdrop-blur-sm text-white border-2 border-white/80 hover:bg-golden hover:border-golden hover:text-white py-3.5 px-6 rounded-none text-sm font-roboto tracking-wider uppercase"
            >
              RENters
            </Link>
            <Link
              to="/buy"
              className="flex-1 transition-all duration-300 text-center whitespace-nowrap cursor-pointer bg-white/10 backdrop-blur-sm text-white border-2 border-white/80 hover:bg-golden hover:border-golden hover:text-white py-3.5 px-6 rounded-none text-sm font-roboto tracking-wider uppercase"
            >
              BUYers
            </Link>
          </div>
          <Link
            to="/valuation"
            className="w-full text-center transition-all duration-300 whitespace-nowrap cursor-pointer bg-white/10 backdrop-blur-sm text-white border-2 border-white/80 hover:bg-golden hover:border-golden hover:text-white py-3.5 px-6 rounded-none text-sm font-roboto tracking-wider uppercase"
          >
            EVALUATION
          </Link>
        </div>
      </div>
    </section>
  );
}