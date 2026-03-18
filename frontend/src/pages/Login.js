import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';

const Login = () => {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loginError, setLoginError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);
    console.log('Login form submitted', formData);
    
    try {
      const result = await login(formData.username, formData.password);
      console.log('Login result:', result);
      
      if (result.success) {
        toast.success(t('auth.loginSuccess'));
        if (result.user.role === 'moderator') {
          navigate('/moderator-dashboard');
        } else if (result.user.role === 'admin' || result.user.role === 'superadmin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        // Show error in form and toast
        setLoginError(true);
        toast.error(t('auth.invalidCredentials') || 'Incorrect username or password', {
          description: `${t('auth.tryAgainOrForgot') || 'Please try again or click'} "${t('auth.forgotPassword') || 'Forgot Password'}"`,
          duration: 6000
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(true);
      toast.error(t('auth.invalidCredentials') || 'Incorrect username or password', {
        description: `${t('auth.tryAgainOrForgot') || 'Please try again or click'} "${t('auth.forgotPassword') || 'Forgot Password'}"`,
        duration: 6000
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md border-2 border-[var(--color-primary)]/20">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.webp" 
              alt="SKUD Täby Logo" 
              className="h-20 w-20 object-contain rounded-full border-2 border-[var(--color-primary)]"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-[var(--color-secondary)] dark:text-[var(--color-primary)]">
            {t('auth.loginTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert Box */}
            {loginError && (
              <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-red-800 dark:text-red-200">
                      {t('auth.invalidCredentials') || 'Incorrect username or password'}
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {t('auth.tryAgainOrForgot') || 'Please try again or click'}{' '}
                      <Link to="/forgot-password" className="underline font-semibold hover:text-red-900 dark:hover:text-red-100">
                        {t('auth.forgotPassword') || 'Forgot Password'}
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">{t('auth.username')}</Label>
              <Input
                id="username"
                required
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value });
                  setLoginError(null);
                }}
                className={`border-gray-300 focus:border-[var(--color-primary)] ${loginError ? 'border-red-300' : ''}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  setLoginError(null);
                }}
                className={`border-gray-300 focus:border-[var(--color-primary)] ${loginError ? 'border-red-300' : ''}`}
              />
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-[var(--color-primary)] hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)] text-white py-6"
            >
              {t('auth.submit')}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-[var(--color-primary)] hover:underline font-semibold">
              {t('auth.registerTitle')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;