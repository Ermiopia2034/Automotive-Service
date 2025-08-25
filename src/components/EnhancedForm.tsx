'use client';

import { useState, useEffect, useCallback } from 'react';
import { FormValidator, ValidationRule, ValidationResult } from '@/utils/validation';
import { ErrorAlert } from './ErrorBoundary';
import LoadingSpinner from './LoadingSpinner';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'tel' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio';
  placeholder?: string;
  options?: { value: string; label: string; description?: string }[];
  validation: ValidationRule;
  value?: string | number | boolean;
  description?: string;
  icon?: string;
  disabled?: boolean;
  rows?: number;
}

interface EnhancedFormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, string | number | boolean>) => Promise<unknown>;
  submitText?: string;
  submitLoadingText?: string;
  title?: string;
  description?: string;
  successMessage?: string;
  onSuccess?: (result: unknown) => void;
  onCancel?: () => void;
  cancelText?: string;
  validateOnChange?: boolean;
  showProgress?: boolean;
  className?: string;
}

export default function EnhancedForm({
  fields,
  onSubmit,
  submitText = 'Submit',
  submitLoadingText = 'Processing...',
  title,
  description,
  successMessage = 'Form submitted successfully!',
  onSuccess,
  onCancel,
  cancelText = 'Cancel',
  validateOnChange = true,
  className = ''
}: EnhancedFormProps) {
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Initialize form data with default values
  useEffect(() => {
    const initialData: Record<string, string | number | boolean> = {};
    fields.forEach(field => {
      initialData[field.name] = field.value || (field.type === 'checkbox' ? false : '');
    });
    setFormData(initialData);
  }, [fields]);

  // Real-time validation
  const validateField = useCallback((fieldName: string, value: string | number | boolean) => {
    const field = fields.find(f => f.name === fieldName);
    if (!field) return null;

    const validator = new FormValidator([{
      name: fieldName,
      value,
      rules: field.validation,
      label: field.label
    }]);

    const result = validator.validate();
    return result.errors[fieldName] || null;
  }, [fields]);

  const handleFieldChange = (fieldName: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    if (validateOnChange && touched[fieldName]) {
      const fieldError = validateField(fieldName, value);
      setErrors(prev => ({
        ...prev,
        [fieldName]: fieldError || ''
      }));
    }
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    if (validateOnChange) {
      const fieldError = validateField(fieldName, formData[fieldName]);
      setErrors(prev => ({
        ...prev,
        [fieldName]: fieldError || ''
      }));
    }
  };

  const validateForm = async (): Promise<ValidationResult> => {
    const formFields = fields.map(field => ({
      name: field.name,
      value: formData[field.name],
      rules: field.validation,
      label: field.label
    }));

    const validator = new FormValidator(formFields);
    return await validator.validateAsync();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Mark all fields as touched
      const allTouched: Record<string, boolean> = {};
      fields.forEach(field => {
        allTouched[field.name] = true;
      });
      setTouched(allTouched);

      // Validate form
      const validationResult = await validateForm();
      
      if (!validationResult.isValid) {
        setErrors(validationResult.errors);
        // Focus first error field
        const firstErrorField = Object.keys(validationResult.errors)[0];
        const errorElement = document.getElementById(`field-${firstErrorField}`);
        errorElement?.focus();
        return;
      }

      // Clear errors
      setErrors({});

      // Submit form
      const result = await onSubmit(formData);
      
      setIsSuccess(true);
      onSuccess?.(result);

    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred while submitting the form');
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const fieldId = `field-${field.name}`;
    const hasError = errors[field.name] && touched[field.name];
    const fieldValue = formData[field.name] || '';

    const baseInputClasses = `
      w-full px-3 py-2 border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
      ${hasError ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500'}
      ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    `;

    switch (field.type) {
      case 'select':
        return (
          <select
            id={fieldId}
            value={String(fieldValue || '')}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            onBlur={() => handleFieldBlur(field.name)}
            disabled={field.disabled}
            className={baseInputClasses}
            aria-describedby={`${fieldId}-description ${fieldId}-error`}
            aria-invalid={hasError ? 'true' : 'false'}
            required={field.validation.required}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            id={fieldId}
            value={String(fieldValue || '')}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            onBlur={() => handleFieldBlur(field.name)}
            placeholder={field.placeholder}
            rows={field.rows || 3}
            disabled={field.disabled}
            className={baseInputClasses}
            aria-describedby={`${fieldId}-description ${fieldId}-error`}
            aria-invalid={hasError ? 'true' : 'false'}
            required={field.validation.required}
          />
        );

      case 'checkbox':
        return (
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              id={fieldId}
              type="checkbox"
              checked={Boolean(fieldValue)}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              onBlur={() => handleFieldBlur(field.name)}
              disabled={field.disabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              aria-describedby={`${fieldId}-description ${fieldId}-error`}
              required={field.validation.required}
            />
            <span className="text-sm text-gray-900">{field.label}</span>
          </label>
        );

      case 'radio':
        return (
          <fieldset>
            <legend className="text-sm font-medium text-gray-900 mb-2">{field.label}</legend>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name={field.name}
                    value={option.value}
                    checked={fieldValue === option.value}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    onBlur={() => handleFieldBlur(field.name)}
                    disabled={field.disabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    required={field.validation.required}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{option.label}</span>
                    {option.description && (
                      <p className="text-sm text-gray-500">{option.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </fieldset>
        );

      default:
        return (
          <div className="relative">
            {field.icon && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">{field.icon}</span>
              </div>
            )}
            <input
              id={fieldId}
              type={field.type}
              value={field.type === 'number' ? Number(fieldValue || 0) : String(fieldValue || '')}
              onChange={(e) => handleFieldChange(field.name, field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              placeholder={field.placeholder}
              disabled={field.disabled}
              className={`${baseInputClasses} ${field.icon ? 'pl-10' : ''}`}
              aria-describedby={`${fieldId}-description ${fieldId}-error`}
              aria-invalid={hasError ? 'true' : 'false'}
              required={field.validation.required}
              minLength={field.validation.minLength}
              maxLength={field.validation.maxLength}
              min={field.validation.min}
              max={field.validation.max}
            />
          </div>
        );
    }
  };

  if (isSuccess) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Success!</h3>
          <p className="text-gray-600">{successMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {(title || description) && (
        <div className="px-6 py-4 border-b border-gray-200">
          {title && <h2 className="text-xl font-semibold text-gray-900">{title}</h2>}
          {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6" noValidate>
        {submitError && (
          <ErrorAlert error={submitError} onDismiss={() => setSubmitError('')} className="mb-6" />
        )}

        <div className="space-y-6">
          {fields.map((field) => (
            <div key={field.name}>
              {field.type !== 'checkbox' && field.type !== 'radio' && (
                <label htmlFor={`field-${field.name}`} className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.validation.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              )}

              {renderField(field)}

              {field.description && (
                <p id={`field-${field.name}-description`} className="mt-1 text-sm text-gray-500">
                  {field.description}
                </p>
              )}

              {errors[field.name] && touched[field.name] && (
                <p id={`field-${field.name}-error`} className="mt-1 text-sm text-red-600" role="alert">
                  {errors[field.name]}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || Object.keys(errors).some(key => errors[key])}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" color="white" className="mr-2" />
                {submitLoadingText}
              </>
            ) : (
              submitText
            )}
          </button>
        </div>
      </form>
    </div>
  );
}