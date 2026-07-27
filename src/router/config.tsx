import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import Buy from "../pages/Buy";
import Rent from "../pages/Rent";
import AllProperties from "../pages/AllProperties";
import Landlords from "../pages/Landlords";
import Neighbourhoods from "../pages/Neighbourhoods";
import NeighbourhoodDetail from "../pages/NeighbourhoodDetail";
import NewDevelopments from "../pages/NewDevelopments";
import About from "../pages/About";
import Contact from "../pages/Contact";
import Valuation from "../pages/Valuation";
import PropertyDetail from "../pages/PropertyDetail";
import JointVentures from "../pages/JointVentures";
import CRMLogin from "../pages/crm/Login";
import ForgotPassword from "../pages/crm/ForgotPassword";
import UpdatePassword from "../pages/crm/UpdatePassword";
import Signup from "../pages/crm/Signup";
import DashboardLayout from "../pages/crm/DashboardLayout";
import Dashboard from "../pages/crm/Dashboard";
import Listings from "../pages/crm/Listings";
import Leads from "../pages/crm/Leads";
import Deals from "../pages/crm/Deals";
import Contacts from "../pages/crm/Contacts";
import Enquiries from "../pages/crm/Enquiries";
import Inbox from "../pages/crm/Inbox";
import Agents from "../pages/crm/Agents";
import MediaLibrary from "../pages/crm/MediaLibrary";
import ListingEdit from "../pages/crm/ListingEdit";
import CRMNeighbourhoods from "../pages/crm/Neighbourhoods";
import NeighbourhoodEdit from "../pages/crm/NeighbourhoodEdit";
import Activities from "../pages/crm/Activities";
import Insights from "../pages/crm/Insights";
import HomeSections from "../pages/crm/HomeSections";
import BlogAdmin from "../pages/crm/BlogAdmin";
import SiteSettings from "../pages/crm/SiteSettings";
import UsersAndRoles from "../pages/crm/UsersAndRoles";
import ManagementOptions from "../pages/crm/ManagementOptions";
import MenuManager from "../pages/crm/MenuManager";
import Testimonials from "../pages/crm/Testimonials";
import SyncActions from "../pages/crm/SyncActions";
import JointVenturesCRM from "../pages/crm/JointVentures";
import ProtectedRoute from "../components/feature/ProtectedRoute";
import CommuteTime from "../pages/CommuteTime";
import Schools from "../pages/Schools";
import NavLinks from "../pages/crm/NavLinks";
import ContactSectionsAdmin from "../pages/crm/ContactSectionsAdmin";
import ProfilePage from "../pages/crm/Profile";
import BlogDetail from "../pages/BlogDetail";
import DashboardRedirect from "../pages/crm/DashboardRedirect";
import PipelineView from "../pages/crm/PipelineView";

// Management sub-pages
import MgmtGeneral from "../pages/crm/management/General";
import MgmtBranding from "../pages/crm/management/Branding";
import MgmtCurrency from "../pages/crm/management/Currency";
import MgmtTypography from "../pages/crm/management/Typography";
import MgmtListingsPages from "../pages/crm/management/ListingsPages";
import MgmtSearchFilters from "../pages/crm/management/SearchFilters";
import MgmtPropertySettings from "../pages/crm/management/PropertySettings";
import MgmtRequiredFields from "../pages/crm/management/RequiredFields";
import MgmtHeroSection from "../pages/crm/management/HeroSection";
import MgmtHomepageControls from "../pages/crm/management/HomepageControls";
import MgmtBreadcrumbs from "../pages/crm/management/Breadcrumbs";
import MgmtContactCompany from "../pages/crm/management/ContactCompany";
import MgmtSocialMedia from "../pages/crm/management/SocialMedia";
import MgmtMapsLocation from "../pages/crm/management/MapsLocation";
import MgmtPropertyDetails from "../pages/crm/management/PropertyDetails";
import MgmtStylingCards from "../pages/crm/management/StylingCards";
import MgmtStylingDetails from "../pages/crm/management/StylingDetails";
import MgmtDashboardMenu from "../pages/crm/management/DashboardMenuPage";
import MgmtCacheSync from "../pages/crm/management/CacheSync";

// New management sub-pages
import MgmtGlobalDesign from "../pages/crm/management/GlobalDesign";
import MgmtComponentSettings from "../pages/crm/management/ComponentSettings";
import MgmtPageBuilder from "../pages/crm/management/PageBuilder";
import MgmtDesignSystemHub from "../pages/crm/management/DesignSystemHub";
import MgmtColourPalette from "../pages/crm/management/ColourPalette";
import MgmtSpacingSizes from "../pages/crm/management/SpacingSizes";
import MgmtCardBoxSystem from "../pages/crm/management/CardBoxSystem";
import MgmtButtonSystem from "../pages/crm/management/ButtonSystem";
import MgmtCardV7 from "../pages/crm/management/CardV7";
import MgmtCarouselSystem from "../pages/crm/management/CarouselSystem";
import MgmtGlobalPageControl from "../pages/crm/management/GlobalPageControl";
import MgmtResponsiveControl from "../pages/crm/management/ResponsiveControl";
import MgmtFormLayoutManager from "../pages/crm/management/FormLayoutManager";
import MgmtPropertyDetailLayout from "../pages/crm/management/PropertyDetailLayout";

// Page Management CMS pages
import MgmtLandlordsPage from "../pages/crm/management/LandlordsPage";
import MgmtLandlordsImages from "../pages/crm/management/LandlordsImages";
import MgmtNewDevelopmentsPage from "../pages/crm/management/NewDevelopmentsPage";
import MgmtAboutPage from "../pages/crm/management/AboutPage";
import MgmtContactPage from "../pages/crm/management/ContactPage";
import MgmtNeighbourhoodsPage from "../pages/crm/management/NeighbourhoodsPage";

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
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Enquiries />,
      },
    ],
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