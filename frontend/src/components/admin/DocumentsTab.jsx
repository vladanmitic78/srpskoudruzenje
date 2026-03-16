import React, { useState, useEffect, useCallback } from 'react';
import { documentsAPI, adminAPI } from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Users, 
  Building2, 
  FolderOpen,
  Search,
  Plus,
  Eye,
  FileSpreadsheet,
  FileImage,
  File,
  Clock,
  User
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to get file icon based on mime type
const getFileIcon = (mimeType) => {
  if (mimeType?.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType?.includes('image')) return <FileImage className="h-5 w-5 text-blue-500" />;
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  return <File className="h-5 w-5 text-gray-500" />;
};

// Format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Document Card Component
const DocumentCard = ({ doc, onDelete, onDownload, showAssignees = false }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        {getFileIcon(doc.mimeType)}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate" title={doc.title}>{doc.title}</h4>
          {doc.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{doc.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(doc.createdAt)}
            </span>
            <span>{formatFileSize(doc.fileSize)}</span>
            {doc.category && <Badge variant="outline" className="text-xs">{doc.category}</Badge>}
            {doc.visibility && (
              <Badge variant={doc.visibility === 'public' ? 'default' : 'secondary'} className="text-xs">
                {doc.visibility === 'public' ? 'Public' : doc.visibility === 'members_only' ? 'Members' : 'Internal'}
              </Badge>
            )}
          </div>
          {showAssignees && doc.assignedUsers && (
            <div className="mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Assigned to: {doc.assignedUsers.map(u => u.fullName).join(', ')}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDownload(doc)}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-700"
            onClick={() => onDelete(doc)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Upload Dialog Component
const UploadDialog = ({ 
  open, 
  onClose, 
  type, 
  onUpload, 
  users = [],
  existingCategories = [],
  getText = (key, fallback) => fallback
}) => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [customCategory, setCustomCategory] = useState('');
  const [visibility, setVisibility] = useState('members_only');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isBulk, setIsBulk] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title) {
      toast.error('Please provide a file and title');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', customCategory || category);
    
    if (type === 'association') {
      formData.append('visibility', visibility);
    }
    
    if (type === 'personal') {
      if (isBulk) {
        formData.append('user_ids', selectedUsers.join(','));
      } else {
        if (selectedUsers.length !== 1) {
          toast.error('Please select a user');
          return;
        }
        formData.append('user_id', selectedUsers[0]);
      }
    }

    setUploading(true);
    try {
      await onUpload(formData, isBulk);
      handleClose();
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setCategory('general');
    setCustomCategory('');
    setVisibility('members_only');
    setSelectedUsers([]);
    setIsBulk(false);
    onClose();
  };

  const toggleUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getDialogTitle = () => {
    switch(type) {
      case 'public': return getText('uploadPublic', 'Upload Public Document');
      case 'personal': return getText('uploadPersonal', 'Upload Personal Document');
      case 'association': return getText('uploadAssociation', 'Upload Association Document');
      default: return getText('upload', 'Upload Document');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {getDialogTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div>
            <Label>{getText('selectFile', 'File')} *</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              {getText('fileTypes', 'Allowed: PDF, Word, Excel, PowerPoint, Images, Text (max 50MB)')}
            </p>
          </div>

          {/* Title */}
          <div>
            <Label>{getText('documentTitle', 'Title')} *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={getText('documentTitle', 'Document title')}
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label>{getText('description', 'Description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={getText('description', 'Optional description')}
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Category (for public and association) */}
          {(type === 'public' || type === 'association') && (
            <div>
              <Label>{getText('category', 'Category')}</Label>
              <div className="flex gap-2 mt-1">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={getText('category', 'Select category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="forms">Forms</SelectItem>
                    <SelectItem value="rules">Rules & Policies</SelectItem>
                    <SelectItem value="schedules">Schedules</SelectItem>
                    <SelectItem value="official">Official Documents</SelectItem>
                    <SelectItem value="reports">Reports</SelectItem>
                    <SelectItem value="minutes">Meeting Minutes</SelectItem>
                    {existingCategories.filter(c => !['general', 'forms', 'rules', 'schedules', 'official', 'reports', 'minutes'].includes(c)).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Or custom..."
                  className="w-32"
                />
              </div>
            </div>
          )}

          {/* Visibility (for association) */}
          {type === 'association' && (
            <div>
              <Label>{getText('visibility', 'Visibility')}</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">{getText('visibilityPublic', 'Public (visible to everyone)')}</SelectItem>
                  <SelectItem value="members_only">{getText('visibilityMembers', 'Members Only (logged-in users)')}</SelectItem>
                  <SelectItem value="internal">{getText('visibilityInternal', 'Internal (admins only)')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* User Selection (for personal) */}
          {type === 'personal' && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="bulk-upload"
                  checked={isBulk}
                  onChange={(e) => {
                    setIsBulk(e.target.checked);
                    setSelectedUsers([]);
                  }}
                  className="rounded"
                />
                <Label htmlFor="bulk-upload" className="cursor-pointer">
                  {getText('bulkUpload', 'Assign to multiple members (bulk)')}
                </Label>
              </div>
              
              <div>
                <Label>{isBulk ? getText('selectMembers', 'Select Members') + ' *' : getText('selectMember', 'Select Member') + ' *'}</Label>
                <div className="mt-1 border rounded-md max-h-48 overflow-y-auto">
                  {users.map(user => (
                    <label 
                      key={user.id} 
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type={isBulk ? 'checkbox' : 'radio'}
                        name="user-select"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => {
                          if (isBulk) {
                            toggleUser(user.id);
                          } else {
                            setSelectedUsers([user.id]);
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{user.fullName}</span>
                      <span className="text-xs text-gray-400">{user.email}</span>
                    </label>
                  ))}
                </div>
                {selectedUsers.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedUsers.length} {getText('membersSelected', 'member(s) selected')}
                  </p>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {getText('cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? getText('uploading', 'Uploading...') : getText('upload', 'Upload')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Main DocumentsTab Component
const DocumentsTab = ({ t }) => {
  const [activeTab, setActiveTab] = useState('public');
  const [publicDocs, setPublicDocs] = useState([]);
  const [personalDocs, setPersonalDocs] = useState([]);
  const [associationDocs, setAssociationDocs] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState('public');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);

  // Helper function to get admin document translations
  const getText = (key, fallback) => {
    if (!t) return fallback;
    const result = t(`admin.documents.${key}`);
    return result && !result.includes('admin.documents.') ? result : fallback;
  };

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const [publicRes, personalRes, associationRes, statsRes] = await Promise.all([
        documentsAPI.getPublicDocuments(categoryFilter !== 'all' ? categoryFilter : null, searchQuery || null),
        documentsAPI.adminGetPersonalDocuments(),
        documentsAPI.getAssociationDocuments(),
        documentsAPI.getDocumentStats()
      ]);
      
      setPublicDocs(publicRes.documents || []);
      setCategories(publicRes.categories || []);
      setPersonalDocs(personalRes.documents || []);
      setAssociationDocs(associationRes.documents || []);
      setStats(statsRes);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchQuery]);

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
  }, [fetchDocuments]);

  const handleUpload = async (formData, isBulk) => {
    try {
      let result;
      switch(uploadType) {
        case 'public':
          result = await documentsAPI.uploadPublicDocument(formData);
          break;
        case 'personal':
          result = isBulk 
            ? await documentsAPI.bulkUploadPersonalDocument(formData)
            : await documentsAPI.uploadPersonalDocument(formData);
          break;
        case 'association':
          result = await documentsAPI.uploadAssociationDocument(formData);
          break;
        default:
          throw new Error('Invalid document type');
      }
      toast.success(result.message || 'Document uploaded successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload document');
      throw error;
    }
  };

  const handleDelete = async (doc, type) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.title}"?`)) return;
    
    try {
      switch(type) {
        case 'public':
          await documentsAPI.deletePublicDocument(doc.id);
          break;
        case 'personal':
          await documentsAPI.deletePersonalDocument(doc.id);
          break;
        case 'association':
          await documentsAPI.deleteAssociationDocument(doc.id);
          break;
        default:
          throw new Error('Invalid document type');
      }
      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleDownload = (doc) => {
    const token = localStorage.getItem('token');
    const url = `${BACKEND_URL}${doc.fileUrl}`;
    
    // Create a temporary link with auth header
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = doc.fileName;
        link.click();
        URL.revokeObjectURL(link.href);
      })
      .catch(err => {
        console.error('Download error:', err);
        toast.error('Failed to download file');
      });
  };

  const openUploadDialog = (type) => {
    setUploadType(type);
    setUploadDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{getText('title', 'Document Management')}</h2>
          <p className="text-gray-500 text-sm mt-1">
            {getText('subtitle', 'Manage public, personal, and association documents')}
          </p>
        </div>
        {stats && (
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <p className="font-bold text-lg">{stats.counts.total}</p>
              <p className="text-gray-500">{getText('totalDocs', 'Total Docs')}</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{stats.totalDownloads}</p>
              <p className="text-gray-500">{getText('downloads', 'Downloads')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="public" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">{getText('publicLibrary', 'Public Library')}</span>
            <span className="sm:hidden">Public</span>
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{getText('memberDocs', 'Member Docs')}</span>
            <span className="sm:hidden">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="association" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{getText('association', 'Association')}</span>
            <span className="sm:hidden">Org</span>
          </TabsTrigger>
        </TabsList>

        {/* Public Documents Tab */}
        <TabsContent value="public" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">{getText('publicTitle', 'Public Document Library')}</CardTitle>
                <CardDescription>{getText('publicDesc', 'Documents accessible to all members')}</CardDescription>
              </div>
              <Button onClick={() => openUploadDialog('public')} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {getText('upload', 'Upload')}
              </Button>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={getText('search', 'Search documents...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{getText('allCategories', 'All Categories')}</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document Grid */}
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : publicDocs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{getText('noPublic', 'No public documents yet')}</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {publicDocs.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onDelete={() => handleDelete(doc, 'public')}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Documents Tab */}
        <TabsContent value="personal" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">{getText('personalTitle', 'Member Personal Documents')}</CardTitle>
                <CardDescription>{getText('personalDesc', 'Private documents assigned to specific members')}</CardDescription>
              </div>
              <Button onClick={() => openUploadDialog('personal')} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {getText('upload', 'Upload')}
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : personalDocs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{getText('noPersonal', 'No personal documents yet')}</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {personalDocs.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onDelete={() => handleDelete(doc, 'personal')}
                      onDownload={handleDownload}
                      showAssignees
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Association Documents Tab */}
        <TabsContent value="association" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">{getText('associationTitle', 'Association Documents')}</CardTitle>
                <CardDescription>{getText('associationDesc', 'Official organizational documents')}</CardDescription>
              </div>
              <Button onClick={() => openUploadDialog('association')} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {getText('upload', 'Upload')}
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : associationDocs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{getText('noAssociation', 'No association documents yet')}</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {associationDocs.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onDelete={() => handleDelete(doc, 'association')}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        type={uploadType}
        onUpload={handleUpload}
        users={users}
        existingCategories={categories}
        getText={getText}
      />
    </div>
  );
};

export default DocumentsTab;
