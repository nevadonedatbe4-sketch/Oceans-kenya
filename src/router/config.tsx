import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "../components/feature/ProtectedRoute";

// Public pages are code-split too, so a visitor downloads only the page
// they actually landed on rather than every public route.
const NotFound = lazy(() => import("../pages/NotFound"));
// Public route chunks. Each loader is a named const so the *same* function
// object backs both lazy() and the prefetch table below — they cannot drift.
const loadHome = () => import("../pages/home/page");
const Home = lazy(loadHome);
const loadBuy = () => import("../pages/Buy");
const Buy = lazy(loadBuy);
const loadRent = () => import("../pages/Rent");
const Rent = lazy(loadRent);
const loadAllProperties = () => import("../pages/AllProperties");
const AllProperties = lazy(loadAllProperties);
const loadLandlords = () => import("../pages/Landlords");
const Landlords = lazy(loadLandlords);
const loadNeighbourhoods = () => import("../pages/Neighbourhoods");
const Neighbourhoods = lazy(loadNeighbourhoods);
const loadNeighbourhoodDetail = () => import("../pages/NeighbourhoodDetail");
const NeighbourhoodDetail = lazy(loadNeighbourhoodDetail);
const loadNewDevelopments = () => import("../pages/NewDevelopments");
const NewDevelopments = lazy(loadNewDevelopments);
const loadAbout = () => import("../pages/About");
const About = lazy(loadAbout);
const loadContact = () => import("../pages/Contact");
const Contact = lazy(loadContact);
const loadValuation = () => import("../pages/Valuation");
const Valuation = lazy(loadValuation);
const loadPropertyDetail = () => import("../pages/PropertyDetail");
const PropertyDetail = lazy(loadPropertyDetail);
const loadJointVentures = () => import("../pages/JointVentures");
const JointVentures = lazy(loadJointVentures);
const loadJointVentureProjectDetail = () => import("../pages/JointVentureProjectDetail");
const JointVentureProjectDetail = lazy(loadJointVentureProjectDetail);
const loadCommercialProperty = () => import("../pages/CommercialProperty");
const CommercialProperty = lazy(loadCommercialProperty);
const loadCommercialAdvertising = () => import("../pages/CommercialAdvertising");
const CommercialAdvertising = lazy(loadCommercialAdvertising);
const loadCommuteTime = () => import("../pages/CommuteTime");
const CommuteTime = lazy(loadCommuteTime);
const loadSchools = () => import("../pages/Schools");
const Schools = lazy(loadSchools);
const loadBlogDetail = () => import("../pages/BlogDetail");
const BlogDetail = lazy(loadBlogDetail);

