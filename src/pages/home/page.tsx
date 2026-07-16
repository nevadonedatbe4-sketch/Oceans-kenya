import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import HeroSection from './components/HeroSection';
import NeighborhoodsSection from './components/NeighborhoodsSection';
import PropertiesSection from './components/PropertiesSection';
import PageContactSection from '@/components/feature/PageContactSection';
import ContactCTA from '@/components/feature/ContactCTA';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <NeighborhoodsSection />
        <PropertiesSection />
        <PageContactSection />
      </main>
      {/* CTA Banner */}
      <section className="relative py-10 md:py-14 px-6 overflow-hidden">
        <img
          src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/6a1b17c5-e791-4dd2-9b34-43d128d1a75c_edit.jpg?v=e8606cdcb818d22b0b8d00a0bd0717d5"
          alt="CTA background"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#0a1f33]/80"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-roboto font-bold text-white mb-3">
            Know Your Property&apos;s Worth?
          </h3>
          <p className="text-white/60 text-sm font-roboto mb-6">
            Get a free, no-obligation valuation from Nairobi&apos;s leading estate agents.
          </p>
          <Link
            to="/landlords"
            className="inline-block bg-primary hover:bg-white hover:text-primary border border-white/20 text-white px-10 py-3 text-sm font-roboto tracking-wider uppercase transition-all duration-300 cursor-pointer whitespace-nowrap"
          >
            Request Evaluation
          </Link>
        </div>
      </section>
      <ContactCTA />
      <Footer />
      <BackToTop />
    </div>
  );
}