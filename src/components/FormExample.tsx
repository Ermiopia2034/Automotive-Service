'use client';

import { useState } from 'react';
import EnhancedForm from './EnhancedForm';
import { ValidationPatterns } from '@/utils/validation';

// Example usage of the EnhancedForm component with advanced validation
export default function FormExample() {
  const [showForm, setShowForm] = useState(true);

  const formFields = [
    {
      name: 'firstName',
      label: 'First Name',
      type: 'text' as const,
      placeholder: 'Enter your first name',
      icon: '👤',
      validation: {
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern: ValidationPatterns.alpha,
      },
      description: 'Letters only, 2-50 characters',
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email' as const,
      placeholder: 'Enter your email',
      icon: '📧',
      validation: {
        required: true,
        email: true,
      },
      description: 'We\'ll use this to contact you',
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'tel' as const,
      placeholder: '+1 (555) 123-4567',
      icon: '📱',
      validation: {
        required: true,
        phone: true,
      },
      description: 'International format preferred',
    },
    {
      name: 'serviceType',
      label: 'Service Type',
      type: 'select' as const,
      validation: {
        required: true,
      },
      options: [
        { value: 'oil_change', label: 'Oil Change', description: 'Regular maintenance' },
        { value: 'brake_service', label: 'Brake Service', description: 'Safety inspection' },
        { value: 'tire_replacement', label: 'Tire Replacement', description: 'New tires' },
        { value: 'general_repair', label: 'General Repair', description: 'Various issues' },
      ],
    },
    {
      name: 'message',
      label: 'Additional Details',
      type: 'textarea' as const,
      placeholder: 'Describe your service needs...',
      rows: 4,
      validation: {
        maxLength: 500,
      },
      description: 'Optional - any additional information about your service request',
    },
    {
      name: 'agreeTerms',
      label: 'I agree to the Terms of Service and Privacy Policy',
      type: 'checkbox' as const,
      validation: {
        required: true,
        custom: (value: string | number | boolean) => value ? null : 'You must agree to the terms to continue',
      },
    },
  ];

  const handleSubmit = async (_data: Record<string, string | number | boolean>) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate random success/failure for demo
    if (Math.random() > 0.3) {
      return { success: true, id: '12345' };
    } else {
      throw new Error('Service temporarily unavailable. Please try again.');
    }
  };

  const handleSuccess = (result: unknown) => {
    console.log('Form submitted successfully:', result);
    setTimeout(() => {
      setShowForm(false);
    }, 3000);
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Form Demo Complete</h3>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Show Form Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <EnhancedForm
        fields={formFields}
        onSubmit={handleSubmit}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        title="Service Request Form"
        description="Please fill out this form to request automotive service. All required fields must be completed."
        submitText="Submit Request"
        submitLoadingText="Processing Request..."
        successMessage="Your service request has been submitted successfully! We'll contact you within 24 hours."
        validateOnChange={true}
        className="w-full"
      />
    </div>
  );
}