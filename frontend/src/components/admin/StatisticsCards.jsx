import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Users, FileText, BarChart } from 'lucide-react';

/**
 * Statistics Cards Component
 * Displays key metrics at the top of the admin dashboard
 */
const StatisticsCards = ({ statistics, loading, t = (key) => key }) => {
  const cards = [
    {
      title: t('admin.stats.totalMembers'),
      value: statistics?.totalMembers || 0,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: t('admin.stats.paidInvoices'),
      value: statistics?.paidInvoices || 0,
      icon: FileText,
      color: 'text-green-600'
    },
    {
      title: t('admin.stats.unpaidInvoices'),
      value: statistics?.unpaidInvoices || 0,
      icon: FileText,
      color: 'text-red-600'
    },
    {
      title: t('admin.stats.totalRevenue'),
      value: `${statistics?.totalRevenue || 0} SEK`,
      icon: BarChart,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, index) => (
        <Card key={index} className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{card.title}</p>
                <p className={`text-3xl font-bold ${card.color}`}>
                  {loading ? '...' : card.value}
                </p>
              </div>
              <card.icon className={`h-10 w-10 ${card.color} opacity-20`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatisticsCards;
