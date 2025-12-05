import { createFormHookContexts, createFormHook } from '@tanstack/react-form';
import type { CreateDeviceRequest } from '@backend/routes/device/schema';

const contexts = createFormHookContexts();

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  contexts;

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {},
  formComponents: {},
});

// Type helper for form data
export type DeviceFormData = typeof CreateDeviceRequest.static;
