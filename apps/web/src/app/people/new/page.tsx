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

interface Address {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

interface CreatePersonDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  nationality?: string;
  address?: Address;
}

const COUNTRIES = [
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Ireland', label: 'Ireland' },
  { value: 'United States', label: 'United States' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Australia', label: 'Australia' },
  { value: 'France', label: 'France' },
  { value: 'Germany', label: 'Germany' },
  { value: 'Spain', label: 'Spain' },
  { value: 'Italy', label: 'Italy' },
  { value: 'Netherlands', label: 'Netherlands' },
];

export default function NewPersonPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<CreatePersonDto>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: undefined,
    nationality: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom',
    },
  });

  const handleInputChange = (field: keyof CreatePersonDto, value: any) => {
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

  const handleAddressChange = (field: keyof Address, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address!,
        [field]: value,
      },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
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

      // Clean up form data - remove empty strings and empty address
      const submitData: CreatePersonDto = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        dateOfBirth: formData.dateOfBirth,
        nationality: formData.nationality?.trim() || undefined,
      };

      // Only include address if at least line1 is provided
      if (formData.address?.line1?.trim()) {
        submitData.address = {
          line1: formData.address.line1.trim(),
          line2: formData.address.line2?.trim() || undefined,
          city: formData.address.city.trim(),
          county: formData.address.county?.trim() || undefined,
          postcode: formData.address.postcode.trim(),
          country: formData.address.country,
        };
      }

      const person = await api.post<{ id: string }>(
        '/clients/people',
        submitData
      );
      router.push(`/people/${person.id}`);
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'An error occurred while creating the person',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MDJLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <MDJSection
          title="Add New Person"
          subtitle="Create a new person record"
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
            <MDJCard title="Basic Information" subtitle="Essential personal details">
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

                  <MDJInput
                    label="Date of Birth"
                    type="date"
                    value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value ? new Date(e.target.value) : undefined)}
                  />

                  <MDJSelect
                    label="Nationality"
                    value={formData.nationality || ''}
                    onChange={(e) => handleInputChange('nationality', e.target.value)}
                    options={[{ value: '', label: 'Select nationality...' }, ...COUNTRIES]}
                  />
                </div>
            </MDJCard>

            {/* Contact Information */}
            <MDJCard title="Contact Information" subtitle="Contact details for the person">
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

            {/* Address Information */}
            <MDJCard title="Address Information" subtitle="Residential or business address">
              <div className="space-y-4">
                  <MDJInput
                    label="Address Line 1"
                    value={formData.address?.line1 || ''}
                    onChange={(e) => handleAddressChange('line1', e.target.value)}
                    placeholder="Street address"
                  />

                  <MDJInput
                    label="Address Line 2"
                    value={formData.address?.line2 || ''}
                    onChange={(e) => handleAddressChange('line2', e.target.value)}
                    placeholder="Apartment, suite, unit, building, floor, etc."
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MDJInput
                      label="City"
                      value={formData.address?.city || ''}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      placeholder="City"
                    />

                    <MDJInput
                      label="County/State"
                      value={formData.address?.county || ''}
                      onChange={(e) => handleAddressChange('county', e.target.value)}
                      placeholder="County or state"
                    />

                    <MDJInput
                      label="Postcode"
                      value={formData.address?.postcode || ''}
                      onChange={(e) => handleAddressChange('postcode', e.target.value)}
                      placeholder="SW1A 1AA"
                    />
                  </div>

                  <MDJSelect
                    label="Country"
                    value={formData.address?.country || 'United Kingdom'}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                    options={COUNTRIES}
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
                  Create Person
                </MDJButton>
              </div>
            </MDJCard>
          </div>
        </form>
      </div>
    </MDJLayout>
  );
}
