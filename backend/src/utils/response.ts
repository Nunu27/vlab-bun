export const success = <T>({
	data,
	message
}: {
	data?: T;
	message?: string;
}) => ({
	success: true as const,
	data: data as T extends undefined ? T | undefined : T,
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
