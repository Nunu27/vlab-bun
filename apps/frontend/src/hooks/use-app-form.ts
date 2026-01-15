import { createFormHook, createFormHookContexts } from '@tanstack/react-form';

import ColorField from '@frontend/components/forms/color-field';
import ComboBoxField from '@frontend/components/forms/combobox-field';
import IconField from '@frontend/components/forms/icon-field';
import PaginatedComboBoxField from '@frontend/components/forms/paginated-combobox-field';
import SelectField from '@frontend/components/forms/select-field';
import SubmitButton from '@frontend/components/forms/submit-button';
import TextField from '@frontend/components/forms/text-field';

export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    ColorField,
    IconField,
    SelectField,
    ComboBoxField,
    PaginatedComboBoxField,
  },
  formComponents: {
    SubmitButton,
  },
});
