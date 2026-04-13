import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import { getFileIcon } from "@web/lib/file-icons";

interface LabAttachmentsCardProps {
	attachments: { name: string; file: string }[];
}

export function LabAttachmentsCard({ attachments }: LabAttachmentsCardProps) {
	if (!attachments || attachments.length === 0) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Attached Files</CardTitle>
			</CardHeader>
			<CardContent>
				<ul className="space-y-2">
					{attachments.map(({ name, file }, i) => {
						const FileIconCmp = getFileIcon(file);
						const ext = file.substring(file.lastIndexOf(".")) ?? "";
						const fileName = name + ext;

						return (
							<li
								key={i.toString()}
								className="flex items-center gap-2 text-sm"
							>
								<FileIconCmp className="size-4 shrink-0 text-muted-foreground" />
								<a
									href={`/api/file/${file}`}
									target="_blank"
									rel="noreferrer"
									className="line-clamp-1 flex-1 text-primary hover:underline"
								>
									{fileName}
								</a>
							</li>
						);
					})}
				</ul>
			</CardContent>
		</Card>
	);
}
