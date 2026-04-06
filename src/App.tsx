import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { ErrorBoundary } from "@/components/admin/ErrorBoundary";
import NotFound from "./pages/NotFound";

// Admin
import AdminLogin from "./pages/admin/AdminLogin";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminReservations from "./pages/admin/AdminReservations";
import AdminRoomTypes from "./pages/admin/AdminRoomTypes";
import AdminRooms from "./pages/admin/AdminRooms";
import AdminAvailability from "./pages/admin/AdminAvailability";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminLostFound from "./pages/admin/AdminLostFound";

// Superadmin
import SuperadminLogin from "./pages/superadmin/SuperadminLogin";
import { SuperadminRoute } from "@/components/superadmin/SuperadminRoute";
import SuperadminLayout from "@/components/superadmin/SuperadminLayout";
import SuperadminDashboard from "./pages/superadmin/SuperadminDashboard";
import SuperadminHotels from "./pages/superadmin/SuperadminHotels";
import CreateHotel from "./pages/superadmin/CreateHotel";
import HotelDetail from "./pages/superadmin/HotelDetail";
import SuperadminBilling from "./pages/superadmin/SuperadminBilling";
import SuperadminAudit from "./pages/superadmin/SuperadminAudit";
import SuperadminSettings from "./pages/superadmin/SuperadminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ErrorBoundary fallbackTitle="The application encountered an error">
            <BrowserRouter>
              <Routes>
                {/* Redirect root to admin dashboard */}
                <Route path="/" element={<Navigate to="/admin" replace />} />

                {/* Admin */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                  <Route index element={<ErrorBoundary fallbackTitle="Dashboard error"><AdminDashboard /></ErrorBoundary>} />
                  <Route path="reservations" element={<ErrorBoundary fallbackTitle="Reservations error"><AdminReservations /></ErrorBoundary>} />
                  <Route path="room-types" element={<ErrorBoundary fallbackTitle="Room types error"><AdminRoomTypes /></ErrorBoundary>} />
                  <Route path="rooms" element={<ErrorBoundary fallbackTitle="Rooms error"><AdminRooms /></ErrorBoundary>} />
                  <Route path="availability" element={<ErrorBoundary fallbackTitle="Availability error"><AdminAvailability /></ErrorBoundary>} />
                  <Route path="pricing" element={<ErrorBoundary fallbackTitle="Pricing error"><AdminPricing /></ErrorBoundary>} />
                  <Route path="staff" element={<ErrorBoundary fallbackTitle="Staff error"><AdminStaff /></ErrorBoundary>} />
                  <Route path="invoices" element={<ErrorBoundary fallbackTitle="Invoices error"><AdminInvoices /></ErrorBoundary>} />
                  <Route path="lost-found" element={<ErrorBoundary fallbackTitle="Lost & Found error"><AdminLostFound /></ErrorBoundary>} />
                  <Route path="analytics-reports" element={<ErrorBoundary fallbackTitle="Analytics error"><AdminAnalytics /></ErrorBoundary>} />
                  <Route path="settings" element={<ErrorBoundary fallbackTitle="Settings error"><AdminSettings /></ErrorBoundary>} />
                </Route>

                {/* Superadmin */}
                <Route path="/superadmin/login" element={<SuperadminLogin />} />
                <Route path="/superadmin" element={<SuperadminRoute><SuperadminLayout /></SuperadminRoute>}>
                  <Route index element={<SuperadminDashboard />} />
                  <Route path="hotels" element={<SuperadminHotels />} />
                  <Route path="hotels/new" element={<CreateHotel />} />
                  <Route path="hotels/:hotelId" element={<HotelDetail />} />
                  <Route path="billing" element={<SuperadminBilling />} />
                  <Route path="audit" element={<SuperadminAudit />} />
                  <Route path="settings" element={<SuperadminSettings />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
