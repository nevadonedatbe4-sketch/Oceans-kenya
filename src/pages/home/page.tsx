import { Link, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import HeroSection from './components/HeroSection';
import NeighborhoodsSection from './components/NeighborhoodsSection';
import PropertiesSection from './components/PropertiesSection';
import PageContactSection from '@/components/feature/PageContactSection';
import ContactCTA from '@/components/feature/ContactCTA';
import { useHomePageContent } from '@/hooks/useHomePageContent';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const { content } = useHomePageContent();

  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    setSearchParams({ search: query });
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection onSearch={handleSearch} initialQuery={searchQuery} content={content} />
        <NeighborhoodsSection />
        <PropertiesSection
          searchQuery={searchQuery}
          content={content}
          onSearchChange={(query) => {
            setSearchQuery(query);
            if (query.trim()) setSearchParams({ search: query });
            else setSearchParams({});
          }}
        />
        <PageContactSection />
      </main>
      {/* CTA Banner */}
      {content.cta_visible && (
        <section className="relative py-8 md:py-14 px-4 md:px-6 overflow-hidden">
          <img
            src={content.cta_image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#0a1f33]/80"></div>
          <div className="relative max-w-4xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl font-roboto font-bold text-white mb-3">
              {content.cta_title}
            </h3>
            <p className="text-white/60 text-sm font-roboto mb-6">
              {content.cta_text}
            </p>
            <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
              {content.cta_button1_label && (
                <Link
                  to={content.cta_button1_link || '/landlords'}
                  className="inline-block w-full sm:w-auto text-center bg-white text-primary border-2 border-white hover:bg-primary hover:text-white hover:border-primary px-10 py-3 text-base font-roboto font-semibold tracking-wider uppercase transition-all duration-300 cursor-pointer whitespace-nowrap"
                >
                  {content.cta_button1_label}
                </Link>
              )}
              {content.cta_button2_label && (
                <Link
                  to={content.cta_button2_link || '/valuation'}
                  className="inline-block w-full sm:w-auto text-center bg-transparent text-white border-2 border-white hover:bg-white hover:text-primary px-10 py-3 text-base font-roboto font-semibold tracking-wider uppercase transition-all duration-300 cursor-pointer whitespace-nowrap"
                >
                  {content.cta_button2_label}
                </Link>
              )}
            </div>
          </div>
        </section>
      )}
      <ContactCTA />
      <Footer />
      <BackToTop />
    </div>
  );
}