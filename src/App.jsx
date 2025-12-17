import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { GlobalStyles } from "./styles/GlobalStyles";

// Onboarding
import Welcome from "./pages/onboarding/Welcome";
import SeniorLogin from "./pages/onboarding/SeniorLogin";
import NormalLogin from "./pages/onboarding/NormalLogin";
import ForgotPassword from "./pages/onboarding/ForgotPassword";
import EmailVerification from "./pages/onboarding/EmailVerification";

// Normal Mode
import NormalHome from "./pages/normal/Home";
import NormalSearch from "./pages/normal/Search";
import NormalExplore from "./pages/normal/Explore";
import NormalReels from "./pages/normal/Reels";
import NormalUpload from "./pages/normal/Upload";
import NormalStoryCreate from "./pages/normal/StoryCreate";
import NormalProfile from "./pages/normal/Profile";
import NormalProfileEdit from "./pages/normal/ProfileEdit";
import NormalSettings from "./pages/normal/Settings";

// Senior Mode
import SeniorHome from "./pages/senior/Home";
import SeniorWrite from "./pages/senior/Write";
import SeniorProfile from "./pages/senior/Profile";
import SeniorSettings from "./pages/senior/Settings";
import SeniorFamilyHelp from "./pages/senior/FamilyHelp";

function ProtectedRoute({ children, requiredMode }) {
  const { user, mode } = useApp();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredMode && mode !== requiredMode) {
    return (
      <Navigate
        to={mode === "senior" ? "/senior/home" : "/normal/home"}
        replace
      />
    );
  }

  return children;
}

function AppRoutes() {
  const { mode, isDarkMode } = useApp();

  return (
    <>
      <GlobalStyles
        $isSeniorMode={mode === "senior"}
        $isDarkMode={isDarkMode}
      />
      <Routes>
        {/* Onboarding */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login/senior" element={<SeniorLogin />} />
        <Route path="/login/normal" element={<NormalLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/email-verification" element={<EmailVerification />} />

        {/* Normal Mode */}
        <Route
          path="/normal/home"
          element={
            <ProtectedRoute requiredMode="normal">
              <NormalHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/normal/search"
          element={
            <ProtectedRoute requiredMode="normal">
              <NormalSearch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/normal/explore"
          element={
            <ProtectedRoute requiredMode="normal">
              <NormalExplore />
            </ProtectedRoute>
          }
        />
        <Route
          path="/normal/reels"
          element={
            <ProtectedRoute requiredMode="normal">
              <NormalReels />
            </ProtectedRoute>
          }
        />
        <Route
          path="/normal/upload"
          element={
            <ProtectedRoute requiredMode="normal">
              <NormalUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/normal/story-create"
          element={
            <ProtectedRoute requiredMode="normal">
              <NormalStoryCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/normal/profile"
          element={
            <ProtectedRoute requiredMode="normal">
              <NormalProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/normal/profile/edit"
          element={
            <ProtectedRoute requiredMode="normal">
              <NormalProfileEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/normal/settings"
          element={
            <ProtectedRoute requiredMode="normal">
              <NormalSettings />
            </ProtectedRoute>
          }
        />

        {/* Senior Mode */}
        <Route
          path="/senior/home"
          element={
            <ProtectedRoute requiredMode="senior">
              <SeniorHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/senior/write"
          element={
            <ProtectedRoute requiredMode="senior">
              <SeniorWrite />
            </ProtectedRoute>
          }
        />
        <Route
          path="/senior/profile"
          element={
            <ProtectedRoute requiredMode="senior">
              <SeniorProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/senior/settings"
          element={
            <ProtectedRoute requiredMode="senior">
              <SeniorSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/senior/help"
          element={
            <ProtectedRoute requiredMode="senior">
              <SeniorFamilyHelp />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
