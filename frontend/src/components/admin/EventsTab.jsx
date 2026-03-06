import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

/**
 * EventsTab - Manages events and trainings
 * Includes event CRUD, attendance tracking, and report generation
 */
const EventsTab = ({ 
  t, 
  events,
  setAttendanceEvent,
  setShowAttendanceReport,
  setSelectedEvent,
  setEventForm,
  setCreateEventOpen,
  setEditEventOpen,
  handleCancelEvent,
  handleDeleteEvent
}) => {
  const resetEventForm = () => {
    setEventForm({
      date: '',
      time: '',
      title: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
      location: '',
      description: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
      status: 'active',
      cancellationReason: ''
    });
  };

  const openEditEvent = (event) => {
    setSelectedEvent(event);
    setEventForm({
      date: event.date,
      time: event.time,
      title: event.title,
      location: event.location,
      description: event.description,
      status: event.status,
      cancellationReason: event.cancellationReason || ''
    });
    setEditEventOpen(true);
  };

  return (
    <Card className="border-2 border-[var(--color-primary)]/20">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle>{t('admin.events.title')}</CardTitle>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetEventForm();
              setCreateEventOpen(true);
            }}
            className="px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)] transition-colors"
          >
            {t('admin.events.addEvent')}
          </button>
          <button
            onClick={() => setShowAttendanceReport(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            📊 {t('admin.events.report')}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              {t('admin.events.noEvents')}
            </p>
          ) : (
            events.map((event) => (
              <div key={event.id} className={`p-4 border-2 rounded-lg ${
                event.status === 'cancelled' 
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/10' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}>
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="font-semibold text-lg text-gray-900 dark:text-white">
                        {event.title?.['sr-latin'] || event.title?.en || 'Event'}
                      </p>
                      {event.status === 'cancelled' && (
                        <span className="px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded">
                          {t('admin.events.cancelled')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      📅 {event.date} {t('admin.events.at')} {event.time}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      📍 {event.location}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {event.description?.['sr-latin'] || event.description?.en || ''}
                    </p>
                    {event.status === 'cancelled' && event.cancellationReason && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                        <strong>{t('admin.events.reason')}:</strong> {event.cancellationReason}
                      </p>
                    )}
                    {event.participants && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        👥 {event.participants.length} {t('admin.events.participantsConfirmed')}
                        {event.attendance && Object.keys(event.attendance).length > 0 && (
                          <span className="ml-2 text-green-600">
                            (✓ {Object.values(event.attendance).filter(a => a.attended).length} prisutnih)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {event.status === 'active' && (
                      <button
                        onClick={() => setAttendanceEvent(event)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        title="Mark attendance"
                        data-testid={`attendance-btn-${event.id}`}
                      >
                        📋 {t('admin.events.attendance')}
                      </button>
                    )}
                    <button
                      onClick={() => openEditEvent(event)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      data-testid={`edit-event-btn-${event.id}`}
                    >
                      {t('admin.actions.edit')}
                    </button>
                    {event.status === 'active' && (
                      <button
                        onClick={() => handleCancelEvent(event)}
                        className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                        data-testid={`cancel-event-btn-${event.id}`}
                      >
                        {t('admin.events.cancelEvent')}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      data-testid={`delete-event-btn-${event.id}`}
                    >
                      {t('admin.actions.delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventsTab;
