import React, { useState, useEffect } from 'react';
import { eventsAPI, adminAPI } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

/**
 * AttendanceManager - Component for marking physical attendance at trainings/events
 * Used by Admin/SuperAdmin/Moderator to confirm who actually showed up
 * 
 * PWA-Ready: Designed with mobile-first responsive layout
 */
const AttendanceManager = ({ event, onClose, onUpdate }) => {
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [showAddWalkIn, setShowAddWalkIn] = useState(false);

  useEffect(() => {
    if (event) {
      loadAttendance();
      loadAllUsers();
    }
  }, [event]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const data = await eventsAPI.getAttendance(event.id || event._id);
      setAttendance(data.attendance || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Failed to load attendance:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const data = await adminAPI.getUsers();
      setAllUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleMarkAttendance = async (userId, attended) => {
    try {
      await eventsAPI.markAttendance(event.id || event._id, userId, attended);
      
      // Update local state
      setAttendance(prev => prev.map(a => 
        a.userId === userId ? { ...a, attended, status: attended ? 'attended' : 'noShow' } : a
      ));
      
      toast.success(`Marked as ${attended ? 'Present' : 'Absent'}`);
      onUpdate && onUpdate();
    } catch (error) {
      toast.error('Failed to update attendance');
    }
  };

  const handleMarkAllPresent = async () => {
    try {
      setSaving(true);
      const attendanceData = {};
      attendance.forEach(a => {
        if (a.attended === null || a.attended === undefined) {
          attendanceData[a.userId] = true;
        }
      });
      
      if (Object.keys(attendanceData).length > 0) {
        await eventsAPI.markBulkAttendance(event.id || event._id, attendanceData);
        await loadAttendance();
        toast.success('All confirmed members marked as present');
        onUpdate && onUpdate();
      }
    } catch (error) {
      toast.error('Failed to update attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleAddWalkIn = async (user) => {
    try {
      await eventsAPI.markWalkIn(event.id || event._id, user.id);
      await loadAttendance();
      toast.success(`${user.fullName} added as walk-in`);
      setShowAddWalkIn(false);
      setSearchQuery('');
      onUpdate && onUpdate();
    } catch (error) {
      toast.error('Failed to add walk-in');
    }
  };

  // Filter users not already in attendance for walk-in selection
  const filteredUsersForWalkIn = allUsers.filter(user => {
    const alreadyInList = attendance.some(a => a.userId === user.id);
    const matchesSearch = user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return !alreadyInList && matchesSearch && searchQuery.length > 0;
  });

  const getStatusBadge = (status) => {
    const badges = {
      attended: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      noShow: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      walkIn: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    };
    const labels = {
      attended: '✓ Došao/Came',
      noShow: '✗ Nije došao/No-show',
      pending: '? Čeka/Pending',
      walkIn: '+ Walk-in'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badges[status] || badges.pending}`}>
        {labels[status] || 'Unknown'}
      </span>
    );
  };

  if (!event) return null;

  return (
    <Dialog open={!!event} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            📋 Evidencija Prisustva / Attendance Tracking
          </DialogTitle>
          <p className="text-sm text-gray-500">
            {event.title?.sr || event.title?.en || 'Event'} - {event.date} {event.time}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C1272D]"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold">{stats.confirmed || 0}</p>
                <p className="text-xs text-gray-500">Prijavljeni / Confirmed</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.attended || 0}</p>
                <p className="text-xs text-gray-500">Prisutni / Present</p>
              </div>
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.noShow || 0}</p>
                <p className="text-xs text-gray-500">Nisu došli / No-show</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.walkIn || 0}</p>
                <p className="text-xs text-gray-500">Walk-in</p>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.pending || 0}</p>
                <p className="text-xs text-gray-500">Čekaju / Pending</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={handleMarkAllPresent}
                disabled={saving || stats.pending === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                ✓ Označi sve prisutne / Mark All Present
              </Button>
              <Button
                onClick={() => setShowAddWalkIn(!showAddWalkIn)}
                variant="outline"
                className="border-blue-500 text-blue-600"
              >
                + Dodaj Walk-in / Add Walk-in
              </Button>
            </div>

            {/* Walk-in Search */}
            {showAddWalkIn && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold mb-2">Dodaj člana koji nije prijavljen / Add member who didn't RSVP</h4>
                <Input
                  placeholder="Pretraži članove / Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-2"
                />
                {filteredUsersForWalkIn.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredUsersForWalkIn.slice(0, 10).map(user => (
                      <div 
                        key={user.id}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => handleAddWalkIn(user)}
                      >
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          + Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Attendance List */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold">Član / Member</th>
                    <th className="p-3 text-center text-sm font-semibold hidden md:table-cell">RSVP</th>
                    <th className="p-3 text-center text-sm font-semibold">Status</th>
                    <th className="p-3 text-center text-sm font-semibold">Akcije / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        Nema prijavljenih članova / No confirmed participants
                      </td>
                    </tr>
                  ) : (
                    attendance.map(member => (
                      <tr key={member.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{member.fullName}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                        </td>
                        <td className="p-3 text-center hidden md:table-cell">
                          {member.confirmed ? (
                            <span className="text-green-600">✓ Da/Yes</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {getStatusBadge(member.status)}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center gap-1 flex-wrap">
                            <button
                              onClick={() => handleMarkAttendance(member.userId, true)}
                              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                member.attended === true
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-green-200 dark:hover:bg-green-800'
                              }`}
                              title="Mark as present"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(member.userId, false)}
                              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                member.attended === false
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-red-200 dark:hover:bg-red-800'
                              }`}
                              title="Mark as absent"
                            >
                              ✗
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 border-t pt-4">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500"></span> Prisutan / Present
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span> Nije došao / No-show
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span> Walk-in
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span> Čeka / Pending
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceManager;
