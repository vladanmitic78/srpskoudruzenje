import React, { useState, useEffect } from 'react';
import { documentsAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { 
  FileText, 
  Download, 
  FolderOpen, 
  Building2,
  User,
  Search,
  FileSpreadsheet,
  FileImage,
  File,
  Clock
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
const DocumentCard = ({ doc, onDownload }) => (
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
                {doc.visibility === 'public' ? 'Public' : 'Members'}
              </Badge>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDownload(doc)}
          className="flex items-center gap-1"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Download</span>
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Main UserDocumentsSection Component
const UserDocumentsSection = ({ t }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [personalDocs, setPersonalDocs] = useState([]);
  const [publicDocs, setPublicDocs] = useState([]);
  const [associationDocs, setAssociationDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  
  // Helper function to get translation with fallback
  const getText = (key, fallback) => {
    if (!t) return fallback;
    const result = t(`dashboard.documents.${key}`);
    return result && !result.includes('dashboard.documents.') ? result : fallback;
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const [personalRes, publicRes, associationRes] = await Promise.all([
        documentsAPI.getMyPersonalDocuments(),
        documentsAPI.getPublicDocuments(),
        documentsAPI.getAssociationDocuments()
      ]);
      
      setPersonalDocs(personalRes.documents || []);
      setPublicDocs(publicRes.documents || []);
      setCategories(publicRes.categories || []);
      setAssociationDocs(associationRes.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (doc) => {
    const token = localStorage.getItem('token');
    const url = `${BACKEND_URL}${doc.fileUrl}`;
    
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = doc.fileName;
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success('Download started');
      })
      .catch(err => {
        console.error('Download error:', err);
        toast.error('Failed to download file');
      });
  };

  // Filter public docs based on search and category
  const filteredPublicDocs = publicDocs.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalDocs = personalDocs.length + publicDocs.length + associationDocs.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {getText('title', 'My Documents')}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {getText('subtitle', 'Access your personal and shared documents')}
          </p>
        </div>
        <div className="text-center">
          <p className="font-bold text-lg">{totalDocs}</p>
          <p className="text-gray-500 text-sm">{getText('totalDocs', 'Available Docs')}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{getText('myDocs', 'My Documents')}</span>
            <span className="sm:hidden">Mine</span>
            <Badge variant="secondary" className="ml-1">{personalDocs.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="public" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">{getText('library', 'Library')}</span>
            <span className="sm:hidden">Library</span>
            <Badge variant="secondary" className="ml-1">{publicDocs.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="association" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{getText('association', 'Association')}</span>
            <span className="sm:hidden">Org</span>
            <Badge variant="secondary" className="ml-1">{associationDocs.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Personal Documents Tab */}
        <TabsContent value="personal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                {getText('personalTitle', 'My Personal Documents')}
              </CardTitle>
              <CardDescription>
                {getText('personalDesc', 'Documents specifically assigned to you')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : personalDocs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{getText('noPersonal', 'No personal documents yet')}</p>
                  <p className="text-xs mt-1">Documents assigned to you by administrators will appear here</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {personalDocs.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Public Library Tab */}
        <TabsContent value="public" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                {getText('libraryTitle', 'Document Library')}
              </CardTitle>
              <CardDescription>
                {getText('libraryDesc', 'Shared documents available to all members')}
              </CardDescription>
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
                {categories.length > 0 && (
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
                )}
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : filteredPublicDocs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{searchQuery ? 'No documents match your search' : getText('noPublic', 'No public documents available')}</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredPublicDocs.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onDownload={handleDownload}
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
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {getText('associationTitle', 'Association Documents')}
              </CardTitle>
              <CardDescription>
                {getText('associationDesc', 'Official organizational documents and policies')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : associationDocs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{getText('noAssociation', 'No association documents available')}</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {associationDocs.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDocumentsSection;
