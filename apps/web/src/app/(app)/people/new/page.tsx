'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MDJLayout,
  MDJSection,
  MDJCard,
  MDJButton,
  MDJInput,
  MDJSelect,
  MDJFormGroup
} from '@/components/mdj-ui';
import { api } from '@/lib/api';

type StaffRole = 'PARTNER_DIRECTOR' | 'MANAGER' | 'SENIOR_STAFF' | 'STAFF' | 'TRAINEE';

interface CreateStaffDto {
  firstName: string;
  lastName: string;
  role: StaffRole;
  email?: string;
  phone?: string;
}

const STAFF_ROLES: Array<{ value: StaffRole; label: string }> = [
  { value: 'PARTNER_DIRECTOR', label: 'Partner/Director' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SENIOR_STAFF', label: 'Senior Staff' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'TRAINEE', label: 'Trainee' },
];

export default function NewPersonPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<CreateStaffDto>({
    firstName: '',
    lastName: '',
    role: 'STAFF',
    email: '',
    phone: '',
  });

  const handleInputChange = (field: keyof CreateStaffDto, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const submitData: CreateStaffDto = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
      };

      await api.post('/staff', submitData);
      router.push('/people');
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'An error occurred while creating the staff member',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MDJLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <MDJSection
          title="Add Staff"
          subtitle="Create a new practice staff member"
          actions={
            <MDJButton
              variant="outline"
              onClick={() => router.push('/people')}
            >
              Cancel
            </MDJButton>
          }
        >
          <></>
        </MDJSection>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <MDJCard title="Basic Information" subtitle="Essential staff details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MDJInput
                    label="First Name *"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    error={errors.firstName}
                    placeholder="Enter first name"
                  />

                  <MDJInput
                    label="Last Name *"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    error={errors.lastName}
                    placeholder="Enter last name"
                  />

                  <MDJSelect
                    label="Role *"
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value as StaffRole)}
                    options={STAFF_ROLES}
                    error={errors.role}
                  />
                </div>
            </MDJCard>

            {/* Contact Information */}
            <MDJCard title="Contact Information" subtitle="Contact details for the staff member">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MDJInput
                    label="Email Address"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    error={errors.email}
                    placeholder="person@example.com"
                  />

                  <MDJInput
                    label="Phone Number"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+44 20 1234 5678"
                  />
                </div>
            </MDJCard>

            {/* Error Display */}
            {errors.submit && (
              <MDJCard>
                <div className="text-red-500 text-sm">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errors.submit}
                  </div>
                </div>
              </MDJCard>
            )}

            {/* Form Actions */}
            <MDJCard>
              <div className="flex justify-end gap-4">
                <MDJButton
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/people')}
                  disabled={loading}
                >
                  Cancel
                </MDJButton>
                
                <MDJButton
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading}
                >
                  Create Staff
                </MDJButton>
              </div>
            </MDJCard>
          </div>
        </form>
      </div>
    </MDJLayout>
  );
}
