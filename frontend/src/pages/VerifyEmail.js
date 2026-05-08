import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { authAPI } from '../services/api';

const VerifyEmail = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('No verification token provided');
        return;
      }

      try {
        const response = await authAPI.verifyEmail(token);
        
        if (!cancelled && response.success) {
          setStatus('success');
          setMessage(t('auth.emailVerifiedSuccess') || 'Your email has been verified successfully! You can now log in.');
          
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (error) {
        // If token is invalid, it might be because it was already used (already verified)
        // Don't overwrite success state
        if (!cancelled && status !== 'success') {
          const detail = error.response?.data?.detail || '';
          if (detail === 'Invalid verification token') {
            // Token was already used = email already verified
            setStatus('success');
            setMessage(t('auth.emailAlreadyVerified') || 'Your email is already verified! You can log in.');
            setTimeout(() => {
              navigate('/login');
            }, 3000);
          } else {
            setStatus('error');
            setMessage(detail || t('auth.emailVerificationFailed') || 'Failed to verify email.');
          }
        }
      }
    };

    verifyEmail();
    
    return () => { cancelled = true; };
  }, [searchParams, navigate, t, status]);

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md border-2 border-[#C1272D]/20">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.webp" 
              alt="SKUD Täby Logo" 
              className="h-20 w-20 object-contain rounded-full border-2 border-[#C1272D]"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-[#8B1F1F] dark:text-[#C1272D]">
            {t('auth.emailVerificationTitle') || 'Verifikacija email adrese'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            {status === 'verifying' && (
              <>
                <div className="w-16 h-16 border-4 border-[#C1272D] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400">{t('auth.verifyingEmail') || 'Verifikacija u toku...'}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('auth.emailVerifiedTitle') || 'Email je verifikovan!'}</h3>
                <p className="text-gray-600 dark:text-gray-400">{message}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">{t('auth.redirectingToLogin') || 'Preusmeravanje na stranicu za prijavu...'}</p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('auth.verificationFailedTitle') || 'Verifikacija neuspešna'}</h3>
                <p className="text-gray-600 dark:text-gray-400">{message}</p>
              </>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-[#C1272D] hover:underline">
              {t('auth.backToLogin') || 'Nazad na prijavu'}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
