import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Users, UserPlus, ChevronDown, ChevronUp, Trash2, Search, Mail } from 'lucide-react';
import { familyAPI } from '../services/api';

const AdminFamilyManagement = ({ t, users = [] }) => {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [expandedFamilies, setExpandedFamilies] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  
  // Initial empty member template
  const emptyMember = {
    fullName: '',
    email: '',
    yearOfBirth: '',
    phone: '',
    address: '',
    trainingGroup: '',
    relationship: 'child',
    photoConsent: false
  };
  
  // Form state for adding multiple members
  const [members, setMembers] = useState([{ ...emptyMember }]);
  
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
  
  // Send photo consent reminders to all parents
  const handleSendConsentReminders = async () => {
    const confirmed = window.confirm(
      t('admin.family.sendRemindersConfirm') || 
      'Are you sure you want to send photo consent reminder emails to ALL parents who have minors without consent?'
    );
    
    if (!confirmed) return;
    
    setSendingReminders(true);
    try {
      const response = await familyAPI.sendConsentReminders();
      if (response.emails_sent > 0) {
        toast.success(
          `${t('admin.family.remindersSent') || 'Reminder emails sent to'} ${response.parents_notified} ${t('admin.family.parents') || 'parent(s)'}`
        );
      } else {
        toast.info(t('admin.family.noMinorsWithoutConsent') || 'No minors without consent found. No emails sent.');
      }
    } catch (error) {
      console.error('Failed to send reminders:', error);
      toast.error(t('admin.family.remindersFailed') || 'Failed to send reminder emails');
    } finally {
      setSendingReminders(false);
    }
  };
  
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
    setMembers([{ ...emptyMember }]);
    setSelectedUser(null);
    setSearchTerm('');
  };
  
  // Add another member row
  const addMemberRow = () => {
    setMembers([...members, { ...emptyMember }]);
  };
  
  // Remove a member row
  const removeMemberRow = (index) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };
  
  // Update a specific member's field
  const updateMember = (index, field, value) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };
  
  // Handle add all family members
  const handleAddMembers = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) {
      toast.error(t('admin.family.selectUser') || 'Please select a user first');
      return;
    }
    
    // Validate all members
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const memberAge = member.yearOfBirth 
        ? new Date().getFullYear() - parseInt(member.yearOfBirth)
        : 0;
      
      if (!member.fullName || !member.yearOfBirth) {
        toast.error(`${t('admin.family.requiredFields') || 'Please fill in all required fields'} (Member ${i + 1})`);
        return;
      }
      
      // Email required only for members 18+
      if (memberAge >= 18 && !member.email) {
        toast.error(`${t('admin.family.emailRequiredAdult') || 'Email is required for family members 18 years or older'} (Member ${i + 1})`);
        return;
      }
      
      // Photo consent required for minors
      if (memberAge < 18 && !member.photoConsent) {
        toast.error(`${t('admin.family.photoConsentRequired') || 'Photo consent is required for family members under 18 years old'} (Member ${i + 1})`);
        return;
      }
    }
    
    setSubmitting(true);
    const userId = selectedUser.id || selectedUser._id;
    let successCount = 0;
    let errorMessages = [];
    
    try {
      // Add each member sequentially
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        try {
          await familyAPI.adminAddMember(userId, member);
          successCount++;
        } catch (error) {
          const errorDetail = error.response?.data?.detail || 'Unknown error';
          errorMessages.push(`${member.fullName || `Član ${i+1}`}: ${errorDetail}`);
          console.error('Failed to add member:', member.fullName, error);
        }
      }
      
      if (successCount > 0) {
        const message = successCount === 1
          ? (t('admin.family.addSuccess') || 'Family member added successfully!')
          : `${successCount} ${t('admin.family.membersAddedSuccess') || 'family members added successfully!'}`;
        toast.success(message);
      }
      
      if (errorMessages.length > 0) {
        // Show each error
        errorMessages.forEach(msg => toast.error(msg));
      }
      
      if (successCount > 0) {
        setAddModalOpen(false);
        resetForm();
        loadFamilies();
      }
    } catch (error) {
      toast.error(t('admin.family.addError') || 'Failed to add family members');
    } finally {
      setSubmitting(false);
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
        
        <div className="flex gap-2">
          <Button
            onClick={handleSendConsentReminders}
            variant="outline"
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
            disabled={sendingReminders}
            data-testid="send-consent-reminders-btn"
          >
            <Mail className="h-4 w-4 mr-2" />
            {sendingReminders 
              ? (t('admin.family.sendingReminders') || 'Sending...') 
              : (t('admin.family.sendConsentReminders') || 'Send Consent Reminders')}
          </Button>
          
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UserPlus className="h-5 w-5 mr-2" />
              {t('admin.family.addTitle') || 'Add Family Member'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAddMembers} className="space-y-4">
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
              
              {searchTerm && !selectedUser && (
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
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 flex justify-between items-center">
                  <span className="text-sm text-green-800 dark:text-green-200">
                    ✓ {t('admin.family.selectedUser') || 'Selected'}: <strong>{selectedUser.fullName}</strong> ({selectedUser.email})
                  </span>
                  <button
                    type="button"
                    onClick={() => { setSelectedUser(null); setSearchTerm(''); }}
                    className="text-green-600 hover:text-green-800 text-sm underline"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
            
            <hr className="my-4" />
            
            {/* Family Members Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">
                  {t('admin.family.membersToAdd') || 'Family Members to Add'} ({members.length})
                </Label>
                <Button
                  type="button"
                  onClick={addMemberRow}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  {t('admin.family.addAnother') || 'Add Another'}
                </Button>
              </div>
              
              {/* Member Cards */}
              {members.map((member, index) => (
                <div 
                  key={index} 
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50"
                >
                  {/* Member Header */}
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="font-medium text-sm text-gray-600 dark:text-gray-400">
                      {t('admin.family.member') || 'Member'} #{index + 1}
                    </span>
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMemberRow(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Member Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('admin.family.fullName') || 'Full Name'} *</Label>
                      <Input
                        required
                        value={member.fullName}
                        onChange={(e) => updateMember(index, 'fullName', e.target.value)}
                        placeholder="Full name"
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">{t('admin.family.yearOfBirth') || 'Year of Birth'} *</Label>
                      <Input
                        type="number"
                        required
                        min="1900"
                        max={new Date().getFullYear()}
                        value={member.yearOfBirth}
                        onChange={(e) => updateMember(index, 'yearOfBirth', e.target.value)}
                        placeholder="2010"
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">{t('admin.family.trainingGroup') || 'Training Group'}</Label>
                      <select
                        value={member.trainingGroup}
                        onChange={(e) => updateMember(index, 'trainingGroup', e.target.value)}
                        className="w-full h-9 px-2 text-sm border rounded-md bg-white dark:bg-gray-800"
                      >
                        <option value="">{t('admin.family.selectGroup') || 'Select group'}</option>
                        <option value="folklor">Folklor</option>
                        <option value="kolo">Kolo</option>
                        <option value="choir">Choir</option>
                        <option value="kids">Kids</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">
                        {t('admin.family.email') || 'Email'}
                        {member.yearOfBirth && (new Date().getFullYear() - parseInt(member.yearOfBirth)) >= 18 
                          ? ' *' 
                          : ''}
                      </Label>
                      <Input
                        type="email"
                        value={member.email}
                        onChange={(e) => updateMember(index, 'email', e.target.value)}
                        placeholder={member.yearOfBirth && (new Date().getFullYear() - parseInt(member.yearOfBirth)) < 18 
                          ? "Optional for children" 
                          : "email@example.com"}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">{t('admin.family.relationship') || 'Relationship'}</Label>
                      <select
                        value={member.relationship}
                        onChange={(e) => updateMember(index, 'relationship', e.target.value)}
                        className="w-full h-9 px-2 text-sm border rounded-md bg-white dark:bg-gray-800"
                      >
                        <option value="child">{t('admin.family.child') || 'Child'}</option>
                        <option value="spouse">{t('admin.family.spouse') || 'Spouse'}</option>
                        <option value="friend">{t('admin.family.friend') || 'Friend'}</option>
                        <option value="other">{t('admin.family.other') || 'Other'}</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">{t('admin.family.phone') || 'Phone'}</Label>
                      <Input
                        type="tel"
                        value={member.phone}
                        onChange={(e) => updateMember(index, 'phone', e.target.value)}
                        placeholder="+46 XX XXX XX XX"
                        className="h-9"
                      />
                    </div>
                  </div>
                  
                  {/* Photo Consent - Required for minors */}
                  {member.yearOfBirth && (new Date().getFullYear() - parseInt(member.yearOfBirth)) < 18 && (
                    <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={`photoConsent-${index}`}
                          checked={member.photoConsent || false}
                          onChange={(e) => updateMember(index, 'photoConsent', e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                          data-testid={`photo-consent-checkbox-${index}`}
                        />
                        <label htmlFor={`photoConsent-${index}`} className="cursor-pointer">
                          <span className="font-semibold text-blue-900 dark:text-blue-100 block text-sm">
                            {t('admin.family.photoConsentTitle') || 'Photo Consent'} *
                          </span>
                          <span className="text-xs text-blue-800 dark:text-blue-200">
                            {t('admin.family.photoConsentText') || 'I consent to this child being photographed and pictures being published on the SKUD Täby website and social media channels.'}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                📧 {t('admin.family.bulkNotice') || "Children under 18 without email will receive notifications via parent's email. Adults will receive login credentials."}
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)]"
                disabled={!selectedUser || submitting}
              >
                {submitting 
                  ? (t('admin.family.adding') || 'Adding...') 
                  : members.length === 1 
                    ? (t('admin.family.addSubmit') || 'Add Family Member')
                    : `${t('admin.family.addSubmit') || 'Add'} ${members.length} ${t('admin.family.members') || 'Members'}`}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setAddModalOpen(false);
                  resetForm();
                }}
                variant="outline"
                className="flex-1"
                disabled={submitting}
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
