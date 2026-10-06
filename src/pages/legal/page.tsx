import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { useSeoMeta, buildBreadcrumbSchema } from '@/hooks/useSeoMeta';
import PageBreadcrumbTrail from '@/components/feature/PageBreadcrumbTrail';
import { usePageContent } from '@/hooks/usePageContent';
import { DEFAULT_LEGAL, buildLegalDefaults } from '@/lib/pageCopy';

interface LegalSection {
  heading: string;
  body: string[];
}

interface LegalDef {
  title: string;
  eyebrow: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_PAGES: Record<string, LegalDef> = {
  'privacy-policy': {
    title: 'Privacy Policy',
    eyebrow: 'Legal',
    metaTitle: 'Privacy Policy | Oceans Kenya',
    metaDescription:
      'How Oceans Kenya collects, uses, stores and protects your personal information when you browse properties, enquire or subscribe.',
    intro:
      'This Privacy Policy explains how Oceans Kenya ("we", "us") collects, uses and safeguards the personal information you share when you use our website, search for property, contact an agent or subscribe to our updates.',
    sections: [
      {
        heading: 'Information We Collect',
        body: [
          'We collect information you provide directly, including your name, email address, telephone number and any message you send through our enquiry and contact forms.',
          'We also collect limited technical information automatically, such as your browser type, device and the pages you visit, to keep the site secure and improve your experience.',
        ],
      },
      {
        heading: 'How We Use Your Information',
        body: [
          'Your information is used to respond to property enquiries, arrange viewings, send property alerts you have requested and provide the services you ask for.',
          'We may use your details to send relevant market updates and new listings. You can opt out of marketing communications at any time.',
        ],
      },
      {
        heading: 'Sharing & Disclosure',
        body: [
          'We do not sell your personal information. We may share details with the relevant Oceans Kenya agent handling your enquiry and with trusted service providers who help us operate the website.',
          'We may disclose information where required by law or to protect the rights, property and safety of Oceans Kenya, our clients or the public.',
        ],
      },
      {
        heading: 'Data Retention & Security',
        body: [
          'We retain personal information only for as long as necessary to fulfil the purposes described here or to meet legal obligations.',
          'We apply appropriate technical and organisational measures to protect your information against unauthorised access, alteration or loss.',
        ],
      },
      {
        heading: 'Your Rights',
        body: [
          'You may request access to, correction of, or deletion of your personal information, and you may object to certain processing. To exercise these rights, contact us using the details below.',
        ],
      },
      {
        heading: 'Contact Us',
        body: [
          'For any privacy question or request, please reach out through our contact page and our team will respond promptly.',
        ],
      },
    ],
  },
  'terms-conditions': {
    title: 'Terms & Conditions',
    eyebrow: 'Legal',
    metaTitle: 'Terms & Conditions | Oceans Kenya',
    metaDescription:
      'The terms governing your use of the Oceans Kenya website, property listings and estate agency services in Nairobi and across Kenya.',
    intro:
      'These Terms & Conditions govern your access to and use of the Oceans Kenya website and the property information, listings and services made available through it. By using the site you agree to these terms.',
    sections: [
      {
        heading: 'Use of the Website',
        body: [
          'You agree to use this website lawfully and not to misuse it, including by attempting to disrupt its operation, scrape its content at scale or access it in any unauthorised manner.',
          'All content on the website is provided for general information and does not constitute a binding offer or professional advice.',
        ],
      },
      {
        heading: 'Property Listings',
        body: [
          'Property details, prices, photographs and availability are provided in good faith but may change without notice. Listings are compiled from our agents and third parties and should be verified before any transaction.',
          'Prices are indicative and may be subject to negotiation, currency movement or withdrawal by the owner.',
        ],
      },
      {
        heading: 'Intellectual Property',
        body: [
          'The Oceans Kenya name, logo, website design and original content are protected by applicable intellectual property laws and may not be reproduced without permission.',
        ],
      },
      {
        heading: 'Limitation of Liability',
        body: [
          'To the fullest extent permitted by law, Oceans Kenya is not liable for any loss arising from reliance on the information published on this website. You are responsible for independently verifying all property information.',
        ],
      },
      {
        heading: 'Governing Law',
        body: [
          'These terms are governed by the laws of Kenya, and any dispute will be subject to the exclusive jurisdiction of the Kenyan courts.',
        ],
      },
    ],
  },
  'cookie-policy': {
    title: 'Cookie Policy',
    eyebrow: 'Legal',
    metaTitle: 'Cookie Policy | Oceans Kenya',
    metaDescription:
      'How Oceans Kenya uses cookies and similar technologies to keep the site working, remember your preferences and improve your property search.',
    intro:
      'This Cookie Policy explains how Oceans Kenya uses cookies and similar technologies when you visit our website, and how you can manage them.',
    sections: [
      {
        heading: 'What Are Cookies',
        body: [
          'Cookies are small text files stored on your device that help a website function and remember your preferences between visits.',
        ],
      },
      {
        heading: 'How We Use Cookies',
        body: [
          'We use essential cookies to keep the website secure and working correctly, and preference cookies to remember choices such as your selected currency and search filters.',
          'We may use analytics cookies to understand how visitors use the site so we can improve listings, search and navigation.',
        ],
      },
      {
        heading: 'Managing Cookies',
        body: [
          'You can control or delete cookies through your browser settings. Disabling certain cookies may affect how parts of the website function.',
        ],
      },
    ],
  },
  disclaimer: {
    title: 'Disclaimer',
    eyebrow: 'Legal',
    metaTitle: 'Disclaimer | Oceans Kenya',
    metaDescription:
      'Important information about the accuracy of property listings, prices and information published on the Oceans Kenya website.',
    intro:
      'The information published on the Oceans Kenya website is provided for general guidance only. While we strive for accuracy, we make no warranties as to the completeness or reliability of any listing or content.',
    sections: [
      {
        heading: 'Listing Accuracy',
        body: [
          'Property descriptions, measurements, prices, photographs and amenities are supplied by owners, developers and agents, and may contain errors or become out of date. Prospective buyers and tenants should verify all details independently before committing.',
        ],
      },
      {
        heading: 'No Professional Advice',
        body: [
          'Nothing on this website constitutes legal, financial, tax or investment advice. Always seek independent professional advice before entering into a property transaction.',
        ],
      },
      {
        heading: 'External Links',
        body: [
          'Our website may link to third-party sites. We are not responsible for the content, accuracy or practices of those external sites.',
        ],
      },
    ],
  },
  'help-center': {
    title: 'Help Center',
    eyebrow: 'Support',
    metaTitle: 'Help Center | Oceans Kenya',
    metaDescription:
      'Answers to common questions about searching property, contacting agents, listing a home and using the Oceans Kenya website.',
    intro:
      'Need a hand? The Help Center answers the questions we hear most often. If you cannot find what you need, our team is only a message away.',
    sections: [
      {
        heading: 'Searching for Property',
        body: [
          'Use the search bar and filters on the Buy, Rent and All Properties pages to narrow results by location, price, bedrooms and property type. Combined searches such as "3 bedroom villa in Karen" are understood automatically.',
          'Save a search or create an alert to be notified when matching properties are added.',
        ],
      },
      {
        heading: 'Contacting an Agent',
        body: [
          'Every listing shows the responsible agent and contact options. Use the Call or Message buttons on a property to reach the right team directly.',
        ],
      },
      {
        heading: 'Listing Your Property',
        body: [
          'Owners and landlords can request a free valuation and list a property through our Landlords page. Our team will guide you through photography, pricing and marketing.',
        ],
      },
      {
        heading: 'Still Need Help?',
        body: [
          'Visit our Contact page to reach the Oceans Kenya team, and we will get back to you as soon as possible.',
        ],
      },
    ],
  },
  'report-a-listing': {
    title: 'Report a Listing',
    eyebrow: 'Support',
    metaTitle: 'Report a Listing | Oceans Kenya',
    metaDescription:
      'Report an inaccurate, suspicious or duplicate property listing on Oceans Kenya so our team can review and correct it.',
    intro:
      'If you believe a listing is inaccurate, misleading, duplicated or suspicious, please tell us. Reports help us keep the platform trustworthy for everyone.',
    sections: [
      {
        heading: 'What to Report',
        body: [
          'Examples include incorrect prices or photographs, properties that are no longer available, duplicate listings, or enquiries that seem fraudulent.',
        ],
      },
      {
        heading: 'How to Report',
        body: [
          'Send us the property reference or web address together with a short description of the issue through our contact page. Our compliance team reviews every report and will take appropriate action.',
        ],
      },
    ],
  },
};

interface LegalPageProps {
  pageKey: string;
}

export default function LegalPage({ pageKey }: LegalPageProps) {
  const legalDefaults = buildLegalDefaults(LEGAL_PAGES);
  const { content: c } = usePageContent('legal', legalDefaults);
  const base = LEGAL_PAGES[pageKey];
  const flatKey = pageKey.replace(/-/g, '_');

  const rawSections = Array.isArray(c[`${flatKey}_sections`])
    ? (c[`${flatKey}_sections`] as { heading: string; body: string }[])
    : (base?.sections || []).map((s) => ({ heading: s.heading, body: s.body.join('\n\n') }));

  const def: LegalDef | undefined = base
    ? {
        ...base,
        title: String(c[`${flatKey}_title`] ?? base.title),
        eyebrow: String(c[`${flatKey}_eyebrow`] ?? base.eyebrow),
        metaTitle: String(c[`${flatKey}_meta_title`] ?? base.metaTitle),
        metaDescription: String(c[`${flatKey}_meta_description`] ?? base.metaDescription),
        intro: String(c[`${flatKey}_intro`] ?? base.intro),
        sections: rawSections.map((s) => ({
          heading: s.heading,
          body: String(s.body || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
        })),
      }
    : undefined;

  useSeoMeta({
    title: def?.metaTitle || 'Information | Oceans Kenya',
    description:
      def?.metaDescription || 'Important information about using the Oceans Kenya website.',
    path: `/${pageKey}`,
    schemas: [
      buildBreadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: def?.title || 'Information', path: `/${pageKey}` },
      ]),
    ],
  });

  if (!def) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-36 pb-24 px-4 md:px-6 text-center">
          <h1 className="font-roboto font-bold text-3xl text-primary mb-4">{String(c.notfound_title)}</h1>
          <Link to="/" className="text-primary underline cursor-pointer">
            {String(c.notfound_link)}
          </Link>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <section className="mt-[60px] md:mt-[132px] lg:mt-[152px] bg-primary">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-16">
          <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-2">
            {def.eyebrow}
          </p>
          <h1 className="font-prata font-bold text-white text-3xl md:text-5xl leading-tight">
            {def.title}
          </h1>
        </div>
      </section>

      <main className="flex-1 py-10 md:py-14">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <PageBreadcrumbTrail
            className="mb-8"
            items={[
              { label: 'Home', to: '/' },
              { label: def.title },
            ]}
          />
          <p className="font-roboto text-stone-600 text-sm md:text-base leading-relaxed mb-10">
            {def.intro}
          </p>
          <div className="space-y-8">
            {def.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-roboto font-bold text-primary text-lg md:text-xl mb-3">
                  {section.heading}
                </h2>
                {section.body.map((para, i) => (
                  <p key={i} className="font-roboto text-stone-600 text-sm leading-relaxed mb-3">
                    {para}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <div className="mt-12 bg-[#F7F9F9] rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-roboto text-primary text-sm">
              {String(c.contact_prompt)}
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-roboto font-semibold uppercase hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-chat-3-line"></i> {String(c.contact_button)}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}