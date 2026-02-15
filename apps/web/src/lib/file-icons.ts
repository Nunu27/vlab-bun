import {
	FileArchiveIcon,
	FileAudioIcon,
	FileBadge2Icon,
	FileCode2Icon,
	FileIcon,
	FileImageIcon,
	FileJsonIcon,
	FileSpreadsheetIcon,
	FileTextIcon,
	FileVideoIcon,
} from "lucide-react";

export function getFileIcon(filename: string) {
	const ext = filename.split(".").pop()?.toLowerCase() || "";

	switch (ext) {
		// Documents
		case "pdf":
			return FileBadge2Icon;
		case "doc":
		case "docx":
		case "txt":
		case "md":
		case "rtf":
			return FileTextIcon;
		case "xls":
		case "xlsx":
		case "csv":
			return FileSpreadsheetIcon;

		// Images
		case "png":
		case "jpg":
		case "jpeg":
		case "gif":
		case "svg":
		case "webp":
			return FileImageIcon;

		// Audio/Video
		case "mp3":
		case "wav":
		case "ogg":
			return FileAudioIcon;
		case "mp4":
		case "mkv":
		case "avi":
		case "webm":
			return FileVideoIcon;

		// Code
		case "js":
		case "ts":
		case "jsx":
		case "tsx":
		case "py":
		case "java":
		case "c":
		case "cpp":
		case "cs":
		case "go":
		case "rs":
		case "php":
		case "rb":
		case "html":
		case "css":
			return FileCode2Icon;
		case "json":
			return FileJsonIcon;

		// Archives
		case "zip":
		case "rar":
		case "7z":
		case "tar":
		case "gz":
			return FileArchiveIcon;

		// Default
		default:
			return FileIcon;
	}
}
