import type { RouteObject } from "react-router-dom";
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
import DashboardLayout from "../pages/crm/DashboardLayout";
import Dashboard from "../pages/crm/Dashboard";
import Listings from "../pages/crm/Listings";
import Leads from "../pages/crm/Leads";
import Deals from "../pages/crm/Deals";
import Contacts from "../pages/crm/Contacts";
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
import ProtectedRoute from "../components/feature/ProtectedRoute";
import CommuteTime from "../pages/CommuteTime";
import Schools from "../pages/Schools";
import NavLinks from "../pages/crm/NavLinks";
import ContactSectionsAdmin from "../pages/crm/ContactSectionsAdmin";

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
    path: "/crm/dashboard",
    element: (
      <ProtectedRoute>
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
    path: "/crm/management",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <ManagementOptions />,
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