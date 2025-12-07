import type { UpdateDeviceRequest } from '@vlab/shared/schemas';
import { createFormHook, createFormHookContexts } from '@tanstack/react-form';

const contexts = createFormHookContexts();

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  contexts;

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {},
  formComponents: {},
});

export type DeviceFormData = typeof UpdateDeviceRequest.static;
