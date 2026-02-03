import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

/**
 * Invoice Details Modal Component
 * Shows detailed information about an invoice with actions
 */
const InvoiceDetailsModal = ({
  invoice,
  open,
  onOpenChange,
  onMarkPaid,
  onDownload,
  t = (key) => key
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!invoice) return null;

  const handleMarkPaid = async () => {
    setIsProcessing(true);
    try {
      await onMarkPaid(invoice.id);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to mark invoice as paid');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('sv-SE');
    } catch {
      return dateStr;
    }
  };

  const getUserName = () => {
    return invoice.userName || invoice.userFullName || invoice.userId || 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📄 Invoice Details
            <span className={`px-2 py-1 text-xs rounded ${
              invoice.status === 'paid' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {invoice.status === 'paid' ? 'PAID' : 'UNPAID'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Member Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <label className="text-xs text-gray-500 uppercase tracking-wide">Member</label>
            <p className="font-semibold text-lg">{getUserName()}</p>
          </div>

          {/* Invoice Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Amount</label>
              <p className="font-bold text-2xl text-[var(--color-primary)]">
                {invoice.amount} {invoice.currency || 'SEK'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Due Date</label>
              <p className="font-medium">{formatDate(invoice.dueDate)}</p>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Description</label>
              <p className="font-medium">{invoice.description}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Created</label>
              <p className="text-sm">{formatDate(invoice.createdAt)}</p>
            </div>
            {invoice.paymentDate && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Payment Date</label>
                <p className="text-sm text-green-600">{formatDate(invoice.paymentDate)}</p>
              </div>
            )}
          </div>

          {/* File Section */}
          {invoice.fileUrl && (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Attached File</label>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => onDownload(invoice.fileUrl, invoice.fileName)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-center"
                >
                  👁️ View File
                </button>
                <button
                  onClick={() => onDownload(invoice.fileUrl, invoice.fileName)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center"
                >
                  📥 Download
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            {invoice.status !== 'paid' && (
              <button
                onClick={handleMarkPaid}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : '✓ Mark as Paid'}
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDetailsModal;
