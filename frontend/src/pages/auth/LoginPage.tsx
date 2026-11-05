import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  UserCheck,
  FileCheck,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { isValidEmailAddress } from '../../utils/localEngine';
import type { UserRole } from '../../types';

interface DemoAccount {
  roleTitle: string;
  roleBadge: string;
  email: string;
  password: string;
  dashboardName: string;
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    roleTitle: 'ADMIN',
    roleBadge: 'Administrator',
    email: 'admin@aibmez.demo',
    password: 'Admin@123',
    dashboardName: 'Admin Dashboard',
    description: 'Full access to all registered institutes, document reviews, compliance analytics, and PDF reports.',
  },
  {
    roleTitle: 'INSTITUTE USER',
    roleBadge: 'Institute Portal',
    email: 'institute@aibmez.demo',
    password: 'Institute@123',
    dashboardName: 'Institute Dashboard',
    description: 'Manage institute profile, upload PDF/image documents, track verification status, and check expiry alerts.',
  },
  {
    roleTitle: 'REVIEWER',
    roleBadge: 'Verification Officer',
    email: 'reviewer@aibmez.demo',
    password: 'Reviewer@123',
    dashboardName: 'Reviewer Dashboard',
    description: 'Inspect assigned documents, review flagged/duplicate/expired files, and record verification decisions.',
  },
];

