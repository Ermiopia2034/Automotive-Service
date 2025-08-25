// Form validation utilities with comprehensive error messages and validation rules

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  email?: boolean;
  phone?: boolean;
  custom?: (value: string | number | boolean) => string | null;
  customAsync?: (value: string | number | boolean) => Promise<string | null>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export interface FormField {
  name: string;
  value: string | number | boolean;
  rules: ValidationRule;
  label?: string;
}

// Email validation regex (RFC 5322 compliant)
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Phone validation regex (international format)
const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;

// Password strength validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

// Common validation patterns
export const ValidationPatterns = {
  email: emailRegex,
  phone: phoneRegex,
  password: passwordRegex,
  alphaNumeric: /^[a-zA-Z0-9]+$/,
  alpha: /^[a-zA-Z]+$/,
  numeric: /^[0-9]+$/,
  decimal: /^\d*\.?\d+$/,
  plateNumber: /^[A-Z0-9]{1,10}$/,
  plateCode: /^[A-Z]{1,3}$/
};

export class FormValidator {
  private fields: FormField[] = [];
  private errors: Record<string, string> = {};
  private warnings: Record<string, string> = {};

  constructor(fields: FormField[] = []) {
    this.fields = fields;
  }

  addField(field: FormField): FormValidator {
    this.fields.push(field);
    return this;
  }

  addFields(fields: FormField[]): FormValidator {
    this.fields.push(...fields);
    return this;
  }

  private validateField(field: FormField): string | null {
    const { name, value, rules, label } = field;
    const fieldLabel = label || name;

    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${fieldLabel} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    // String validations
    if (typeof value === 'string') {
      // Minimum length
      if (rules.minLength && value.length < rules.minLength) {
        return `${fieldLabel} must be at least ${rules.minLength} characters long`;
      }

      // Maximum length
      if (rules.maxLength && value.length > rules.maxLength) {
        return `${fieldLabel} must not exceed ${rules.maxLength} characters`;
      }

      // Email validation
      if (rules.email && !emailRegex.test(value)) {
        return `${fieldLabel} must be a valid email address`;
      }

      // Phone validation
      if (rules.phone && !phoneRegex.test(value)) {
        return `${fieldLabel} must be a valid phone number`;
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        return `${fieldLabel} format is invalid`;
      }
    }

    // Number validations
    if (typeof value === 'number') {
      // Minimum value
      if (rules.min !== undefined && value < rules.min) {
        return `${fieldLabel} must be at least ${rules.min}`;
      }

      // Maximum value
      if (rules.max !== undefined && value > rules.max) {
        return `${fieldLabel} must not exceed ${rules.max}`;
      }
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        return customError;
      }
    }

    return null;
  }

  validate(): ValidationResult {
    this.errors = {};
    this.warnings = {};

    for (const field of this.fields) {
      const error = this.validateField(field);
      if (error) {
        this.errors[field.name] = error;
      }
    }

    return {
      isValid: Object.keys(this.errors).length === 0,
      errors: { ...this.errors },
      warnings: { ...this.warnings }
    };
  }

  async validateAsync(): Promise<ValidationResult> {
    this.errors = {};
    this.warnings = {};

    // First run synchronous validations
    for (const field of this.fields) {
      const error = this.validateField(field);
      if (error) {
        this.errors[field.name] = error;
      }
    }

    // Then run async validations for fields that passed sync validation
    const asyncPromises: Promise<void>[] = [];

    for (const field of this.fields) {
      if (!this.errors[field.name] && field.rules.customAsync) {
        const promise = field.rules.customAsync(field.value).then(error => {
          if (error) {
            this.errors[field.name] = error;
          }
        });
        asyncPromises.push(promise);
      }
    }

    await Promise.all(asyncPromises);

    return {
      isValid: Object.keys(this.errors).length === 0,
      errors: { ...this.errors },
      warnings: { ...this.warnings }
    };
  }

  getFieldError(fieldName: string): string | null {
    return this.errors[fieldName] || null;
  }

  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  clearErrors(): void {
    this.errors = {};
  }

  clearFieldError(fieldName: string): void {
    delete this.errors[fieldName];
  }
}

// Utility functions for common validations
export const validateEmail = (email: string): boolean => {
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  return phoneRegex.test(phone);
};

export const validatePassword = (password: string): { 
  isValid: boolean; 
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (errors.length === 0) {
    if (password.length >= 12 && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      strength = 'strong';
    } else {
      strength = 'medium';
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
};

export const validatePlateNumber = (plateNumber: string, plateCode: string): boolean => {
  return ValidationPatterns.plateNumber.test(plateNumber) && ValidationPatterns.plateCode.test(plateCode);
};

// Real-time validation hook for React components
export const createRealTimeValidator = (initialFields: FormField[]) => {
  const validator = new FormValidator(initialFields);
  
  return {
    validate: () => validator.validate(),
    validateAsync: () => validator.validateAsync(),
    validateField: (fieldName: string, value: string | number | boolean) => {
      const field = validator['fields'].find(f => f.name === fieldName);
      if (field) {
        field.value = value;
        return validator['validateField'](field);
      }
      return null;
    },
    getFieldError: (fieldName: string) => validator.getFieldError(fieldName),
    hasErrors: () => validator.hasErrors(),
    clearErrors: () => validator.clearErrors(),
    clearFieldError: (fieldName: string) => validator.clearFieldError(fieldName)
  };
};

// Form submission helper with validation
export const handleFormSubmission = async <T = Record<string, string | number | boolean>>(
  formData: Record<string, string | number | boolean>,
  validationRules: Record<string, ValidationRule>,
  submitFn: (data: T) => Promise<unknown>,
  options?: {
    onValidationError?: (errors: Record<string, string>) => void;
    onSubmissionError?: (error: unknown) => void;
    onSuccess?: (result: unknown) => void;
    transform?: (data: Record<string, string | number | boolean>) => T;
  }
) => {
  try {
    // Create validator with form data
    const fields: FormField[] = Object.entries(formData).map(([name, value]) => ({
      name,
      value,
      rules: validationRules[name] || {},
      label: name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1')
    }));

    const validator = new FormValidator(fields);
    const validationResult = await validator.validateAsync();

    if (!validationResult.isValid) {
      options?.onValidationError?.(validationResult.errors);
      return { success: false, errors: validationResult.errors };
    }

    // Transform data if transformer provided
    const dataToSubmit = options?.transform ? options.transform(formData) : formData as T;

    // Submit form
    const result = await submitFn(dataToSubmit);
    options?.onSuccess?.(result);
    
    return { success: true, data: result };
  } catch (error) {
    options?.onSubmissionError?.(error);
    return { success: false, error };
  }
};