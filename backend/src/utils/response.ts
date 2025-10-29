export const success = <T>({
	data,
	message
}: {
	data?: T;
	message?: string;
}) => ({
	success: true as const,
	data,
	message
});

export const failure = <T>({
	errors,
	message
}: {
	errors?: T[];
	message: string;
}) => ({
	success: false as const,
	errors,
	message
});
