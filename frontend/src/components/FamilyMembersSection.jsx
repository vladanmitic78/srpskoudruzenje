import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Users, UserPlus, Edit, Trash2, Mail, Phone, Calendar } from 'lucide-react';
import { familyAPI } from '../services/api';

const FamilyMembersSection = ({ t, user }) => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  
  // Helper to get translation with fallback
  const getText = (key, fallback) => {
    const translated = t(key);
    // If translation returns the key itself, use fallback
    return (translated && !translated.includes('.')) ? translated : fallback;
  };
  
  // Form state for adding/editing members
  const [memberForm, setMemberForm] = useState({
    fullName: '',
    email: '',
    yearOfBirth: '',
    phone: '',
    address: '',
    trainingGroup: '',
    relationship: 'child'
  });
  
  // Calculate user's age
  const calculateAge = (yearOfBirth) => {
    if (!yearOfBirth) return 0;
    return new Date().getFullYear() - parseInt(yearOfBirth);
  };
  
  const userAge = calculateAge(user?.yearOfBirth);
  const canAddMembers = userAge >= 18;
  
  // Load family members
  const loadFamilyMembers = async () => {
    try {
      setLoading(true);
      const response = await familyAPI.getMembers();
      setFamilyMembers(response.members || []);
    } catch (error) {
      console.error('Error loading family members:', error);
      toast.error(getText('family.loadError', 'Failed to load family members'));
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadFamilyMembers();
  }, []);
  
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
  };
  
  // Handle add member
  const handleAddMember = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!memberForm.fullName || !memberForm.email || !memberForm.yearOfBirth) {
      toast.error(getText('family.requiredFields', 'Please fill in all required fields'));
      return;
    }
    
    try {
      await familyAPI.addMember(memberForm);
      toast.success(getText('family.addSuccess', 'Family member added successfully! Login credentials sent to their email.'));
      setAddModalOpen(false);
      resetForm();
      loadFamilyMembers();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || getText('family.addError', 'Failed to add family member');
      toast.error(errorMsg);
    }
  };
  
  // Handle edit member
  const handleEditMember = async (e) => {
    e.preventDefault();
    
    if (!selectedMember) return;
    
    try {
      await familyAPI.updateMember(selectedMember.id, memberForm);
      toast.success(getText('family.updateSuccess', 'Family member updated successfully'));
      setEditModalOpen(false);
      setSelectedMember(null);
      resetForm();
      loadFamilyMembers();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || getText('family.updateError', 'Failed to update family member');
      toast.error(errorMsg);
    }
  };
  
  // Handle remove member
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm(getText('family.removeConfirm', 'Are you sure you want to remove this family member from your account? They will still be able to access their own account.'))) {
      return;
    }
    
    try {
      await familyAPI.removeMember(memberId);
      toast.success(getText('family.removeSuccess', 'Family member removed from your account'));
      loadFamilyMembers();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || getText('family.removeError', 'Failed to remove family member');
      toast.error(errorMsg);
    }
  };
  
  // Open edit modal
  const openEditModal = (member) => {
    setSelectedMember(member);
    setMemberForm({
      fullName: member.fullName || '',
      email: member.email || '',
      yearOfBirth: member.yearOfBirth || '',
      phone: member.phone || '',
      address: member.address || '',
      trainingGroup: member.trainingGroup || '',
      relationship: member.relationship || 'child'
    });
    setEditModalOpen(true);
  };
  
  // Get relationship label
  const getRelationshipLabel = (relationship) => {
    const labels = {
      child: getText('family.relationshipChild', 'Child'),
      spouse: getText('family.relationshipSpouse', 'Spouse'),
      friend: getText('family.relationshipFriend', 'Friend'),
      other: getText('family.relationshipOther', 'Other')
    };
    return labels[relationship] || relationship;
  };
  
  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {getText('family.title', 'Family Members')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {getText('family.description', 'Manage your family members and their accounts')}
          </p>
        </div>
        
        {canAddMembers ? (
          <Button
            onClick={() => {
              resetForm();
              setAddModalOpen(true);
            }}
            className="bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)]"
            data-testid="add-family-member-btn"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {getText('family.addButton', 'Add Family Member')}
          </Button>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {getText('family.ageRestriction', 'You must be 18 or older to add family members')}
            </p>
          </div>
        )}
      </div>
      
      {/* Family Members List */}
      <Card className="border-2 border-[var(--color-primary)]/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            {getText('family.membersList', 'Your Family Members')}
            {familyMembers.length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {familyMembers.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              {getText('family.loading', 'Loading family members...')}
            </div>
          ) : familyMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {t('family.noMembers') || "You haven't added any family members yet."}
              </p>
              {canAddMembers && (
                <p className="text-sm text-gray-500 mt-2">
                  {getText('family.addHint', 'Click "Add Family Member" to add your children or friends.')}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {familyMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-[var(--color-primary)]/40 transition-colors"
                  data-testid={`family-member-${member.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                          {member.fullName}
                        </h3>
                        <Badge variant="outline">
                          {getRelationshipLabel(member.relationship)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          {member.email}
                        </div>
                        {member.phone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2" />
                            {member.phone}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {getText('family.yearOfBirth', 'Born')}: {member.yearOfBirth} ({calculateAge(member.yearOfBirth)} {getText('family.years', 'years')})
                        </div>
                        {member.trainingGroup && (
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            {getText('family.trainingGroup', 'Group')}: {member.trainingGroup}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => openEditModal(member)}
                        variant="outline"
                        size="sm"
                        data-testid={`edit-member-${member.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleRemoveMember(member.id)}
                        variant="destructive"
                        size="sm"
                        data-testid={`remove-member-${member.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Info Card */}
      <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {getText('family.infoTitle', 'About Family Accounts')}
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• {getText('family.info1', 'Each family member gets their own login credentials')}</li>
            <li>• {getText('family.info2', 'Login details are automatically sent to their email')}</li>
            <li>• {getText('family.info3', 'Family members can view their own invoices and events')}</li>
            <li>• {getText('family.info4', 'Removing a member only unlinks them from your account')}</li>
          </ul>
        </CardContent>
      </Card>
      
      {/* Add Member Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UserPlus className="h-5 w-5 mr-2" />
              {getText('family.addTitle', 'Add Family Member')}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{getText('family.fullName', 'Full Name')} *</Label>
                <Input
                  required
                  value={memberForm.fullName}
                  onChange={(e) => setMemberForm({...memberForm, fullName: e.target.value})}
                  placeholder="Enter full name"
                  data-testid="member-fullname-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{getText('family.email', 'Email')} *</Label>
                <Input
                  type="email"
                  required
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({...memberForm, email: e.target.value})}
                  placeholder="member@email.com"
                  data-testid="member-email-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{getText('family.yearOfBirth', 'Year of Birth')} *</Label>
                <Input
                  type="number"
                  required
                  min="1900"
                  max={new Date().getFullYear()}
                  value={memberForm.yearOfBirth}
                  onChange={(e) => setMemberForm({...memberForm, yearOfBirth: e.target.value})}
                  placeholder="2010"
                  data-testid="member-year-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{getText('family.relationship', 'Relationship')} *</Label>
                <select
                  value={memberForm.relationship}
                  onChange={(e) => setMemberForm({...memberForm, relationship: e.target.value})}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-800"
                  data-testid="member-relationship-select"
                >
                  <option value="child">{getText('family.relationshipChild', 'Child')}</option>
                  <option value="spouse">{getText('family.relationshipSpouse', 'Spouse')}</option>
                  <option value="friend">{getText('family.relationshipFriend', 'Friend')}</option>
                  <option value="other">{getText('family.relationshipOther', 'Other')}</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>{getText('family.phone', 'Phone')}</Label>
                <Input
                  type="tel"
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})}
                  placeholder="+46 XX XXX XX XX"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{getText('family.trainingGroup', 'Training Group')}</Label>
                <select
                  value={memberForm.trainingGroup}
                  onChange={(e) => setMemberForm({...memberForm, trainingGroup: e.target.value})}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-800"
                >
                  <option value="">{getText('family.selectGroup', 'Select a group')}</option>
                  <option value="folklor">Folklor</option>
                  <option value="kolo">Kolo</option>
                  <option value="choir">Choir</option>
                  <option value="kids">Kids</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{getText('family.address', 'Address')}</Label>
              <Input
                value={memberForm.address}
                onChange={(e) => setMemberForm({...memberForm, address: e.target.value})}
                placeholder="Street, City, Postal Code"
              />
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {getText('family.credentialsNote', '📧 Login credentials will be automatically sent to the email address provided.')}
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)]"
                data-testid="submit-add-member-btn"
              >
                {getText('family.addSubmit', 'Add Member')}
              </Button>
              <Button
                type="button"
                onClick={() => setAddModalOpen(false)}
                variant="outline"
                className="flex-1"
              >
                {getText('family.cancel', 'Cancel')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Member Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="h-5 w-5 mr-2" />
              {getText('family.editTitle', 'Edit Family Member')}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleEditMember} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{getText('family.fullName', 'Full Name')} *</Label>
                <Input
                  required
                  value={memberForm.fullName}
                  onChange={(e) => setMemberForm({...memberForm, fullName: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{getText('family.email', 'Email')} *</Label>
                <Input
                  type="email"
                  required
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({...memberForm, email: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{getText('family.yearOfBirth', 'Year of Birth')} *</Label>
                <Input
                  type="number"
                  required
                  min="1900"
                  max={new Date().getFullYear()}
                  value={memberForm.yearOfBirth}
                  onChange={(e) => setMemberForm({...memberForm, yearOfBirth: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{getText('family.relationship', 'Relationship')}</Label>
                <select
                  value={memberForm.relationship}
                  onChange={(e) => setMemberForm({...memberForm, relationship: e.target.value})}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-800"
                >
                  <option value="child">{getText('family.relationshipChild', 'Child')}</option>
                  <option value="spouse">{getText('family.relationshipSpouse', 'Spouse')}</option>
                  <option value="friend">{getText('family.relationshipFriend', 'Friend')}</option>
                  <option value="other">{getText('family.relationshipOther', 'Other')}</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>{getText('family.phone', 'Phone')}</Label>
                <Input
                  type="tel"
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{getText('family.trainingGroup', 'Training Group')}</Label>
                <select
                  value={memberForm.trainingGroup}
                  onChange={(e) => setMemberForm({...memberForm, trainingGroup: e.target.value})}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-800"
                >
                  <option value="">{getText('family.selectGroup', 'Select a group')}</option>
                  <option value="folklor">Folklor</option>
                  <option value="kolo">Kolo</option>
                  <option value="choir">Choir</option>
                  <option value="kids">Kids</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{getText('family.address', 'Address')}</Label>
              <Input
                value={memberForm.address}
                onChange={(e) => setMemberForm({...memberForm, address: e.target.value})}
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)]"
              >
                {getText('family.saveChanges', 'Save Changes')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setEditModalOpen(false);
                  setSelectedMember(null);
                  resetForm();
                }}
                variant="outline"
                className="flex-1"
              >
                {getText('family.cancel', 'Cancel')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyMembersSection;
