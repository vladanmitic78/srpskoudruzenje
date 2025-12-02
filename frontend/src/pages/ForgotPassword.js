import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { authAPI } from '../services/api';

const ForgotPassword = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await authAPI.forgotPassword(email);
      setSubmitted(true);
      toast.success('Reset instructions sent! Check your email.');
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('Failed to send reset email. Please try again.');
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
            {t('auth.forgotPasswordTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                {t('auth.forgotPasswordDesc')}
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="border-gray-300 focus:border-[var(--color-primary)]"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)] text-white py-6"
                >
                  {loading ? t('auth.sending') : t('auth.sendResetLink')}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('auth.checkEmail')}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('auth.resetEmailSent')} <strong>{email}</strong>, {t('auth.resetEmailSent2')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {t('auth.linkExpires')}
              </p>
            </div>
          )}

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

export default ForgotPassword;
