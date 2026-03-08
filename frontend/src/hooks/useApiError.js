/**
 * API Error Hook
 * Provides centralized error handling for API calls
 */
import { useState, useCallback } from 'react';

export function useApiError() {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Execute an async function with error handling
   * @param {Function} asyncFn - Async function to execute
   * @param {Object} options - Options
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  const execute = useCallback(async (asyncFn, options = {}) => {
    const { showLoading = true, onSuccess, onError } = options;

    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const data = await asyncFn();
      if (onSuccess) onSuccess(data);
      return { success: true, data };
    } catch (err) {
      const message = parseErrorMessage(err);
      setError(message);
      if (onError) onError(message, err);
      return { success: false, error: message };
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isLoading,
    execute,
    clearError,
    setError,
  };
}

/**
 * Parse error message from various error types
 * @param {Error|Object|string} err
 * @returns {string}
 */
export function parseErrorMessage(err) {
  if (!err) return 'Unknown error occurred';

  // String error
  if (typeof err === 'string') return err;

  // Network error
  if (err.isNetworkError) {
    return 'Network error: Please check your internet connection';
  }

  // Auth error
  if (err.isAuthError) {
    return 'Session expired. Please login again.';
  }

  // API error with details
  if (err.details) {
    if (typeof err.details === 'string') return err.details;
    if (err.details.detail) return err.details.detail;
    if (err.details.message) return err.details.message;
    if (err.details.error) return err.details.error;
  }

  // Standard Error object
  if (err.message) return err.message;

  return 'An unexpected error occurred';
}

/**
 * Format validation errors from API
 * @param {Object} details - Validation error details
 * @returns {Object} - Field-to-error mapping
 */
export function formatValidationErrors(details) {
  if (!details?.fieldErrors) return {};

  const errors = {};
  for (const [field, messages] of Object.entries(details.fieldErrors)) {
    errors[field] = Array.isArray(messages) ? messages[0] : messages;
  }
  return errors;
}

export default useApiError;
