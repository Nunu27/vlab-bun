import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { degreeLevelValues } from "@vlab/shared/enums";
import { CreateStudentRequest } from "@vlab/shared/schemas/student";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@web/components/ui/dialog";
import { FieldGroup } from "@web/components/ui/field";
import { useApiForm } from "@web/hooks/form/use-api-form";
import api from "@web/lib/api";
import { useStudentModalStore } from "../../stores/student-modal-store";

const validator = Compile(CreateStudentRequest);

export function CreateStudentModal() {
	const store = useStudentModalStore();
	const isOpen = store.use.create();
	const actions = store.use.actions();

	const queryClient = useQueryClient();

	const form = useApiForm(api.user.student.post, {
		defaultValues: {
			name: "",
			email: "",
			password: "",
			nrp: "",
			year: new Date().getFullYear(),
			degreeLevel: "D4" as const,
			studyProgramId: "",
		},
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: ["user", "student", "pagination"],
				});
				actions.create.close();
				form.reset();
			},
		},
	});

	return (
		<Dialog open={isOpen} onOpenChange={actions.create.close}>
			<DialogContent className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add Student</DialogTitle>
					<DialogDescription>
						Register a new student account to the system.
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.AppField name="nrp">
							{(field) => (
								<field.TextField
									label="NRP"
									placeholder="e.g., 5025211054"
									required
								/>
							)}
						</form.AppField>
						<form.AppField name="name">
							{(field) => (
								<field.TextField
									label="Full Name"
									placeholder="e.g., John Doe"
									required
								/>
							)}
						</form.AppField>
						<form.AppField name="email">
							{(field) => (
								<field.TextField
									label="Email Address"
									type="email"
									placeholder="e.g., john@example.com"
									required
								/>
							)}
						</form.AppField>
						<form.AppField name="password">
							{(field) => (
								<field.TextField
									label="Password"
									type="password"
									placeholder="Enter secure password"
									required
								/>
							)}
						</form.AppField>
						<div className="grid grid-cols-2 gap-4">
							<form.AppField name="degreeLevel">
								{(field) => (
									<field.SelectField
										label="Degree Level"
										options={degreeLevelValues.map((v) => ({
											label: v,
											value: v,
										}))}
										required
									/>
								)}
							</form.AppField>
							<form.AppField name="year">
								{(field) => (
									<field.TextField
										label="Enrollment Year"
										type="number"
										required
									/>
								)}
							</form.AppField>
						</div>
						<form.AppField name="studyProgramId">
							{(field) => (
								<field.PaginatedComboboxField
									label="Study Program"
									placeholder="Select study program..."
									endpoint={api["study-program"].pagination}
									getLabel={(d) => d.name}
									getValue={(d) => d.id}
									required
								/>
							)}
						</form.AppField>
						<form.AppForm>
							<form.SubmitButton label="Register Student" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
