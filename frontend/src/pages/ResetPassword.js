import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { authAPI } from '../services/api';

const ResetPassword = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      toast.error('Invalid reset link');
      navigate('/login');
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    
    try {
      await authAPI.resetPassword(token, formData.password);
      toast.success('Password reset successfully! You can now log in.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error(error.response?.data?.detail || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md border-2 border-[var(--color-primary)]/20">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.jpg" 
              alt="SKUD Täby Logo" 
              className="h-20 w-20 object-contain rounded-full border-2 border-[var(--color-primary)]"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-[var(--color-secondary)] dark:text-[var(--color-primary)]">
            {t('auth.resetPasswordTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            {t('auth.resetPasswordDesc')}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.newPassword')}</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t('auth.enterNewPassword')}
                className="border-gray-300 focus:border-[var(--color-primary)]"
                minLength={6}
              />
              <p className="text-xs text-gray-500">{t('auth.passwordMinLength')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder={t('auth.confirmNewPassword')}
                className="border-gray-300 focus:border-[var(--color-primary)]"
                minLength={6}
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)] text-white py-6"
            >
              {loading ? t('auth.resetting') : t('auth.resetPassword')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-[var(--color-primary)] hover:underline">
              {t('auth.backToLogin')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