// The CRM/admin console is ~62% of the source and is never used by public
// visitors, so it is loaded on demand. Vite emits these as separate chunks
// that are only fetched when an admin actually navigates to /crm/*.
const CRMLogin = lazy(() => import("../pages/crm/Login"));
const ForgotPassword = lazy(() => import("../pages/crm/ForgotPassword"));
const UpdatePassword = lazy(() => import("../pages/crm/UpdatePassword"));
const Signup = lazy(() => import("../pages/crm/Signup"));
const DashboardLayout = lazy(() => import("../pages/crm/DashboardLayout"));
const Dashboard = lazy(() => import("../pages/crm/Dashboard"));
const Listings = lazy(() => import("../pages/crm/Listings"));
const Leads = lazy(() => import("../pages/crm/Leads"));
const Deals = lazy(() => import("../pages/crm/Deals"));
const Contacts = lazy(() => import("../pages/crm/Contacts"));
const Inbox = lazy(() => import("../pages/crm/Inbox"));
const Agents = lazy(() => import("../pages/crm/Agents"));
const MediaLibrary = lazy(() => import("../pages/crm/MediaLibrary"));
const ListingEdit = lazy(() => import("../pages/crm/ListingEdit"));
const CRMNeighbourhoods = lazy(() => import("../pages/crm/Neighbourhoods"));
const NeighbourhoodEdit = lazy(() => import("../pages/crm/NeighbourhoodEdit"));
const Activities = lazy(() => import("../pages/crm/Activities"));
const Insights = lazy(() => import("../pages/crm/Insights"));
const HomeSections = lazy(() => import("../pages/crm/HomeSections"));
const BlogAdmin = lazy(() => import("../pages/crm/BlogAdmin"));
const SiteSettings = lazy(() => import("../pages/crm/SiteSettings"));
const UsersAndRoles = lazy(() => import("../pages/crm/UsersAndRoles"));
const ManagementOptions = lazy(() => import("../pages/crm/ManagementOptions"));
const MenuManager = lazy(() => import("../pages/crm/MenuManager"));
const Testimonials = lazy(() => import("../pages/crm/Testimonials"));
const SyncActions = lazy(() => import("../pages/crm/SyncActions"));
const JointVenturesCRM = lazy(() => import("../pages/crm/JointVentures"));
const JVSubmissionEdit = lazy(() => import("../pages/crm/JVSubmissionEdit"));
const JVProjectEdit = lazy(() => import("../pages/crm/JVProjectEdit"));
const NavLinks = lazy(() => import("../pages/crm/NavLinks"));
const ContactSectionsAdmin = lazy(() => import("../pages/crm/ContactSectionsAdmin"));
const ProfilePage = lazy(() => import("../pages/crm/Profile"));
const DashboardRedirect = lazy(() => import("../pages/crm/DashboardRedirect"));
const PipelineView = lazy(() => import("../pages/crm/PipelineView"));
const MgmtGeneral = lazy(() => import("../pages/crm/management/General"));
const MgmtBranding = lazy(() => import("../pages/crm/management/Branding"));
const MgmtCurrency = lazy(() => import("../pages/crm/management/Currency"));
const MgmtTypography = lazy(() => import("../pages/crm/management/Typography"));
const MgmtListingsPages = lazy(() => import("../pages/crm/management/ListingsPages"));
const MgmtSearchFilters = lazy(() => import("../pages/crm/management/SearchFilters"));
const MgmtPropertySettings = lazy(() => import("../pages/crm/management/PropertySettings"));
const MgmtRequiredFields = lazy(() => import("../pages/crm/management/RequiredFields"));
const MgmtHeroSection = lazy(() => import("../pages/crm/management/HeroSection"));
const MgmtHomepageControls = lazy(() => import("../pages/crm/management/HomepageControls"));
const MgmtBreadcrumbs = lazy(() => import("../pages/crm/management/Breadcrumbs"));
const MgmtContactCompany = lazy(() => import("../pages/crm/management/ContactCompany"));
const MgmtSocialMedia = lazy(() => import("../pages/crm/management/SocialMedia"));
const MgmtMapsLocation = lazy(() => import("../pages/crm/management/MapsLocation"));
const MgmtPropertyDetails = lazy(() => import("../pages/crm/management/PropertyDetails"));
const MgmtStylingCards = lazy(() => import("../pages/crm/management/StylingCards"));
const MgmtStylingDetails = lazy(() => import("../pages/crm/management/StylingDetails"));
const MgmtDashboardMenu = lazy(() => import("../pages/crm/management/DashboardMenuPage"));
const MgmtCacheSync = lazy(() => import("../pages/crm/management/CacheSync"));
const MgmtGlobalDesign = lazy(() => import("../pages/crm/management/GlobalDesign"));
const MgmtComponentSettings = lazy(() => import("../pages/crm/management/ComponentSettings"));
const MgmtPageBuilder = lazy(() => import("../pages/crm/management/PageBuilder"));
const MgmtDesignSystemHub = lazy(() => import("../pages/crm/management/DesignSystemHub"));
const MgmtColourPalette = lazy(() => import("../pages/crm/management/ColourPalette"));
const MgmtSpacingSizes = lazy(() => import("../pages/crm/management/SpacingSizes"));
const MgmtCardBoxSystem = lazy(() => import("../pages/crm/management/CardBoxSystem"));
const MgmtButtonSystem = lazy(() => import("../pages/crm/management/ButtonSystem"));
const MgmtCardV7 = lazy(() => import("../pages/crm/management/CardV7"));
const MgmtCarouselSystem = lazy(() => import("../pages/crm/management/CarouselSystem"));
const MgmtGlobalPageControl = lazy(() => import("../pages/crm/management/GlobalPageControl"));
const MgmtResponsiveControl = lazy(() => import("../pages/crm/management/ResponsiveControl"));
const MgmtFormLayoutManager = lazy(() => import("../pages/crm/management/FormLayoutManager"));
const MgmtPropertyDetailLayout = lazy(() => import("../pages/crm/management/PropertyDetailLayout"));
const MgmtLandlordsPage = lazy(() => import("../pages/crm/management/LandlordsPage"));
const MgmtLandlordsImages = lazy(() => import("../pages/crm/management/LandlordsImages"));
const MgmtNewDevelopmentsPage = lazy(() => import("../pages/crm/management/NewDevelopmentsPage"));
const MgmtAboutPage = lazy(() => import("../pages/crm/management/AboutPage"));
const MgmtContactPage = lazy(() => import("../pages/crm/management/ContactPage"));
const MgmtNeighbourhoodsPage = lazy(() => import("../pages/crm/management/NeighbourhoodsPage"));

// Management sub-pages

// New management sub-pages

// Page Management CMS pages


