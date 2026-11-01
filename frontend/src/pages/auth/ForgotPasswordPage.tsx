import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../../utils/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', null, { params: { email } });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>

        <h1 className="text-2xl font-bold text-slate-900">Password Recovery</h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter your registered official email address to request a password reset.
        </p>

        {submitted ? (
          <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900">
              <p className="font-bold">Recovery Request Recorded</p>
              <p className="mt-1">
                If <span className="font-semibold">{email}</span> is registered, password recovery
                instructions would be dispatched. (Synthetic demo environment — use the quick demo
                credentials on the login page).
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Registered Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@aicte.gov.in"
              leftIcon={<Mail className="h-4 w-4" />}
            />
            <Button type="submit" loading={loading} className="w-full">
              Send Reset Instructions
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

