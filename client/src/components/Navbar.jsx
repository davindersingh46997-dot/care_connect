import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Activity,
  Search,
  Clock,
  User,
  Stethoscope,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  Moon,
  Sun
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isDoctor, isPatient, logout } = useAuth();
  const [activeQueue, setActiveQueue] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkTheme, setDarkTheme] = useState(() => localStorage.getItem('careconnect_theme') === 'dark');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkTheme);
    localStorage.setItem('careconnect_theme', darkTheme ? 'dark' : 'light');
  }, [darkTheme]);

  useEffect(() => {
    const handleThemeChange = (event) => setDarkTheme(event.detail.dark);
    window.addEventListener('careconnect-theme-change', handleThemeChange);
    return () => window.removeEventListener('careconnect-theme-change', handleThemeChange);
  }, []);

  // Check if authenticated patient has an active queue entry
  useEffect(() => {
    let isMounted = true;
    const fetchQueueStatus = async () => {
      if (isPatient && user?.id) {
        try {
          const res = await api.queue.getPatientQueue(user.id);
          if (isMounted && res.has_active_queue) {
            setActiveQueue(res.active_queue);
          } else if (isMounted) {
            setActiveQueue(null);
          }
        } catch (err) {
          // ignore background check errors
        }
      } else {
        setActiveQueue(null);
      }
    };

    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isPatient, user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-500 flex items-center justify-center text-white shadow-sm group-hover:shadow-teal-500/20 transition-all">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                Care Connect
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                  REAL-TIME
                </span>
              </span>
              <p className="text-[10px] font-medium text-slate-500 -mt-1 hidden sm:block">
                Know where to go. Know when to go.
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/doctors"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname.startsWith('/doctors') || location.pathname.startsWith('/patient/doctors')
                  ? 'text-teal-700 bg-teal-50/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Find a Doctor
            </Link>

            <Link
              to="/how-it-works"
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              How It Works
            </Link>

            <Link
              to="/doctor/register"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/doctor/register'
                  ? 'text-teal-700 bg-teal-50/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              For Doctors
            </Link>

            {/* Patient Active Queue Pill */}
            {activeQueue && isPatient && (
              <Link
                to="/patient/queue"
                className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors animate-pulse-glow"
              >
                <Clock className="w-3.5 h-3.5 text-emerald-600 animate-spin" style={{ animationDuration: '8s' }} />
                <span>Your Token: #{activeQueue.token_number}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px]">
                  {activeQueue.is_next ? 'Next!' : `~${activeQueue.estimated_wait_mins}m`}
                </span>
              </Link>
            )}

            {isDoctor && (
              <Link
                to="/doctor/dashboard"
                className={`ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  location.pathname === '/doctor/dashboard'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Doctor Portal</span>
              </Link>
            )}
          </nav>

          {/* Right Action buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDarkTheme((current) => !current)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label={darkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
              title="Switch theme"
            >
              {darkTheme ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {isDoctor ? (
                  <>
                    <Link
                      to="/doctor/queue"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      Live Queue Desk
                    </Link>
                    <Link
                      to="/doctor/profile"
                      className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Doctor Profile"
                    >
                      <User className="w-5 h-5" />
                    </Link>
                  </>
                ) : (
                  <>
                    {activeQueue && (
                      <Link
                        to="/patient/queue"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Track Token #{activeQueue.token_number}
                      </Link>
                    )}
                    <Link
                      to="/patient/profile"
                      className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Patient Profile"
                    >
                      <User className="w-5 h-5" />
                    </Link>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/patient/signup"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm hover:shadow-teal-500/20 transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setDarkTheme((current) => !current)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label={darkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {darkTheme ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {activeQueue && (
              <Link
                to="/patient/queue"
                className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold"
              >
                #{activeQueue.token_number}
              </Link>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown navigation */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
          <Link
            to="/doctors"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Find a Doctor
          </Link>
          <Link
            to="/how-it-works"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            How It Works
          </Link>
          <Link
            to="/doctor/register"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            For Doctors
          </Link>

          {isAuthenticated ? (
            <>
              {isDoctor ? (
                <>
                  <Link
                    to="/doctor/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-teal-700 hover:bg-teal-50"
                  >
                    Doctor Dashboard
                  </Link>
                  <Link
                    to="/doctor/queue"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Live Queue Desk
                  </Link>
                  <Link
                    to="/doctor/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Clinic Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/patient/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-teal-700 hover:bg-teal-50"
                  >
                    Patient Dashboard
                  </Link>
                  <Link
                    to="/patient/queue"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Live Queue Tracker
                  </Link>
                  <Link
                    to="/patient/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    My Profile
                  </Link>
                </>
              )}
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="block text-center py-2 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                Sign In
              </Link>
              <Link
                to="/patient/signup"
                onClick={() => setMenuOpen(false)}
                className="block text-center py-2 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

