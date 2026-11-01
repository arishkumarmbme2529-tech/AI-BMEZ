import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, CheckCircle2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      toast.success('Signed in to AICTE Regulatory Platform');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Invalid email or password';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950">
      {/* Left Branding Panel */}
      <div className="lg:w-7/12 relative overflow-hidden bg-gradient-to-br from-[#07101e] via-[#0f1e36] to-[#1e3a5f] p-8 lg:p-14 flex flex-col justify-between text-white">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/15">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-cyan-300">
              All India Council for Technical Education (AICTE)
            </span>
          </div>

          <h1 className="mt-8 text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
            AI-Powered Institutional Application Validation & Regulatory Compliance Platform
          </h1>
          <p className="mt-4 text-slate-300 text-base max-w-2xl leading-relaxed">
            Smart India Hackathon 2026 — Problem Statement #26261 (Regulation Bureau). Automated OCR
            extraction, cryptographic & perceptual duplicate detection, preliminary anomaly analysis,
            and rule-based regulatory compliance verification.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {[
              'OCR & Structured Field Extraction',
              'SHA-256 & Perceptual Duplicate Detection',
              'Explainable Preliminary Anomaly Checks',
              'Configurable Rule-Based Compliance Engine',
              'AI-Assisted Infrastructure Evidence Review',
              'Automated PDF Validation Reports & Audit Trail',
            ].map((feat) => (
              <div
                key={feat}
                className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3"
              >
                <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                <span className="text-xs font-medium text-slate-200">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-10 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <span>Department: Regulation Bureau | Theme: Smart Automation</span>
          <span className="text-amber-300 font-medium">
            Synthetic Demonstration Environment — Not Official Live Government Portal
          </span>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="lg:w-5/12 bg-white flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Sign in to Portal</h2>
            <p className="text-sm text-slate-500 mt-1">
              Enter your authorized credentials or select a demonstration role below.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Official Email Address"
              type="email"
              required
              placeholder="name@aicte.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPass ? 'text' : 'password'}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="rounded border-slate-300 text-brand-navy" />
                Keep session active
              </label>
              <Link to="/forgot-password" className="font-semibold text-cyan-600 hover:text-cyan-700">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={loading} className="w-full py-3" size="lg">
              Sign In to Platform
            </Button>
          </form>

          {/* One-click Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
              <span>Quick Demo Role Credentials (Click to Autofill)</span>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@aicte.gov.in', 'Admin@123456')}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/30 transition-all flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">Super Administrator</p>
                  <p className="text-[11px] text-slate-500">admin@aicte.gov.in / Admin@123456</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-100 text-purple-700">
                  SUPER_ADMIN
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('officer@aicte.gov.in', 'Officer@123456')}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/30 transition-all flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">AICTE Verification Officer</p>
                  <p className="text-[11px] text-slate-500">officer@aicte.gov.in / Officer@123456</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700">
                  OFFICER
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('institute@demo.edu.in', 'Institute@123456')}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/30 transition-all flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">Institution Administrator</p>
                  <p className="text-[11px] text-slate-500">institute@demo.edu.in / Institute@123456</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-cyan-100 text-cyan-800">
                  INSTITUTION_ADMIN
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

