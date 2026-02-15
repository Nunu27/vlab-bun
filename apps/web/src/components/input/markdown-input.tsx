import {
	BlockTypeSelect,
	BoldItalicUnderlineToggles,
	CreateLink,
	headingsPlugin,
	InsertImage,
	InsertTable,
	InsertThematicBreak,
	imagePlugin,
	ListsToggle,
	linkDialogPlugin,
	linkPlugin,
	listsPlugin,
	MDXEditor,
	markdownShortcutPlugin,
	quotePlugin,
	Separator,
	tablePlugin,
	thematicBreakPlugin,
	toolbarPlugin,
	UndoRedo,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import api from "@web/lib/api";
import { cn } from "@web/lib/utils";
import { useTheme } from "../theme-provider";
import { Field, FieldError, FieldLabel } from "../ui/field";

type MarkdownInputProps = {
	name?: string;
	value?: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	label?: string;
	required?: boolean;
	isInvalid?: boolean;
	errors?: Array<{ message?: string }>;
};

function MarkdownInput({
	name,
	value,
	onChange,
	onBlur,
	label,
	required,
	isInvalid,
	errors,
}: MarkdownInputProps) {
	const { mutateAsync } = api.file.upload.post.useMutation({
		showSuccessMessage: false,
	});

	const imageUploadHandler = async (image: File) => {
		const result = await mutateAsync({ file: image });
		return `/api/file/${result.name}`;
	};

	const { theme } = useTheme();

	return (
		<Field>
			{label && (
				<FieldLabel htmlFor={name} required={required}>
					{label}
				</FieldLabel>
			)}
			<div
				className={cn(
					"max-w-none overflow-hidden rounded-md border bg-transparent dark:bg-input/30",
					isInvalid && "border-destructive focus-within:ring-destructive",
				)}
				onBlur={onBlur}
			>
				<MDXEditor
					className={theme === "dark" ? "dark-theme" : undefined}
					markdown={value || ""}
					onChange={onChange}
					contentEditableClassName="prose dark:prose-invert min-h-56"
					plugins={[
						toolbarPlugin({
							toolbarClassName: "dark-editor",
							toolbarContents: () => (
								<>
									<UndoRedo />
									<Separator />
									<BoldItalicUnderlineToggles />
									<Separator />
									<ListsToggle />
									<Separator />
									<BlockTypeSelect />
									<Separator />
									<CreateLink />
									<InsertImage />
									<Separator />
									<InsertTable />
									<InsertThematicBreak />
								</>
							),
						}),
						listsPlugin(),
						quotePlugin(),
						headingsPlugin({ allowedHeadingLevels: [1, 2, 3] }),
						linkPlugin(),
						linkDialogPlugin(),
						imagePlugin({ imageUploadHandler }),
						tablePlugin(),
						thematicBreakPlugin(),
						markdownShortcutPlugin(),
					]}
				/>
			</div>
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}

export default MarkdownInput;
