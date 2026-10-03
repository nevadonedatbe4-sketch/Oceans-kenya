import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { lazy } from "react";
import { useAuth } from "@/hooks/useAuth";
import { portalHomeFor } from "@/lib/authz";

const NotFound = lazy(() => import("../pages/NotFound"));
const Home = lazy(() => import("../pages/home/page"));
const Buy = lazy(() => import("../pages/Buy"));
const Rent = lazy(() => import("../pages/Rent"));
const AllProperties = lazy(() => import("../pages/AllProperties"));
const Landlords = lazy(() => import("../pages/Landlords"));
const Neighbourhoods = lazy(() => import("../pages/Neighbourhoods"));
const NeighbourhoodDetail = lazy(() => import("../pages/NeighbourhoodDetail"));
const AreaResults = lazy(() => import("../pages/AreaResults"));
const NewDevelopments = lazy(() => import("../pages/NewDevelopments"));
const About = lazy(() => import("../pages/About"));
const Contact = lazy(() => import("../pages/Contact"));
const Valuation = lazy(() => import("../pages/Valuation"));
const PropertyDetail = lazy(() => import("../pages/PropertyDetail"));
const DevelopmentDetail = lazy(() => import("../pages/DevelopmentDetail"));
const JointVentures = lazy(() => import("../pages/JointVentures"));
const JointVentureProjectDetail = lazy(() => import("../pages/JointVentureProjectDetail"));
const ForgotPassword = lazy(() => import("../pages/crm/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));

// ── Agent Portal ──────────────────────────────────────────────
const AgentLogin = lazy(() => import("../pages/agent/AgentLogin"));
const AgentSignup = lazy(() => import("../pages/agent/AgentSignup"));
const AgentPending = lazy(() => import("../pages/agent/AgentPending"));
const AgentPortalLayout = lazy(() => import("../pages/agent/AgentPortalLayout"));
const AgentDashboard = lazy(() => import("../pages/agent/AgentDashboard"));
const AgentListings = lazy(() => import("../pages/agent/AgentListings"));
const AgentDevelopments = lazy(() => import("../pages/agent/AgentDevelopments"));
const AgentJvDesk = lazy(() => import("../pages/agent/AgentJvDesk"));
const AgentPerformance = lazy(() => import("../pages/agent/AgentPerformance"));
const AgentContactsPage = lazy(() => import("../pages/agent/AgentContactsPage"));
const AgentHelp = lazy(() => import("../pages/agent/AgentHelp"));
const OGroupMessenger = lazy(() => import("../pages/agent/ogroup/OGroupMessenger"));
const OGroupCheckIn = lazy(() => import("../pages/agent/ogroup/OGroupCheckIn"));
const AgentTimesheet = lazy(() => import("../pages/agent/AgentTimesheet"));
const OGroupCalendar = lazy(() => import("../pages/agent/ogroup/OGroupCalendar"));
const OGroupNotifications = lazy(() => import("../pages/agent/ogroup/OGroupNotifications"));
const AgentAppointments = lazy(() => import("../pages/agent/AgentAppointments"));

// ── Admin Portal ──────────────────────────────────────────────
const AdminLogin = lazy(() => import("../pages/admin/AdminLogin"));
const AdminPortalLayout = lazy(() => import("../pages/admin/AdminPortalLayout"));

// ── Shared CRM content (admin portal) ─────────────────────────
const Dashboard = lazy(() => import("../pages/crm/Dashboard"));
const Listings = lazy(() => import("../pages/crm/Listings"));
const Leads = lazy(() => import("../pages/crm/Leads"));
const Deals = lazy(() => import("../pages/crm/Deals"));
const Contacts = lazy(() => import("../pages/crm/Contacts"));
const Inbox = lazy(() => import("../pages/crm/Inbox"));
const AgentDatabasePage = lazy(() => import("../pages/crm/agent-database/page"));
const MediaLibrary = lazy(() => import("../pages/crm/MediaLibrary"));
const ListingEdit = lazy(() => import("../pages/crm/ListingEdit"));
const Developments = lazy(() => import("../pages/crm/Developments"));
const DevelopmentEdit = lazy(() => import("../pages/crm/DevelopmentEdit"));
const CRMNeighbourhoods = lazy(() => import("../pages/crm/Neighbourhoods"));
const NeighbourhoodEdit = lazy(() => import("../pages/crm/NeighbourhoodEdit"));
const CRMAmenities = lazy(() => import("../pages/crm/Amenities"));
const AmenityEdit = lazy(() => import("../pages/crm/AmenityEdit"));
const AmenityCategoryEdit = lazy(() => import("../pages/crm/AmenityCategoryEdit"));
const Activities = lazy(() => import("../pages/crm/Activities"));
const Insights = lazy(() => import("../pages/crm/Insights"));
const HomeSections = lazy(() => import("../pages/crm/HomeSections"));
const BlogAdmin = lazy(() => import("../pages/crm/BlogAdmin"));
const MenuManager = lazy(() => import("../pages/crm/MenuManager"));
const Testimonials = lazy(() => import("../pages/crm/Testimonials"));
const SyncActions = lazy(() => import("../pages/crm/SyncActions"));
const JointVenturesCRM = lazy(() => import("../pages/crm/JointVentures"));
const LandListings = lazy(() => import("../pages/crm/LandListings"));
const LandListingEdit = lazy(() => import("../pages/crm/LandListingEdit"));
const JVSubmissionEdit = lazy(() => import("../pages/crm/JVSubmissionEdit"));
const JVProjectEdit = lazy(() => import("../pages/crm/JVProjectEdit"));
const JVOpportunities = lazy(() => import("../pages/crm/JVOpportunities"));
const JVOpportunityEdit = lazy(() => import("../pages/crm/JVOpportunityEdit"));
const NavLinks = lazy(() => import("../pages/crm/NavLinks"));
const ContactSectionsAdmin = lazy(() => import("../pages/crm/ContactSectionsAdmin"));
const PipelineView = lazy(() => import("../pages/crm/PipelineView"));

// ── Admin Management (design-system) content routes ──────────────
const GlobalDesign = lazy(() => import("../pages/crm/management/GlobalDesign"));
const ComponentSettings = lazy(() => import("../pages/crm/management/ComponentSettings"));
const PageBuilder = lazy(() => import("../pages/crm/management/PageBuilder"));
const DashboardMenuPage = lazy(() => import("../pages/crm/management/DashboardMenuPage"));
const DesignSystemHub = lazy(() => import("../pages/crm/management/DesignSystemHub"));
const ColourPalette = lazy(() => import("../pages/crm/management/ColourPalette"));
const ManagementTypography = lazy(() => import("../pages/crm/management/Typography"));
const SpacingSizes = lazy(() => import("../pages/crm/management/SpacingSizes"));
const CardBoxSystem = lazy(() => import("../pages/crm/management/CardBoxSystem"));
const ButtonSystem = lazy(() => import("../pages/crm/management/ButtonSystem"));
const CardV7 = lazy(() => import("../pages/crm/management/CardV7"));
const CarouselSystem = lazy(() => import("../pages/crm/management/CarouselSystem"));
const GlobalPageControl = lazy(() => import("../pages/crm/management/GlobalPageControl"));
const ResponsiveControl = lazy(() => import("../pages/crm/management/ResponsiveControl"));
const ManagementGeneral = lazy(() => import("../pages/crm/management/General"));
const ManagementBranding = lazy(() => import("../pages/crm/management/Branding"));
const ManagementCurrency = lazy(() => import("../pages/crm/management/Currency"));
const ManagementPropertySettings = lazy(() => import("../pages/crm/management/PropertySettings"));
const ManagementPropertyDetails = lazy(() => import("../pages/crm/management/PropertyDetails"));
const ListingsPages = lazy(() => import("../pages/crm/management/ListingsPages"));
const ManagementSearchFilters = lazy(() => import("../pages/crm/management/SearchFilters"));
const ManagementRequiredFields = lazy(() => import("../pages/crm/management/RequiredFields"));
const FormLayoutManager = lazy(() => import("../pages/crm/management/FormLayoutManager"));
const ManagementPropertyDetailLayout = lazy(() => import("../pages/crm/management/PropertyDetailLayout"));
const HomepageControls = lazy(() => import("../pages/crm/management/HomepageControls"));
const ManagementHeroSection = lazy(() => import("../pages/crm/management/HeroSection"));
const NeighbourhoodsHomepage = lazy(() => import("../pages/crm/management/NeighbourhoodsHomepage"));
const ManagementBreadcrumbs = lazy(() => import("../pages/crm/management/Breadcrumbs"));
const LandlordsPage = lazy(() => import("../pages/crm/management/LandlordsPage"));
const LandlordsImages = lazy(() => import("../pages/crm/management/LandlordsImages"));
const NewDevelopmentsPage = lazy(() => import("../pages/crm/management/NewDevelopmentsPage"));
const AboutPage = lazy(() => import("../pages/crm/management/AboutPage"));
const ContactPage = lazy(() => import("../pages/crm/management/ContactPage"));
const NeighbourhoodsPage = lazy(() => import("../pages/crm/management/NeighbourhoodsPage"));
const NeighbourhoodsContentPage = lazy(() => import("../pages/crm/management/NeighbourhoodsContentPage"));
const DirectoryPagesPage = lazy(() => import("../pages/crm/management/DirectoryPagesPage"));
const DynamicPageTemplatesPage = lazy(() => import("../pages/crm/management/DynamicPageTemplatesPage"));
const CommercialPropertyPageCMS = lazy(() => import("../pages/crm/management/CommercialPropertyPage"));
const CommercialAdvertisingPageCMS = lazy(() => import("../pages/crm/management/CommercialAdvertisingPage"));
const ValuationPageCMS = lazy(() => import("../pages/crm/management/ValuationPage"));
const ExplorePagesCMS = lazy(() => import("../pages/crm/management/ExplorePagesCMS"));
const LocalPagesCMS = lazy(() => import("../pages/crm/management/LocalPagesCMS"));
const LegalPagesCMS = lazy(() => import("../pages/crm/management/LegalPagesCMS"));
const CheckInBreaksPage = lazy(() => import("../pages/crm/management/CheckInBreaksPage"));
const HomePageManagement = lazy(() => import("../pages/crm/management/HomePage"));
const ListingPagesCMS = lazy(() => import("../pages/crm/management/ListingPagesCMS"));
const FilterChipsPageCMS = lazy(() => import("../pages/crm/management/FilterChipsPage"));
const JointVenturesPageCMS = lazy(() => import("../pages/crm/management/JointVenturesPage"));
const ContactCompany = lazy(() => import("../pages/crm/management/ContactCompany"));
const ManagementSocialMedia = lazy(() => import("../pages/crm/management/SocialMedia"));
const MapsLocation = lazy(() => import("../pages/crm/management/MapsLocation"));
const StylingCards = lazy(() => import("../pages/crm/management/StylingCards"));
const StylingDetails = lazy(() => import("../pages/crm/management/StylingDetails"));
const CardsCarousel = lazy(() => import("../pages/crm/management/CardsCarousel"));
const CacheSync = lazy(() => import("../pages/crm/management/CacheSync"));
const EmailManagement = lazy(() => import("../pages/crm/management/EmailManagement"));
const ManagementOptions = lazy(() => import("../pages/crm/ManagementOptions"));

// ── Portal-specific pages (distinct from CRM admin content) ──────────────
const AgentApprovals = lazy(() => import("../pages/admin/AgentApprovals"));
const AgentManagement = lazy(() => import("../pages/admin/AgentManagement"));
const AgentDashboardPreview = lazy(() => import("../pages/admin/AgentDashboardPreview"));
const AgentDashboards = lazy(() => import("../pages/admin/AgentDashboards"));
const AgentAccountSettings = lazy(() => import("../pages/agent/AgentAccountSettings"));
const SystemManagementOptions = lazy(() => import("../pages/admin/SystemManagementOptions"));
const PageEditorsHub = lazy(() => import("../pages/admin/PageEditorsHub"));
const AdminAttendance = lazy(() => import("../pages/admin/AdminAttendance"));
const AdminTeamOverview = lazy(() => import("../pages/admin/AdminTeamOverview"));
const TeamContacts = lazy(() => import("../pages/admin/TeamContacts"));
const AdminTeamCalendar = lazy(() => import("../pages/admin/AdminTeamCalendar"));
const AdminTeamNotifications = lazy(() => import("../pages/admin/AdminTeamNotifications"));

import PortalGuard from "../components/feature/PortalGuard";
import SeoListingPage from "@/pages/SeoListingPage";
import LegalPage from "@/pages/legal/page";
import EstateAgentPage from "@/pages/EstateAgentPage";
import PriceGuidePage from "@/pages/PriceGuidePage";
import AreaGuidePage from "@/pages/AreaGuidePage";
import { SEO_PAGES } from "@/lib/seoPages";
import { ESTATE_AGENT_PAGES, PROPERTY_PRICE_PAGES } from "@/lib/seoClusters";
import { AREA_GUIDE_PAGES } from "@/lib/areaGuides";
import SitemapXmlPage from "@/pages/SitemapXmlPage";
const CommercialProperty = lazy(() => import("../pages/CommercialProperty"));
const CommercialAdvertising = lazy(() => import("../pages/CommercialAdvertising"));
const CommuteTime = lazy(() => import("../pages/CommuteTime"));
const Schools = lazy(() => import("../pages/Schools"));
const LivingNairobi = lazy(() => import("../pages/LivingNairobi"));
const Directory = lazy(() => import("../pages/Directory"));
const DirectoryCategory = lazy(() => import("../pages/DirectoryCategory"));
const NightLife = lazy(() => import("../pages/night-life/page"));
const PlaceDetail = lazy(() => import("../pages/PlaceDetail"));
const BlogDetail = lazy(() => import("../pages/BlogDetail"));

// ── Admin content routes (shared with agent for listing editing) ──
const adminChildren: RouteObject[] = [
  { path: "", element: <Dashboard /> },
  { path: "dashboard", element: <Dashboard /> },
  { path: "agent-dashboards", element: <AgentDashboards /> },
  { path: "listings", element: <Listings /> },
  { path: "listings/new", element: <ListingEdit /> },
  { path: "listings/edit/:id", element: <ListingEdit /> },
  { path: "developments", element: <Developments /> },
  { path: "developments/new", element: <DevelopmentEdit /> },
  { path: "developments/edit/:id", element: <DevelopmentEdit /> },
  { path: "approvals", element: <AgentApprovals /> },
  { path: "deletions", element: <AgentApprovals /> },
  { path: "agents", element: <AgentManagement /> },
  { path: "agents/:agentId/preview", element: <AgentDashboardPreview /> },
  { path: "agent-database", element: <AgentDatabasePage /> },
  { path: "leads", element: <Leads /> },
  { path: "pipeline", element: <PipelineView /> },
  { path: "deals", element: <Deals /> },
  { path: "contacts", element: <Contacts /> },
  { path: "inbox", element: <Inbox /> },
  { path: "messenger", element: <OGroupMessenger /> },
  { path: "media", element: <MediaLibrary /> },
  { path: "neighbourhoods", element: <CRMNeighbourhoods /> },
  { path: "neighbourhoods/new", element: <NeighbourhoodEdit /> },
  { path: "neighbourhoods/edit/:id", element: <NeighbourhoodEdit /> },
  { path: "amenities", element: <CRMAmenities /> },
  { path: "amenities/new", element: <AmenityEdit /> },
  { path: "amenities/edit/:id", element: <AmenityEdit /> },
  { path: "amenities/categories/new", element: <AmenityCategoryEdit /> },
  { path: "amenities/categories/edit/:id", element: <AmenityCategoryEdit /> },
  { path: "activities", element: <Activities /> },
  { path: "insights", element: <Insights /> },
  { path: "home-sections", element: <HomeSections /> },
  { path: "blog", element: <BlogAdmin /> },
  // Settings / System / Management Options now live inside the consolidated System & Management hub.
  { path: "settings", element: <Navigate to="/admin/system-management?tab=settings" replace /> },
  { path: "system", element: <Navigate to="/admin/system-management?tab=system" replace /> },
  // Users & Roles / Invitations now live inside the consolidated Agents & Access page.
  { path: "users", element: <Navigate to="/admin/agents?tab=users" replace /> },
  { path: "system-management", element: <SystemManagementOptions /> },
  { path: "page-editors", element: <PageEditorsHub /> },
  { path: "attendance", element: <AdminAttendance /> },
  { path: "check-in", element: <OGroupCheckIn /> },
  { path: "team", element: <AdminTeamOverview /> },
  { path: "team-contacts", element: <TeamContacts /> },
  { path: "team-calendar", element: <AdminTeamCalendar /> },
  { path: "calendar", element: <Navigate to="/admin/team-calendar" replace /> },
  { path: "appointments", element: <Navigate to="/admin/team-calendar" replace /> },
  { path: "team-notifications", element: <AdminTeamNotifications /> },
  { path: "menu", element: <MenuManager /> },
  { path: "testimonials", element: <Testimonials /> },
  { path: "sync", element: <SyncActions /> },
  { path: "land-listings", element: <LandListings /> },
  { path: "land-listings/new", element: <LandListingEdit /> },
  { path: "land-listings/edit/:id", element: <LandListingEdit /> },
  { path: "joint-ventures", element: <JointVenturesCRM /> },
  { path: "joint-ventures/new", element: <JVSubmissionEdit /> },
  { path: "joint-ventures/edit/:id", element: <JVSubmissionEdit /> },
  { path: "joint-ventures/projects/new", element: <JVProjectEdit /> },
  { path: "joint-ventures/projects/edit/:id", element: <JVProjectEdit /> },
  { path: "jv-opportunities", element: <JVOpportunities /> },
  { path: "jv-opportunities/new", element: <JVOpportunityEdit /> },
  { path: "jv-opportunities/edit/:id", element: <JVOpportunityEdit /> },
  { path: "nav-links", element: <NavLinks /> },
  { path: "contact-sections", element: <ContactSectionsAdmin /> },
  { path: "profile", element: <AgentAccountSettings /> },

  // ── Management / design-system options ──
  { path: "management", element: <Navigate to="/admin/system-management?tab=management" replace /> },
  { path: "management/options", element: <ManagementOptions /> },
  { path: "management/global-design", element: <GlobalDesign /> },
  { path: "management/component-settings", element: <ComponentSettings /> },
  { path: "management/page-builder", element: <PageBuilder /> },
  { path: "management/dashboard-menu", element: <DashboardMenuPage /> },
  { path: "management/design-system-hub", element: <DesignSystemHub /> },
  { path: "management/colour-palette", element: <ColourPalette /> },
  { path: "management/typography", element: <ManagementTypography /> },
  { path: "management/spacing-sizes", element: <SpacingSizes /> },
  { path: "management/card-box", element: <CardBoxSystem /> },
  { path: "management/button-system", element: <ButtonSystem /> },
  { path: "management/card-v7", element: <CardV7 /> },
  { path: "management/carousel", element: <CarouselSystem /> },
  { path: "management/global-page-control", element: <GlobalPageControl /> },
  { path: "management/responsive", element: <ResponsiveControl /> },
  { path: "management/general", element: <ManagementGeneral /> },
  { path: "management/branding", element: <ManagementBranding /> },
  { path: "management/currency", element: <ManagementCurrency /> },
  { path: "management/property", element: <ManagementPropertySettings /> },
  { path: "management/property-details", element: <ManagementPropertyDetails /> },
  { path: "management/listings-pages", element: <ListingsPages /> },
  { path: "management/search", element: <ManagementSearchFilters /> },
  { path: "management/required", element: <ManagementRequiredFields /> },
  { path: "management/form-layout", element: <FormLayoutManager /> },
  { path: "management/property-detail-layout", element: <ManagementPropertyDetailLayout /> },
  { path: "management/homepage", element: <HomepageControls /> },
  { path: "management/hero", element: <ManagementHeroSection /> },
  { path: "management/neighbourhoods-homepage", element: <NeighbourhoodsHomepage /> },
  { path: "management/breadcrumbs", element: <ManagementBreadcrumbs /> },
  { path: "management/landlords-page", element: <LandlordsPage /> },
  { path: "management/landlords-images", element: <LandlordsImages /> },
  { path: "management/new-developments-page", element: <NewDevelopmentsPage /> },
  { path: "management/about-page", element: <AboutPage /> },
  { path: "management/contact-page", element: <ContactPage /> },
  { path: "management/neighbourhoods-page", element: <NeighbourhoodsPage /> },
  { path: "management/neighbourhoods-content", element: <NeighbourhoodsContentPage /> },
  { path: "management/directory-pages", element: <DirectoryPagesPage /> },
  { path: "management/dynamic-templates", element: <DynamicPageTemplatesPage /> },
  { path: "management/commercial-property-page", element: <CommercialPropertyPageCMS /> },
  { path: "management/commercial-advertising-page", element: <CommercialAdvertisingPageCMS /> },
  { path: "management/valuation-page", element: <ValuationPageCMS /> },
  { path: "management/explore-pages", element: <ExplorePagesCMS /> },
  { path: "management/local-pages", element: <LocalPagesCMS /> },
  { path: "management/legal-pages", element: <LegalPagesCMS /> },
  { path: "management/checkin-breaks", element: <CheckInBreaksPage /> },
  { path: "management/home-page", element: <HomePageManagement /> },
  { path: "management/listing-pages", element: <ListingPagesCMS /> },
  { path: "management/filter-chips", element: <FilterChipsPageCMS /> },
  { path: "management/joint-ventures-page", element: <JointVenturesPageCMS /> },
  { path: "management/contact", element: <ContactCompany /> },
  { path: "management/social", element: <ManagementSocialMedia /> },
  { path: "management/maps", element: <MapsLocation /> },
  { path: "management/styling-cards", element: <StylingCards /> },
  { path: "management/styling-details", element: <StylingDetails /> },
  { path: "management/cards-carousel", element: <CardsCarousel /> },
  { path: "management/cache", element: <CacheSync /> },
  { path: "management/email", element: <EmailManagement /> },
];

// ── Agent content routes ─────────────────────────────────────
const agentChildren: RouteObject[] = [
  { path: "", element: <AgentDashboard /> },
  { path: "dashboard", element: <AgentDashboard /> },
  { path: "listings", element: <AgentListings /> },
  { path: "land-listings", element: <AgentJvDesk /> },
  { path: "land-listings/new", element: <LandListingEdit /> },
  { path: "land-listings/edit/:id", element: <LandListingEdit /> },
  { path: "jv-desk", element: <AgentJvDesk /> },
  { path: "listings/new", element: <ListingEdit /> },
  { path: "listings/edit/:id", element: <ListingEdit /> },
  { path: "developments", element: <AgentDevelopments /> },
  { path: "developments/new", element: <DevelopmentEdit /> },
  { path: "developments/edit/:id", element: <DevelopmentEdit /> },
  { path: "leads", element: <Leads /> },
  { path: "enquiries", element: <Inbox /> },
  { path: "messenger", element: <OGroupMessenger /> },
  { path: "check-in", element: <OGroupCheckIn /> },
  { path: "timesheet", element: <AgentTimesheet /> },
  { path: "calendar", element: <OGroupCalendar /> },
  { path: "appointments", element: <AgentAppointments /> },
  { path: "notifications", element: <OGroupNotifications /> },
  { path: "performance", element: <AgentPerformance /> },
  { path: "contacts", element: <AgentContactsPage /> },
  { path: "help", element: <AgentHelp /> },
  { path: "profile", element: <AgentAccountSettings /> },
];

const routes: RouteObject[] = [
  { path: "/", element: <Home /> },
  { path: "/buy", element: <Buy /> },
  { path: "/rent", element: <Rent /> },
  { path: "/all-properties", element: <AllProperties /> },
  ...Object.values(SEO_PAGES).map((p) => ({ path: p.slug, element: <SeoListingPage slug={p.slug} /> })),
  ...Object.values(ESTATE_AGENT_PAGES).map((p) => ({ path: p.slug, element: <EstateAgentPage slug={p.slug} /> })),
  ...Object.values(PROPERTY_PRICE_PAGES).map((p) => ({ path: p.slug, element: <PriceGuidePage slug={p.slug} /> })),
  ...Object.values(AREA_GUIDE_PAGES).map((p) => ({ path: p.slug, element: <AreaGuidePage slug={p.slug} /> })),
  { path: "/landlords", element: <Landlords /> },
  { path: "/neighbourhoods", element: <Neighbourhoods /> },
  { path: "/neighbourhood/:slug", element: <NeighbourhoodDetail /> },
  // Dedicated area property-search view - owns the exact → nearby → broad fallback.
  { path: "/area/:slug", element: <AreaResults /> },
  { path: "/blog/:slug", element: <BlogDetail /> },
  { path: "/new-developments", element: <NewDevelopments /> },
  { path: "/joint-ventures", element: <JointVentures /> },
  { path: "/joint-ventures/project/:slug", element: <JointVentureProjectDetail /> },
  { path: "/about", element: <About /> },
  { path: "/contact", element: <Contact /> },
  { path: "/valuation", element: <Valuation /> },
  { path: "/property/:slug", element: <PropertyDetail /> },
  { path: "/development/:slug", element: <DevelopmentDetail /> },
  { path: "/commercial-property", element: <CommercialProperty /> },
  { path: "/c/commercial-advertising", element: <CommercialAdvertising /> },
  { path: "/commute-time", element: <CommuteTime /> },
  { path: "/schools", element: <Schools /> },
  { path: "/living-in-nairobi", element: <LivingNairobi /> },
  { path: "/directory", element: <Directory /> },
  { path: "/directory/:categorySlug", element: <DirectoryCategory /> },
  { path: "/directory/place/:id", element: <PlaceDetail /> },
  { path: "/night-life", element: <NightLife /> },
  // ── Legal & Support (linked from the global footer) ──
  { path: "/privacy-policy", element: <LegalPage pageKey="privacy-policy" /> },
  { path: "/terms-conditions", element: <LegalPage pageKey="terms-conditions" /> },
  { path: "/cookie-policy", element: <LegalPage pageKey="cookie-policy" /> },
  { path: "/disclaimer", element: <LegalPage pageKey="disclaimer" /> },
  { path: "/help-center", element: <LegalPage pageKey="help-center" /> },
  { path: "/report-a-listing", element: <LegalPage pageKey="report-a-listing" /> },
  { path: "/sitemap.xml", element: <SitemapXmlPage /> },

  // ─────────────────────────────────────────────────────────────
  // PORTAL 1 — AGENT (public signup → approval gate → agent portal)
  // ─────────────────────────────────────────────────────────────
  { path: "/agent/login", element: <AgentLogin /> },
  { path: "/agent/signup", element: <AgentSignup /> },
  { path: "/agent/approval", element: <AgentPending /> },
  { path: "/agent/forgot-password", element: <ForgotPassword /> },
  {
    path: "/agent",
    element: (
      <PortalGuard portal="agent">
        <AgentPortalLayout />
      </PortalGuard>
    ),
    children: agentChildren,
  },

  // ─────────────────────────────────────────────────────────────
  // PORTAL 2 — ADMIN (private gateway, no public signup)
  // ─────────────────────────────────────────────────────────────
  { path: "/admin/login", element: <AdminLogin /> },
  { path: "/admin/forgot-password", element: <ForgotPassword /> },
  // Secure token-based password reset (single-use, hashed, expiring).
  { path: "/reset-password", element: <ResetPassword /> },
  {
    path: "/admin",
    element: (
      <PortalGuard portal="admin">
        <AdminPortalLayout />
      </PortalGuard>
    ),
    children: adminChildren,
  },

  // ─────────────────────────────────────────────────────────────
  // LEGACY REDIRECTS REMOVED — one path per portal only.
  // /crm/* is gone. Public gateways are /agent/login & /agent/signup,
  // and the private gateway is /admin/login. No /crm alias remains.
  // ─────────────────────────────────────────────────────────────
  { path: "/admin-dashboard", element: <Navigate to="/admin/dashboard" replace /> },
  { path: "/agent-dashboard", element: <Navigate to="/agent/dashboard" replace /> },
  { path: "*", element: <NotFound /> },
];

// Resolves the correct portal home for the logged-in user by role.
export function RoleHomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <></>;
  return <Navigate to={portalHomeFor(user)} replace />;
}

export default routes;