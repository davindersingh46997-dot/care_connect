import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';

// Pages
import LandingPage from './pages/LandingPage';
import DoctorSearchPage from './pages/DoctorSearchPage';
import DoctorProfilePage from './pages/DoctorProfilePage';
import PatientQueuePage from './pages/PatientQueuePage';
import PatientProfilePage from './pages/PatientProfilePage';
import PatientSignupPage from './pages/PatientSignupPage';
import DoctorRegisterPage from './pages/DoctorRegisterPage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import DoctorQueueManagerPage from './pages/DoctorQueueManagerPage';
import DoctorProfileEditPage from './pages/DoctorProfileEditPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public & Patient Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/how-it-works" element={<LandingPage />} />
              <Route path="/doctors" element={<DoctorSearchPage />} />
              <Route path="/search" element={<DoctorSearchPage />} />
              <Route path="/patient/search" element={<DoctorSearchPage />} />
              <Route path="/patient/doctors" element={<DoctorSearchPage />} />
              <Route path="/doctors/:id" element={<DoctorProfilePage />} />
              <Route path="/patient/doctors/:id" element={<DoctorProfilePage />} />
              <Route path="/patient/queue" element={<PatientQueuePage />} />
              <Route path="/patient/dashboard" element={<PatientQueuePage />} />
              <Route path="/patient/profile" element={<PatientProfilePage />} />

              {/* Doctor Registration & Workspace Routes */}
              <Route path="/doctor/register" element={<DoctorRegisterPage />} />
              <Route path="/for-doctors" element={<Navigate to="/doctor/register" replace />} />
              <Route path="/doctor/dashboard" element={<DoctorDashboardPage />} />
              <Route path="/doctor/queue" element={<DoctorQueueManagerPage />} />
              <Route path="/doctor/profile" element={<DoctorProfileEditPage />} />

              {/* Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/doctor/login" element={<LoginPage />} />
              <Route path="/patient/signup" element={<PatientSignupPage />} />
              <Route path="/signup" element={<PatientSignupPage />} />
              <Route path="/register" element={<PatientSignupPage />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <Chatbot />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

