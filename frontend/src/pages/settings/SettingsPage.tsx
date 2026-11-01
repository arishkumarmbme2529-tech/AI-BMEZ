import React, { useState } from 'react';
import { Settings, Lock, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getRoleLabel } from '../../utils/helpers';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      await api.put(`/users/${user.id}`, null, { params: { full_name: fullName } });
      await refreshUser();
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPass(true);
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to change password');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-brand-navy" />
          Profile & Platform Configuration
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your account profile, security credentials, and session preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Account Profile"
            subtitle="Update your display name and view role permissions"
          />
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<UserIcon className="h-4 w-4" />}
            />
            <Input label="Official Email" value={user?.email || ''} disabled />
            <Input
              label="Assigned Platform Role"
              value={user ? getRoleLabel(user.role) : ''}
              disabled
            />
            <Button type="submit" loading={savingProfile}>
              Save Profile Changes
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader
            title="Security & Password"
            subtitle="Update your bcrypt-hashed authentication password"
          />
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
            />
            <Input
              label="New Password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
            />
            <Button type="submit" variant="cyan" loading={changingPass}>
              Update Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