export const LoginPage: React.FC = () => {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'login' | 'register'>(
    location.pathname === '/register' ? 'register' : 'login'
  );

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Registration State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('INSTITUTION_ADMIN');
  const [regInstituteName, setRegInstituteName] = useState('');
  const [regAicteId, setRegAicteId] = useState('');
  const [regState, setRegState] = useState('Karnataka');
  const [regCity, setRegCity] = useState('Bengaluru');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const demoParam = (params.get('demo') || '').toLowerCase();
    const pathRole =
      location.pathname === '/admin'
        ? 'admin'
        : location.pathname === '/institute'
        ? 'institute'
        : location.pathname === '/reviewer'
        ? 'reviewer'
        : '';
    const targetRole = demoParam || pathRole;

    if (targetRole) {
      const matched =
        targetRole === 'admin'
          ? DEMO_ACCOUNTS[0]
          : targetRole === 'institute'
          ? DEMO_ACCOUNTS[1]
          : targetRole === 'reviewer'
          ? DEMO_ACCOUNTS[2]
          : null;
      if (matched) {
        handleDirectDemoLogin(matched);
        return;
      }
    }

    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, location.search, isAuthenticated, navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setFormError('Please enter both your email address and password.');
      return;
    }
    if (!isValidEmailAddress(trimmedEmail)) {
      setFormError('Please enter a valid email address (e.g. name@domain.com or user@aibmez.demo).');
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await login({ email: trimmedEmail, password });
      const roleLabel =
        loggedInUser.role === 'SUPER_ADMIN' || loggedInUser.role === 'ADMIN'
          ? 'Admin Dashboard'
          : loggedInUser.role === 'INSTITUTION_ADMIN' || loggedInUser.role === 'INSTITUTE_USER'
          ? 'Institute Dashboard'
          : 'Reviewer Dashboard';
      toast.success(`Signed in as ${loggedInUser.full_name} (${roleLabel})`);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Invalid email or password. Please check your credentials.';
      setFormError(typeof msg === 'string' ? msg : 'Authentication failed. Please check your credentials.');
      toast.error(typeof msg === 'string' ? msg : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectDemoLogin = async (demo: DemoAccount) => {
    setFormError(null);
    setMode('login');
    setEmail(demo.email);
    setPassword(demo.password);
    setLoading(true);
    try {
      await login({ email: demo.email, password: demo.password });
      toast.success(`Opened ${demo.dashboardName} (${demo.email})`);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Demo login failed.';
      setFormError(typeof msg === 'string' ? msg : 'Demo login failed.');
      toast.error('Could not sign in with demo account');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demo: DemoAccount) => {
    setFormError(null);
    setMode('login');
    setEmail(demo.email);
    setPassword(demo.password);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = regEmail.trim().toLowerCase();
    if (!regName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!isValidEmailAddress(trimmedEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (regPassword.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (regRole === 'INSTITUTION_ADMIN' && !regInstituteName.trim()) {
      setFormError('Please enter your Institution Name.');
      return;
    }

    setLoading(true);
    try {
      const newUser = await register({
        email: trimmedEmail,
        full_name: regName.trim(),
        password: regPassword,
        role: regRole,
        institution_name: regRole === 'INSTITUTION_ADMIN' ? regInstituteName.trim() : undefined,
        aicte_id:
          regRole === 'INSTITUTION_ADMIN'
            ? regAicteId.trim() || `AICTE-2026-${Math.floor(1000 + Math.random() * 9000)}`
            : undefined,
        state: regState,
        city: regCity,
      });
      toast.success(`Account created! Welcome, ${newUser.full_name}.`);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Registration failed. Please try a different email address.';
      setFormError(typeof msg === 'string' ? msg : 'Registration failed.');
      toast.error(typeof msg === 'string' ? msg : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* Top Institutional Header Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-700 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white">
                AI-BMEZ Institutional Verification Portal
              </h1>
              <p className="text-xs text-slate-300">
                AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-300 font-medium">
            Academic Cycle 2026–27 | Role-Based Verification System
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sign In / Registration Form */}
          <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setFormError(null);
                }}
                className={`flex items-center justify-center gap-2 py-3 text-xs font-semibold border-b-2 transition-colors ${
                  mode === 'login'
                    ? 'border-blue-700 text-blue-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="h-4 w-4" />
                Sign In to Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setFormError(null);
                }}
                className={`flex items-center justify-center gap-2 py-3 text-xs font-semibold border-b-2 transition-colors ${
                  mode === 'register'
                    ? 'border-blue-700 text-blue-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="h-4 w-4" />
                New User Registration
              </button>
            </div>

            <div className="p-6">
              {formError && (
                <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {mode === 'login' ? (
                <>
                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-slate-900">Portal Sign In</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Enter your institutional email or use one of the seeded demo accounts to open your dashboard directly.
                    </p>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
                    <div>
                      <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="login-email"
                          type="text"
                           inputMode="email"
                          autoComplete="username"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@aibmez.demo"
                          className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                          Password
                        </label>
                        <Link
                          to="/forgot-password"
                          className="text-xs text-blue-700 hover:text-blue-800 font-medium"
                        >
                          Reset password
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50 text-sm"
                    >
                      {loading ? 'Authenticating...' : 'Sign In & Open Dashboard'}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-slate-900">Register New Account</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Register as an Institute User or Document Reviewer using your email address.
                    </p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Account Role
                      </label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                      >
                        <option value="INSTITUTION_ADMIN">Institute User (Upload & Manage Institute Documents)</option>
                        <option value="OFFICER">Reviewer / Verification Officer (Review & Verify Documents)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Dr. Ananya Rao"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="text"
                        inputMode="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="e.g. registrar@college.edu.in"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Password (min. 6 characters)
                      </label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create a strong password"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>

                    {regRole === 'INSTITUTION_ADMIN' && (
                      <div className="pt-2 border-t border-slate-200 space-y-3">
                        <p className="text-xs font-semibold text-slate-800">Institution Details</p>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Institution Name
                          </label>
                          <input
                            type="text"
                            value={regInstituteName}
                            onChange={(e) => setRegInstituteName(e.target.value)}
                            placeholder="e.g. Global Institute of Engineering"
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              AICTE / Reg ID (Optional)
                            </label>
                            <input
                              type="text"
                              value={regAicteId}
                              onChange={(e) => setRegAicteId(e.target.value)}
                              placeholder="AICTE-2026-019"
                              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              State
                            </label>
                            <input
                              type="text"
                              value={regState}
                              onChange={(e) => setRegState(e.target.value)}
                              placeholder="Karnataka"
                              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            City / District
                          </label>
                          <input
                            type="text"
                            value={regCity}
                            onChange={(e) => setRegCity(e.target.value)}
                            placeholder="Bengaluru"
                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50 text-sm"
                    >
                      {loading ? 'Creating Account...' : 'Register & Open Dashboard'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Demo Credentials & System Workflow */}
          <div className="lg:col-span-7 space-y-6">
            {/* Demo Credentials Panel */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Demo Login Credentials (Role-Based Access)
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Enter these credentials in the login form or click <strong>Open Dashboard</strong> to sign in directly without email verification.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold self-start">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Pre-Seeded Accounts
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {DEMO_ACCOUNTS.map((acc) => (
                  <div
                    key={acc.email}
                    className="p-4 rounded-md border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-white">
                          {acc.roleTitle}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          Opens {acc.dashboardName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-800 font-mono pt-1 space-y-0.5">
                        <div>
                          <span className="text-slate-500 font-sans">Email: </span>
                          <strong className="select-all">{acc.email}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-sans">Password: </span>
                          <strong className="select-all">{acc.password}</strong>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 pt-0.5">{acc.description}</p>
                    </div>

                    <div className="flex sm:flex-col gap-2 flex-shrink-0">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleDirectDemoLogin(acc)}
                        className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        Open {acc.dashboardName}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleFillDemo(acc)}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium rounded-md transition-colors whitespace-nowrap"
                      >
                        Fill Credentials
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Validation System Overview */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Institutional Document Validation Workflow
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-md border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">
                    <Building2 className="h-4 w-4 text-blue-700" />
                    1. Institute Submission
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Institutes register, maintain profile details, and upload mandatory regulatory PDF or image documents.
                  </p>
                </div>
                <div className="p-3.5 rounded-md border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">
                    <FileCheck className="h-4 w-4 text-blue-700" />
                    2. Automated Checks
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    OCR extracts text and dates while SHA-256 hashing checks for missing, duplicate, expired, or suspicious files.
                  </p>
                </div>
                <div className="p-3.5 rounded-md border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">
                    <UserCheck className="h-4 w-4 text-blue-700" />
                    3. Review & Compliance
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Reviewers and Administrators verify flagged documents, track compliance percentages, and generate PDF reports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>AI-BMEZ — Application Validation, Document Authentication & Regulatory Compliance System</span>
          <span>Statuses Tracked: Verified, Pending, Missing, Duplicate, Suspicious, Expired</span>
        </div>
      </footer>
    </div>
  );
};
