import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';

const Register = () => {
  const { t } = useLanguage();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(formData);
    
    if (result.success) {
      toast.success(result.message);
      setTimeout(() => navigate('/login'), 2000);
    } else {
      toast.error(result.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md border-2 border-[#C1272D]/20">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.jpg" 
              alt="SKUD Täby Logo" 
              className="h-20 w-20 object-contain rounded-full border-2 border-[#C1272D]"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-[#8B1F1F] dark:text-[#C1272D]">
            {t('auth.registerTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('auth.fullName')} *</Label>
              <Input
                id="fullName"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="border-gray-300 focus:border-[#C1272D]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')} *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="border-gray-300 focus:border-[#C1272D]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">{t('auth.username')} *</Label>
              <Input
                id="username"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="border-gray-300 focus:border-[#C1272D]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')} *</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="border-gray-300 focus:border-[#C1272D]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('auth.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="border-gray-300 focus:border-[#C1272D]"
                placeholder="+46..."
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#C1272D] hover:bg-[#8B1F1F] text-white py-6 mt-6"
            >
              {t('auth.submit')}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-[#C1272D] hover:underline font-semibold">
              {t('auth.loginTitle')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;