import { MarkdownViewer } from "@web/components/markdown-viewer";
import { Badge } from "@web/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import { getFileIcon } from "@web/lib/file-icons";
import { formatDateRange } from "@web/lib/utils";
import { CalendarIcon, FileTextIcon, UsersIcon } from "lucide-react";
import type { LabDetail } from "../../../-module/types";

export function OverviewTab({ lab }: { lab: LabDetail }) {
	return (
		<div className="grid gap-6 xl:grid-cols-3">
			<div className="space-y-4 xl:col-span-2">
				<Card>
					<CardContent>
						<MarkdownViewer value={lab.content || "No description provided."} />
					</CardContent>
				</Card>
			</div>

			<div className="space-y-4 xl:col-span-1">
				<Card>
					<CardHeader>
						<CardTitle>Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-2 text-muted-foreground text-sm">
								<CalendarIcon className="h-4 w-4" />
								<span>Schedule</span>
							</div>
							<div className="font-medium text-sm">
								{formatDateRange(lab.date.from, lab.date.to)}
							</div>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-2 text-muted-foreground text-sm">
								<FileTextIcon className="h-4 w-4" />
								<span>Max Attempts</span>
							</div>
							<div className="font-medium text-sm">
								{lab.maxAttempt ? lab.maxAttempt : "Unlimited"}
							</div>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-2 text-muted-foreground text-sm">
								<UsersIcon className="h-4 w-4" />
								<span>Status</span>
							</div>
							<div>
								{lab.isPublished ? (
									<Badge variant="default">Published</Badge>
								) : (
									<Badge variant="secondary">Draft</Badge>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				{lab.attachments.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Attached Files</CardTitle>
						</CardHeader>
						<CardContent>
							<ul className="space-y-2">
								{lab.attachments.map(({ name, file }, i) => {
									const FileIconCmp = getFileIcon(file);
									const ext = file.substring(file.lastIndexOf(".")) ?? "";
									const fileName = name + ext;

									return (
										<li
											key={i.toString()}
											className="flex items-center gap-2 text-sm"
										>
											<FileIconCmp className="size-4 text-muted-foreground" />
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
				)}
			</div>
		</div>
	);
}
