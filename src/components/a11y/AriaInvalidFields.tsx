import { forwardRef } from 'react';
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

type InvalidFlag = { invalid?: boolean };

/**
 * Wrappers that set aria-invalid only as static string attributes
 * (literal true/false tokens in JSX branches).
 */
export const AriaInvalidInput = forwardRef<
  HTMLInputElement,
  InvalidFlag & InputHTMLAttributes<HTMLInputElement>
>(function AriaInvalidInput({ invalid = false, ...props }, ref) {
  if (invalid) {
    return <input ref={ref} {...props} aria-invalid="true" />;
  }
  return <input ref={ref} {...props} aria-invalid="false" />;
});

export const AriaInvalidSelect = forwardRef<
  HTMLSelectElement,
  InvalidFlag & SelectHTMLAttributes<HTMLSelectElement>
>(function AriaInvalidSelect({ invalid = false, ...props }, ref) {
  if (invalid) {
    return <select ref={ref} {...props} aria-invalid="true" />;
  }
  return <select ref={ref} {...props} aria-invalid="false" />;
});

export const AriaInvalidTextarea = forwardRef<
  HTMLTextAreaElement,
  InvalidFlag & TextareaHTMLAttributes<HTMLTextAreaElement>
>(function AriaInvalidTextarea({ invalid = false, ...props }, ref) {
  if (invalid) {
    return <textarea ref={ref} {...props} aria-invalid="true" />;
  }
  return <textarea ref={ref} {...props} aria-invalid="false" />;
});
