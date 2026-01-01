"use client";

import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

/**
 * Input mémorisé avec debounce pour éviter les re-renders du parent à chaque frappe.
 * L'état local est mis à jour immédiatement, mais le parent n'est notifié qu'après le délai.
 */
export const DebouncedInput = memo(function DebouncedInput({
  value: externalValue,
  onChange,
  debounceMs = 150,
  onBlur: externalOnBlur,
  ...props
}: DebouncedInputProps) {
  const [internalValue, setInternalValue] = useState(externalValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastExternalValueRef = useRef(externalValue);

  // Sync internal value when external value changes (e.g., form reset, import)
  useEffect(() => {
    // Only update if the external value changed from outside (not from our own onChange)
    if (externalValue !== lastExternalValueRef.current) {
      lastExternalValueRef.current = externalValue;
      // Use setTimeout to avoid setState in render cycle
      const id = setTimeout(() => {
        setInternalValue(externalValue);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [externalValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the parent update
    timeoutRef.current = setTimeout(() => {
      lastExternalValueRef.current = newValue;
      onChange(newValue);
      timeoutRef.current = null;
    }, debounceMs);
  }, [onChange, debounceMs]);

  // Sync on blur immediately (don't wait for debounce)
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (internalValue !== lastExternalValueRef.current) {
      lastExternalValueRef.current = internalValue;
      onChange(internalValue);
    }
    externalOnBlur?.(e);
  }, [internalValue, onChange, externalOnBlur]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Input
      {...props}
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
});

interface DebouncedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

/**
 * Textarea mémorisé avec debounce pour éviter les re-renders du parent à chaque frappe.
 */
export const DebouncedTextarea = memo(function DebouncedTextarea({
  value: externalValue,
  onChange,
  debounceMs = 150,
  onBlur: externalOnBlur,
  ...props
}: DebouncedTextareaProps) {
  const [internalValue, setInternalValue] = useState(externalValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastExternalValueRef = useRef(externalValue);

  // Sync internal value when external value changes
  useEffect(() => {
    if (externalValue !== lastExternalValueRef.current) {
      lastExternalValueRef.current = externalValue;
      const id = setTimeout(() => {
        setInternalValue(externalValue);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [externalValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      lastExternalValueRef.current = newValue;
      onChange(newValue);
      timeoutRef.current = null;
    }, debounceMs);
  }, [onChange, debounceMs]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (internalValue !== lastExternalValueRef.current) {
      lastExternalValueRef.current = internalValue;
      onChange(internalValue);
    }
    externalOnBlur?.(e);
  }, [internalValue, onChange, externalOnBlur]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Textarea
      {...props}
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
});
