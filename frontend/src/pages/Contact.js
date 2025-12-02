import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Mail, Phone, MapPin } from 'lucide-react';
import { contactAPI, settingsAPI } from '../services/api';

const Contact = () => {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: '',
    message: ''
  });
  const [settings, setSettings] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await settingsAPI.get();
        setSettings(data);
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await contactAPI.submit(formData);
      toast.success('Message sent successfully!');
      setFormData({ name: '', email: '', topic: '', message: '' });
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-secondary)] dark:text-[var(--color-primary)] mb-12 text-center">
          {t('contact.title')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <Card className="border-2 border-[var(--color-primary)]/20">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('contact.name')} *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="border-gray-300 focus:border-[var(--color-primary)]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('contact.email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="border-gray-300 focus:border-[var(--color-primary)]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic">{t('contact.topic')} *</Label>
                  <Select 
                    value={formData.topic} 
                    onValueChange={(value) => setFormData({ ...formData, topic: value })}
                  >
                    <SelectTrigger className="border-gray-300 focus:border-[var(--color-primary)]">
                      <SelectValue placeholder={t('contact.topic')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">{t('contact.topics.member')}</SelectItem>
                      <SelectItem value="finance">{t('contact.topics.finance')}</SelectItem>
                      <SelectItem value="sponsorship">{t('contact.topics.sponsorship')}</SelectItem>
                      <SelectItem value="other">{t('contact.topics.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t('contact.message')} *</Label>
                  <Textarea
                    id="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="border-gray-300 focus:border-[var(--color-primary)] resize-none"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)] text-white py-6 text-lg font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : t('contact.send')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information and Map */}
          <div className="space-y-8">
            <Card className="border-2 border-[var(--color-primary)]/20">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-[var(--color-button-primary)]/10 rounded-lg">
                    <MapPin className="h-6 w-6 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('contact.addressLabel')}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{settings?.address || t('contact.loading')}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-[var(--color-button-primary)]/10 rounded-lg">
                    <Mail className="h-6 w-6 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('contact.emailLabel')}</h3>
                    <a 
                      href={`mailto:${settings?.contactEmail || ''}`}
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      {settings?.contactEmail || t('contact.loading')}
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-[var(--color-button-primary)]/10 rounded-lg">
                    <Phone className="h-6 w-6 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('contact.phoneLabel')}</h3>
                    <a 
                      href={`tel:${settings?.contactPhone || ''}`}
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      {settings?.contactPhone || t('contact.loading')}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Map */}
            <Card className="border-2 border-[var(--color-primary)]/20 overflow-hidden">
              <div className="h-80">
                <iframe
                  title="Location Map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2029.5542234!2d18.0688!3d59.4439!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTnCsDI2JzM4LjAiTiAxOMKwMDQnMDcuNyJF!5e0!3m2!1sen!2sse!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;