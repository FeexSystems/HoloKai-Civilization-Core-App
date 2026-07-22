import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { HoloKaiProvider } from '@/lib/HoloKaiContext';
import LandingPage from '@/pages/LandingPage';
import OrbitalLab from '@/pages/OrbitalLab';
import CivilizationCore from '@/pages/CivilizationCore';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// Public / informational
import GuardianProfiles from '@/pages/GuardianProfiles';
import GuardianArchive from '@/pages/GuardianArchive';
import GlobalInsights from '@/pages/GlobalInsights';
import HelpCenter from '@/pages/HelpCenter';
import SystemStatus from '@/pages/SystemStatus';
// Protected / personal
import Dashboard from '@/pages/Dashboard';
import ResearchPortfolio from '@/pages/ResearchPortfolio';
import ResearchJournal from '@/pages/ResearchJournal';
import Notifications from '@/pages/Notifications';
import Settings from '@/pages/Settings';
// Mixed
import CommunityGallery from '@/pages/CommunityGallery';
import ContributionPortal from '@/pages/ContributionPortal';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Landing — public, full vision */}
      <Route path="/" element={<LandingPage />} />

      {/* Orbital Lab — public, immersive entrance */}
      <Route path="/orbital-lab" element={<OrbitalLab />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public / informational pages */}
      <Route path="/guardian-profiles" element={<GuardianProfiles />} />
      <Route path="/guardian-archive" element={<GuardianArchive />} />
      <Route path="/global-insights" element={<GlobalInsights />} />
      <Route path="/help-center" element={<HelpCenter />} />
      <Route path="/system-status" element={<SystemStatus />} />

      {/* Mixed access (readable public, actions may require auth later) */}
      <Route path="/community-gallery" element={<CommunityGallery />} />
      <Route path="/contribution-portal" element={<ContributionPortal />} />

      {/* Protected — authenticated research environment */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/core" element={<CivilizationCore />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/research-portfolio" element={<ResearchPortfolio />} />
        <Route path="/research-journal" element={<ResearchJournal />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <HoloKaiProvider>
            <AuthenticatedApp />
          </HoloKaiProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
