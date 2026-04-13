import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import CheckboxField from "@web/components/forms/checkbox-field";
import ColorField from "@web/components/forms/color-field";
import ComboboxField from "@web/components/forms/combobox-field";
import DateField from "@web/components/forms/date-field";
import DateRangeField from "@web/components/forms/date-range-field";
import IconField from "@web/components/forms/icon-field";
import ImageField from "@web/components/forms/image-field";
import NumberField from "@web/components/forms/number-field";
import PaginatedComboboxField from "@web/components/forms/paginated-combobox-field";
import SelectField from "@web/components/forms/select-field";
import SubmitButton from "@web/components/forms/submit-button";
import SwitchField from "@web/components/forms/switch-field";
import TextField from "@web/components/forms/text-field";
import TextareaField from "@web/components/forms/textarea-field";
import { lazy } from "react";

const MarkdownField = lazy(
	() => import("@web/components/forms/markdown-field"),
);

export const { fieldContext, useFieldContext, formContext, useFormContext } =
	createFormHookContexts();

export const fieldComponents = {
	TextField,
	NumberField,
	CheckboxField,
	SwitchField,
	ColorField,
	ComboboxField,
	SelectField,
	TextareaField,
	MarkdownField,
	IconField,
	DateField,
	DateRangeField,
	PaginatedComboboxField,
	ImageField,
};

export const { useAppForm, withForm, withFieldGroup, useTypedAppFormContext } =
	createFormHook({
		fieldContext,
		formContext,
		fieldComponents,
		formComponents: {
			SubmitButton,
		},
	});
