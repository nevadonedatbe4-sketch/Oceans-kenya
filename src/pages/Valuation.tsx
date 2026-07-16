import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';

export default function Valuation() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-roboto font-bold text-3xl md:text-4xl text-primary mb-4">Property Valuation</h1>
          <p className="font-roboto text-stone-500 max-w-2xl mx-auto">
            Get a free, no-obligation valuation of your property from Nairobi&apos;s leading estate agents.
            Our experienced valuers understand the local market and will give you an accurate assessment
            of your property&apos;s current market value.
          </p>
        </div>
      </main>
      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}