// Public route patterns paired with their chunk loader, consumed by the hover
// prefetcher in ./prefetch. CRM routes are deliberately excluded: an admin is
// already inside the app, and those chunks are large (ListingEdit alone is
// 160 kB) so speculatively fetching them would waste bandwidth.
export const PUBLIC_ROUTE_LOADERS: ReadonlyArray<readonly [string, () => Promise<unknown>]> = [
  ["/", loadHome],
  ["/buy", loadBuy],
  ["/rent", loadRent],
  ["/all-properties", loadAllProperties],
  ["/landlords", loadLandlords],
  ["/neighbourhoods", loadNeighbourhoods],
  ["/neighbourhood/:slug", loadNeighbourhoodDetail],
  ["/blog/:slug", loadBlogDetail],
  ["/new-developments", loadNewDevelopments],
  ["/joint-ventures", loadJointVentures],
  ["/joint-ventures/project/:slug", loadJointVentureProjectDetail],
  ["/about", loadAbout],
  ["/contact", loadContact],
  ["/valuation", loadValuation],
  ["/property/:slug", loadPropertyDetail],
  ["/commercial-property", loadCommercialProperty],
  ["/c/commercial-advertising", loadCommercialAdvertising],
  ["/commute-time", loadCommuteTime],
  ["/schools", loadSchools],
];

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/buy",
    element: <Buy />,
  },
  {
    path: "/rent",
    element: <Rent />,
  },
  {
    path: "/all-properties",
    element: <AllProperties />,
  },
  {
    path: "/landlords",
    element: <Landlords />,
  },
  {
    path: "/neighbourhoods",
    element: <Neighbourhoods />,
  },
  {
    path: "/neighbourhood/:slug",
    element: <NeighbourhoodDetail />,
  },
  {
    path: "/blog/:slug",
    element: <BlogDetail />,
  },
  {
    path: "/new-developments",
    element: <NewDevelopments />,
  },
  {
    path: "/joint-ventures",
    element: <JointVentures />,
  },
  {
    path: "/joint-ventures/project/:slug",
    element: <JointVentureProjectDetail />,
  },
  {
    path: "/about",
    element: <About />,
  },
  {
    path: "/contact",
    element: <Contact />,
  },
  {
    path: "/valuation",
    element: <Valuation />,
  },
  {
    path: "/property/:slug",
    element: <PropertyDetail />,
  },
  {
    path: "/crm/login",
    element: <CRMLogin />,
  },
  {
    path: "/crm/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/crm/update-password",
    element: <UpdatePassword />,
  },
  {
    path: "/crm/signup",
    element: <Signup />,
  },
  {
    path: "/admin-dashboard",
    element: (
      <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Dashboard />,
      },
    ],
  },
  {
    path: "/agent-dashboard",
    element: (
      <ProtectedRoute requiredRoles={['agent', 'super_admin']}>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Dashboard />,
      },
    ],
  },
  {
    path: "/crm/dashboard",
    element: <DashboardRedirect />,
  },
  {
    path: "/crm/listings",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Listings />,
      },
    ],
  },
  {
    path: "/crm/listings/new",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <ListingEdit />,
      },
    ],
  },
  {
    path: "/crm/listings/edit/:id",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <ListingEdit />,
      },
    ],
  },
  {
    path: "/crm/leads",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Leads />,
      },
    ],
  },
  {
    path: "/crm/pipeline",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <PipelineView />,
      },
    ],
  },
  {
    path: "/crm/deals",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Deals />,
      },
    ],
  },
  {
    path: "/crm/agents",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Agents />,
      },
    ],
  },
  {
    path: "/crm/contacts",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Contacts />,
      },
    ],
  },
  {
    path: "/crm/inbox",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Inbox />,
      },
    ],
  },
  {
    path: "/crm/enquiries",
    element: (
      <ProtectedRoute>
        <Navigate to="/crm/inbox" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "/crm/media",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <MediaLibrary />,
      },
    ],
  },
  {
    path: "/crm/neighbourhoods",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <CRMNeighbourhoods />,
      },
    ],
  },
  {
    path: "/crm/neighbourhoods/new",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <NeighbourhoodEdit />,
      },
    ],
  },
  {
    path: "/crm/neighbourhoods/edit/:id",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <NeighbourhoodEdit />,
      },
    ],
  },
  {
    path: "/crm/activities",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Activities />,
      },
    ],
  },
  {
    path: "/crm/insights",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Insights />,
      },
    ],
  },
  {
    path: "/crm/home-sections",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <HomeSections />,
      },
    ],
  },
  {
    path: "/crm/blog",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <BlogAdmin />,
      },
    ],
  },
  {
    path: "/crm/site-settings",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <SiteSettings />,
      },
    ],
  },
  {
    path: "/crm/users",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <UsersAndRoles />,
      },
    ],
  },
  {
    path: "/crm/profile",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: "/crm/management",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Navigate to="/crm/management/general" replace />,
      },
      {
        path: "general",
        element: <MgmtGeneral />,
      },
      {
        path: "branding",
        element: <MgmtBranding />,
      },
      {
        path: "currency",
        element: <MgmtCurrency />,
      },
      {
        path: "typography",
        element: <MgmtTypography />,
      },
      {
        path: "listings-pages",
        element: <MgmtListingsPages />,
      },
      {
        path: "search",
        element: <MgmtSearchFilters />,
      },
      {
        path: "property",
        element: <MgmtPropertySettings />,
      },
      {
        path: "required",
        element: <MgmtRequiredFields />,
      },
      {
        path: "hero",
        element: <MgmtHeroSection />,
      },
      {
        path: "homepage",
        element: <MgmtHomepageControls />,
      },
      {
        path: "breadcrumbs",
        element: <MgmtBreadcrumbs />,
      },
      {
        path: "contact",
        element: <MgmtContactCompany />,
      },
      {
        path: "social",
        element: <MgmtSocialMedia />,
      },
      {
        path: "maps",
        element: <MgmtMapsLocation />,
      },
      {
        path: "property-details",
        element: <MgmtPropertyDetails />,
      },
      {
        path: "styling-cards",
        element: <MgmtStylingCards />,
      },
      {
        path: "styling-details",
        element: <MgmtStylingDetails />,
      },
      {
        path: "dashboard-menu",
        element: <MgmtDashboardMenu />,
      },
      {
        path: "cache",
        element: <MgmtCacheSync />,
      },
      {
        path: "global-design",
        element: <MgmtGlobalDesign />,
      },
      {
        path: "component-settings",
        element: <MgmtComponentSettings />,
      },
      {
        path: "page-builder",
        element: <MgmtPageBuilder />,
      },
      {
        path: "design-system-hub",
        element: <MgmtDesignSystemHub />,
      },
      {
        path: "colour-palette",
        element: <MgmtColourPalette />,
      },
      {
        path: "spacing-sizes",
        element: <MgmtSpacingSizes />,
      },
      {
        path: "card-box",
        element: <MgmtCardBoxSystem />,
      },
      {
        path: "button-system",
        element: <MgmtButtonSystem />,
      },
      {
        path: "card-v7",
        element: <MgmtCardV7 />,
      },
      {
        path: "carousel",
        element: <MgmtCarouselSystem />,
      },
      {
        path: "global-page-control",
        element: <MgmtGlobalPageControl />,
      },
      {
        path: "responsive",
        element: <MgmtResponsiveControl />,
      },
      {
        path: "form-layout",
        element: <MgmtFormLayoutManager />,
      },
      {
        path: "property-detail-layout",
        element: <MgmtPropertyDetailLayout />,
      },
      {
        path: "landlords-page",
        element: <MgmtLandlordsPage />,
      },
      {
        path: "landlords-images",
        element: <MgmtLandlordsImages />,
      },
      {
        path: "new-developments-page",
        element: <MgmtNewDevelopmentsPage />,
      },
      {
        path: "about-page",
        element: <MgmtAboutPage />,
      },
      {
        path: "contact-page",
        element: <MgmtContactPage />,
      },
      {
        path: "neighbourhoods-page",
        element: <MgmtNeighbourhoodsPage />,
      },
    ],
  },
  {
    path: "/crm/menu",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <MenuManager />,
      },
    ],
  },
  {
    path: "/crm/testimonials",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Testimonials />,
      },
    ],
  },
  {
    path: "/crm/sync",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <SyncActions />,
      },
    ],
  },
  {
    path: "/crm/joint-ventures",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <JointVenturesCRM />,
      },
    ],
  },
  {
    path: "/crm/joint-ventures/new",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <JVSubmissionEdit />,
      },
    ],
  },
  {
    path: "/crm/joint-ventures/projects/new",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <JVProjectEdit />,
      },
    ],
  },
  {
    path: "/crm/joint-ventures/projects/edit/:id",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <JVProjectEdit />,
      },
    ],
  },
  {
    path: "/crm/nav-links",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <NavLinks />,
      },
    ],
  },
  {
    path: "/crm/contact-sections",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <ContactSectionsAdmin />,
      },
    ],
  },
  {
    path: "/commercial-property",
    element: <CommercialProperty />,
  },
  {
    path: "/c/commercial-advertising",
    element: <CommercialAdvertising />,
  },
  {
    path: "/commute-time",
    element: <CommuteTime />,
  },
  {
    path: "/schools",
    element: <Schools />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;