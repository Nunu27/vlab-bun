import { createFormHook, createFormHookContexts } from "@tanstack/react-form";

import CheckboxField from "@web/components/forms/checkbox-field";
import ColorField from "@web/components/forms/color-field";
import ComboboxField from "@web/components/forms/combobox-field";
import DateField from "@web/components/forms/date-field";
import DateRangeField from "@web/components/forms/date-range-field";
import IconField from "@web/components/forms/icon-field";
import PaginatedComboboxField from "@web/components/forms/paginated-combobox-field";
import SelectField from "@web/components/forms/select-field";
import SubmitButton from "@web/components/forms/submit-button";
import TextField from "@web/components/forms/text-field";
import TextareaField from "@web/components/forms/textarea-field";

export const { fieldContext, useFieldContext, formContext, useFormContext } =
	createFormHookContexts();

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		TextField,
		CheckboxField,
		ColorField,
		ComboboxField,
		SelectField,
		TextareaField,
		IconField,
		DateField,
		DateRangeField,
		PaginatedComboboxField,
	},
	formComponents: {
		SubmitButton,
	},
});
