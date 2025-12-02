import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import { Toaster } from './components/ui/sonner';
import Header from './components/Header';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import About from './pages/About';
import SerbianStory from './pages/SerbianStory';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ModeratorDashboard from './pages/ModeratorDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false, requireModerator = false }) => {
  const { isAuthenticated, isAdmin, isModerator, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C1272D]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  if (requireModerator && !isModerator && !isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

const AppContent = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/about" element={<About />} />
          <Route path="/serbian-story" element={<SerbianStory />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/moderator-dashboard" 
            element={
              <ProtectedRoute requireModerator>
                <ModeratorDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
      <Footer />
      <Toaster position="top-right" />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <BrandingProvider>
        <LanguageProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </AuthProvider>
        </LanguageProvider>
      </BrandingProvider>
    </ThemeProvider>
  );
}

export default App;