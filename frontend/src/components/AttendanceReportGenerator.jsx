import React, { useState, useEffect } from 'react';
import { eventsAPI } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

/**
 * AttendanceReportGenerator - Component for generating attendance reports
 * Available for Admin/SuperAdmin/Moderator
 */
const AttendanceReportGenerator = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [trainingGroups, setTrainingGroups] = useState([]);
  
  // Report filters
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    trainingGroup: 'all'
  });

  useEffect(() => {
    if (open) {
      loadReportPreview();
    }
  }, [open, filters]);

  const loadReportPreview = async () => {
    try {
      setLoading(true);
      const data = await eventsAPI.getAttendanceReportData(
        filters.startDate,
        filters.endDate,
        filters.trainingGroup === 'all' ? null : filters.trainingGroup
      );
      setReportData(data);
      setTrainingGroups(data.training_groups || []);
    } catch (error) {
      console.error('Failed to load report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format) => {
    try {
      const token = localStorage.getItem('token');
      const url = eventsAPI.downloadAttendanceReport(
        filters.startDate,
        filters.endDate,
        filters.trainingGroup === 'all' ? null : filters.trainingGroup,
        format
      );
      
      // Fetch with auth header
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const filename = `attendance_report_${filters.startDate}_${filters.endDate}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success(`Report downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download report');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            📊 Izveštaj o Prisustvu / Attendance Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400 uppercase">
              Filteri / Filters
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm">Od datuma / From Date</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              
              <div>
                <Label className="text-sm">Do datuma / To Date</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              
              <div>
                <Label className="text-sm">Grupa / Group</Label>
                <select
                  value={filters.trainingGroup}
                  onChange={(e) => setFilters({ ...filters, trainingGroup: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="all">Sve grupe / All groups</option>
                  {trainingGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Preview Stats */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C1272D]"></div>
            </div>
          ) : reportData ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400 uppercase">
                Pregled / Preview
              </h3>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {reportData.summary?.total_events || 0}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Događaja / Events</p>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold">
                    {reportData.summary?.total_confirmed || 0}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Prijava / RSVPs</p>
                </div>
                
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {reportData.summary?.total_present || 0}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Prisutni / Present</p>
                </div>
                
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {reportData.summary?.total_absent || 0}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Odsutni / Absent</p>
                </div>
                
                <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                    {reportData.summary?.total_walkins || 0}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Walk-in</p>
                </div>
                
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                    {reportData.summary?.average_attendance_rate || 0}%
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Prosek / Avg Rate</p>
                </div>
              </div>

              {/* Visual Bar */}
              {reportData.summary?.total_confirmed > 0 && (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Stopa Prisustva / Attendance Rate</p>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                      style={{ width: `${reportData.summary?.average_attendance_rate || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span className="font-bold text-green-600">{reportData.summary?.average_attendance_rate || 0}%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nema podataka za izabrani period / No data for selected period
            </div>
          )}

          {/* Download Buttons */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400 uppercase mb-3">
              Preuzmi Izveštaj / Download Report
            </h3>
            
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleDownload('pdf')}
                disabled={loading || !reportData?.summary?.total_events}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                📄 PDF Izveštaj / PDF Report
              </Button>
              
              <Button
                onClick={() => handleDownload('excel')}
                disabled={loading || !reportData?.summary?.total_events}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                📊 Excel Izveštaj / Excel Report
              </Button>
              
              <Button
                onClick={onClose}
                variant="outline"
                className="ml-auto"
              >
                Zatvori / Close
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 mt-3">
              * PDF izveštaj sadrži grafički pregled, Excel sadrži detaljne podatke za dalju analizu.
              <br />
              * PDF report contains visual overview, Excel contains detailed data for further analysis.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceReportGenerator;
