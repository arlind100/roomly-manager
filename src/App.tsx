import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import Index from "./pages/Index";
import Booking from "./pages/Booking";
import Restaurant from "./pages/Restaurant";
import NotFound from "./pages/NotFound";

// Admin
import AdminLogin from "./pages/admin/AdminLogin";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminReservations from "./pages/admin/AdminReservations";
import AdminRoomTypes from "./pages/admin/AdminRoomTypes";
import AdminAvailability from "./pages/admin/AdminAvailability";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminFrontDesk from "./pages/admin/AdminFrontDesk";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/restaurant" element={<Restaurant />} />

              {/* Admin */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="front-desk" element={<AdminFrontDesk />} />
                <Route path="reservations" element={<AdminReservations />} />
                <Route path="room-types" element={<AdminRoomTypes />} />
                <Route path="availability" element={<AdminAvailability />} />
                <Route path="pricing" element={<AdminPricing />} />
                <Route path="staff" element={<AdminStaff />} />
                <Route path="invoices" element={<AdminInvoices />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
