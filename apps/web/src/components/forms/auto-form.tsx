import type { TObject, TSchema } from "@sinclair/typebox";
import {
	fieldComponents,
	useFieldContext,
	withFieldGroup,
} from "@web/hooks/form/use-app-form";
import type { ComponentType } from "react";
import { FieldGroup } from "../ui/field";

interface AutoFormProps {
	schema: TObject;
	className?: string;
}

const fieldMapping: Partial<
	Record<string, ComponentType<{ parent: TObject; schema: TSchema }>>
> = {
	string: ({ parent, schema }) => {
		const field = useFieldContext<string>();
		const name = field.name.split(".").pop() ?? field.name;

		return (
			<fieldComponents.TextField
				label={schema.title ?? name}
				required={parent.required?.includes(name)}
			/>
		);
	},
};

export const AutoForm = withFieldGroup({
	defaultValues: {} as Record<string, unknown>,
	props: {} as unknown as AutoFormProps,
	render: function Render({ className, schema, group }) {
		return (
			<FieldGroup className={className}>
				{Object.entries(schema.properties).map(([key, value]) => {
					const Field = fieldMapping[value.type];
					if (!Field) return null;

					return (
						<group.AppField key={value.$id} name={key}>
							{() => <Field parent={schema} schema={value} />}
						</group.AppField>
					);
				})}
			</FieldGroup>
		);
	},
});
