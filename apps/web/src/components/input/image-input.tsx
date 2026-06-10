import api from "@web/lib/api";
import { cn } from "@web/lib/utils";
import { Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";

type ImageInputProps = {
	name?: string;
	value?: string;
	onChange: (value: string) => void;
	label?: string;
	required?: boolean;
	isInvalid?: boolean;
	errors?: Array<{ message?: string }>;
};

function ImageInput({
	name,
	value,
	onChange,
	label,
	required,
	isInvalid,
	errors,
}: ImageInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const { mutate, isPending } = api.file.upload.post.useMutation({
		showSuccessMessage: false,
		onSuccess: (res: { name: string }) => {
			onChange(res.name);
		},
	});

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Local preview for better UX while uploading or if upload is very fast
		const url = URL.createObjectURL(file);
		setPreviewUrl(url);

		mutate({ file });
	};

	const handleRemove = () => {
		onChange("");
		setPreviewUrl(null);
		if (inputRef.current) {
			inputRef.current.value = "";
		}
	};

	// Use uploaded value or local preview
	const displayUrl = value ? `/api/file/${value}` : previewUrl;

	return (
		<Field>
			{label && (
				<FieldLabel htmlFor={name} required={required}>
					{label}
				</FieldLabel>
			)}
			<div className="relative">
				<input
					type="file"
					accept="image/*"
					className="hidden"
					ref={inputRef}
					id={name}
					onChange={handleFileChange}
				/>

				{displayUrl ? (
					<div className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border bg-muted">
						<img
							src={displayUrl}
							alt={label || "Image preview"}
							className={cn(
								"h-full w-full object-cover transition-opacity",
								isPending && "opacity-50",
							)}
						/>
						{/* Overlay for clicking to replace */}
						<div
							className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
							onClick={() => inputRef.current?.click()}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									inputRef.current?.click();
								}
							}}
						>
							<UploadIcon className="size-8 text-white drop-shadow-md" />
						</div>

						{isPending && (
							<div className="absolute inset-0 flex items-center justify-center bg-black/10">
								<Loader2Icon className="size-8 animate-spin text-primary" />
							</div>
						)}
						<Button
							type="button"
							variant="destructive"
							size="icon"
							className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100"
							onClick={(e) => {
								e.stopPropagation();
								handleRemove();
							}}
							disabled={isPending}
						>
							<XIcon className="size-4" />
						</Button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => inputRef.current?.click()}
						disabled={isPending}
						className={cn(
							"flex aspect-video w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted-foreground/25 border-dashed bg-muted/50 transition-colors hover:bg-muted/80",
							isInvalid && "border-destructive/50 bg-destructive/5",
							isPending && "cursor-not-allowed opacity-50",
						)}
					>
						{isPending ? (
							<Loader2Icon className="mb-2 size-8 animate-spin text-muted-foreground" />
						) : (
							<UploadIcon className="mb-2 size-8 text-muted-foreground" />
						)}
						<span className="text-muted-foreground text-sm">
							{isPending ? "Uploading..." : "Click to upload image"}
						</span>
					</button>
				)}
			</div>
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}

export default ImageInput;
