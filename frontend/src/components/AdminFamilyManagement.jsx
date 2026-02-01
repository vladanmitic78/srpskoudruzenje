import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Users, UserPlus, ChevronDown, ChevronUp, Trash2, Search } from 'lucide-react';
import { familyAPI } from '../services/api';

const AdminFamilyManagement = ({ t, users = [] }) => {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [expandedFamilies, setExpandedFamilies] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state for adding members
  const [memberForm, setMemberForm] = useState({
    fullName: '',
    email: '',
    yearOfBirth: '',
    phone: '',
    address: '',
    trainingGroup: '',
    relationship: 'child'
  });
  
  // Load all family relationships
  const loadFamilies = async () => {
    try {
      setLoading(true);
      const response = await familyAPI.adminGetAllFamilies();
      setFamilies(response.families || []);
    } catch (error) {
      console.error('Error loading families:', error);
      toast.error(t('admin.family.loadError') || 'Failed to load family data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadFamilies();
  }, []);
  
  // Filter users who can have family members added (for the dropdown)
  const eligibleUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      (user.fullName && user.fullName.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower));
    return matchesSearch;
  });
  
  // Reset form
  const resetForm = () => {
    setMemberForm({
      fullName: '',
      email: '',
      yearOfBirth: '',
      phone: '',
      address: '',
      trainingGroup: '',
      relationship: 'child'
    });
    setSelectedUser(null);
  };
  
  // Handle add family member
  const handleAddMember = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) {
      toast.error(t('admin.family.selectUser') || 'Please select a user first');
      return;
    }
    
    // Calculate member's age
    const memberAge = memberForm.yearOfBirth 
      ? new Date().getFullYear() - parseInt(memberForm.yearOfBirth)
      : 0;
    
    if (!memberForm.fullName || !memberForm.yearOfBirth) {
      toast.error(t('admin.family.requiredFields') || 'Please fill in all required fields');
      return;
    }
    
    // Email required only for members 18+
    if (memberAge >= 18 && !memberForm.email) {
      toast.error(t('admin.family.emailRequiredAdult') || 'Email is required for family members 18 years or older');
      return;
    }
    
    try {
      const userId = selectedUser.id || selectedUser._id;
      await familyAPI.adminAddMember(userId, memberForm);
      const message = memberAge < 18 && !memberForm.email
        ? (t('admin.family.addSuccessChild') || 'Family member added successfully! Notifications will be sent to parent\'s email.')
        : (t('admin.family.addSuccess') || 'Family member added successfully! Login credentials sent to their email.');
      toast.success(message);
      setAddModalOpen(false);
      resetForm();
      loadFamilies();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || t('admin.family.addError') || 'Failed to add family member';
      toast.error(errorMsg);
    }
  };
  
  // Handle remove family member
  const handleRemoveMember = async (memberId, deleteAccount = false) => {
    const confirmMsg = deleteAccount 
      ? (t('admin.family.deleteConfirm') || 'Are you sure you want to DELETE this member account entirely?')
      : (t('admin.family.unlinkConfirm') || 'Are you sure you want to unlink this family member?');
    
    if (!window.confirm(confirmMsg)) return;
    
    try {
      await familyAPI.adminRemoveMember(memberId, deleteAccount);
      toast.success(deleteAccount 
        ? (t('admin.family.deleteSuccess') || 'Member account deleted')
        : (t('admin.family.unlinkSuccess') || 'Family member unlinked'));
      loadFamilies();
    } catch (error) {
      toast.error(t('admin.family.removeError') || 'Failed to remove family member');
    }
  };
  
  // Toggle family expansion
  const toggleFamily = (familyId) => {
    setExpandedFamilies(prev => ({
      ...prev,
      [familyId]: !prev[familyId]
    }));
  };
  
  // Get relationship label
  const getRelationshipLabel = (relationship) => {
    const labels = {
      child: t('admin.family.child') || 'Child',
      spouse: t('admin.family.spouse') || 'Spouse',
      friend: t('admin.family.friend') || 'Friend',
      other: t('admin.family.other') || 'Other'
    };
    return labels[relationship] || relationship;
  };
  
  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('admin.family.title') || 'Family Member Management'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('admin.family.description') || 'Add and manage family members for any user'}
          </p>
        </div>
        
        <Button
          onClick={() => {
            resetForm();
            setAddModalOpen(true);
          }}
          className="bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)]"
          data-testid="admin-add-family-btn"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {t('admin.family.addButton') || 'Add Family Member'}
        </Button>
      </div>
      
      {/* Existing Families List */}
      <Card className="border-2 border-[var(--color-primary)]/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            {t('admin.family.existingFamilies') || 'Existing Family Groups'}
            {families.length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {families.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              {t('admin.family.loading') || 'Loading family data...'}
            </div>
          ) : families.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {t('admin.family.noFamilies') || 'No family groups exist yet.'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {t('admin.family.addHint') || 'Click "Add Family Member" to create family relationships.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {families.map((family) => (
                <div
                  key={family.id}
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Family Header */}
                  <div
                    className="p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => toggleFamily(family.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-[var(--color-primary)]" />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {family.fullName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {family.email}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {family.familyMembers?.length || 0} {t('admin.family.members') || 'members'}
                      </Badge>
                    </div>
                    {expandedFamilies[family.id] ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                  
                  {/* Family Members */}
                  {expandedFamilies[family.id] && family.familyMembers && (
                    <div className="p-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                      {family.familyMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{member.fullName}</span>
                              <Badge variant="secondary" className="text-xs">
                                {getRelationshipLabel(member.relationship)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {member.email} • {t('admin.family.born') || 'Born'}: {member.yearOfBirth}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMember(member.id, false);
                              }}
                              variant="outline"
                              size="sm"
                              title={t('admin.family.unlink') || 'Unlink from family'}
                            >
                              {t('admin.family.unlink') || 'Unlink'}
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMember(member.id, true);
                              }}
                              variant="destructive"
                              size="sm"
                              title={t('admin.family.delete') || 'Delete account'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add Family Member Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UserPlus className="h-5 w-5 mr-2" />
              {t('admin.family.addTitle') || 'Add Family Member'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAddMember} className="space-y-4">
            {/* Select Parent User */}
            <div className="space-y-2">
              <Label>{t('admin.family.selectParent') || 'Select Parent Account'} *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t('admin.family.searchUser') || 'Search by name or email...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {searchTerm && (
                <div className="max-h-40 overflow-y-auto border rounded-md bg-white dark:bg-gray-900">
                  {eligibleUsers.slice(0, 10).map((user) => (
                    <div
                      key={user.id || user._id}
                      className={`p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        selectedUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchTerm(user.fullName || user.email);
                      }}
                    >
                      <div className="font-medium">{user.fullName || 'No name'}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  ))}
                  {eligibleUsers.length === 0 && (
                    <div className="p-2 text-gray-500 text-center">
                      {t('admin.family.noUsersFound') || 'No users found'}
                    </div>
                  )}
                </div>
              )}
              
              {selectedUser && (
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200">
                  <span className="text-sm text-green-800 dark:text-green-200">
                    ✓ {t('admin.family.selectedUser') || 'Selected'}: <strong>{selectedUser.fullName}</strong> ({selectedUser.email})
                  </span>
                </div>
              )}
            </div>
            
            <hr className="my-4" />
            
            {/* Family Member Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('admin.family.fullName') || 'Full Name'} *</Label>
                <Input
                  required
                  value={memberForm.fullName}
                  onChange={(e) => setMemberForm({...memberForm, fullName: e.target.value})}
                  placeholder="Enter full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t('admin.family.yearOfBirth') || 'Year of Birth'} *</Label>
                <Input
                  type="number"
                  required
                  min="1900"
                  max={new Date().getFullYear()}
                  value={memberForm.yearOfBirth}
                  onChange={(e) => setMemberForm({...memberForm, yearOfBirth: e.target.value})}
                  placeholder="2010"
                />
              </div>
              
              <div className="space-y-2">
                <Label>
                  {t('admin.family.email') || 'Email'}
                  {memberForm.yearOfBirth && (new Date().getFullYear() - parseInt(memberForm.yearOfBirth)) >= 18 
                    ? ' *' 
                    : ` (${t('admin.family.optionalForChildren') || 'optional for children under 18'})`}
                </Label>
                <Input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({...memberForm, email: e.target.value})}
                  placeholder="member@email.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t('admin.family.relationship') || 'Relationship'} *</Label>
                <select
                  value={memberForm.relationship}
                  onChange={(e) => setMemberForm({...memberForm, relationship: e.target.value})}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-800"
                >
                  <option value="child">{t('admin.family.child') || 'Child'}</option>
                  <option value="spouse">{t('admin.family.spouse') || 'Spouse'}</option>
                  <option value="friend">{t('admin.family.friend') || 'Friend'}</option>
                  <option value="other">{t('admin.family.other') || 'Other'}</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>{t('admin.family.phone') || 'Phone'}</Label>
                <Input
                  type="tel"
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})}
                  placeholder="+46 XX XXX XX XX"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t('admin.family.trainingGroup') || 'Training Group'}</Label>
                <select
                  value={memberForm.trainingGroup}
                  onChange={(e) => setMemberForm({...memberForm, trainingGroup: e.target.value})}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-800"
                >
                  <option value="">{t('admin.family.selectGroup') || 'Select a group'}</option>
                  <option value="folklor">Folklor</option>
                  <option value="kolo">Kolo</option>
                  <option value="choir">Choir</option>
                  <option value="kids">Kids</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{t('admin.family.address') || 'Address'}</Label>
              <Input
                value={memberForm.address}
                onChange={(e) => setMemberForm({...memberForm, address: e.target.value})}
                placeholder="Street, City, Postal Code"
              />
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {memberForm.yearOfBirth && (new Date().getFullYear() - parseInt(memberForm.yearOfBirth)) < 18 && !memberForm.email
                  ? `📧 ${t('admin.family.childNotice') || "Since this is a child under 18 without email, all notifications will be sent to the parent's email address."}`
                  : `📧 ${t('admin.family.credentialsNote') || 'Login credentials will be automatically sent to the email address provided.'}`}
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)]"
                disabled={!selectedUser}
              >
                {t('admin.family.addSubmit') || 'Add Family Member'}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setAddModalOpen(false);
                  resetForm();
                }}
                variant="outline"
                className="flex-1"
              >
                {t('admin.family.cancel') || 'Cancel'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFamilyManagement;
