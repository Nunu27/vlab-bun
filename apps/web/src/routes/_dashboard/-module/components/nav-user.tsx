import { Button } from "@web/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@web/components/ui/dropdown-menu";
import { useAuthStore } from "@web/stores/auth-store";
import { ChevronDown, UserCircle } from "lucide-react";
import { useState } from "react";
import { ChangePasswordModal } from "./modals/change-password-modal";
import { LogoutConfirmDialog } from "./modals/logout-confirm-dialog";

export function NavUser() {
	const [showChangePassword, setShowChangePassword] = useState(false);
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

	const user = useAuthStore.use.user();
	if (!user) return null;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="flex h-10 w-10 items-center justify-center gap-2 px-0 hover:bg-accent hover:text-accent-foreground sm:w-auto sm:px-3"
					>
						<UserCircle className="size-5 text-muted-foreground" />
						<span className="hidden max-w-[150px] truncate text-sm font-medium leading-tight sm:block">
							{user.name}
						</span>
						<ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className="w-56 rounded-lg"
					align="end"
					sideOffset={4}
				>
					<DropdownMenuLabel className="p-0 font-normal">
						<div className="grid flex-1 px-2 py-1.5 text-left text-sm leading-tight">
							<span className="truncate font-medium">{user.name}</span>
							<span className="truncate text-xs text-muted-foreground">
								{user.email}
							</span>
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={() => setShowChangePassword(true)}>
							Change Password
						</DropdownMenuItem>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => setShowLogoutConfirm(true)}>
						Log out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<LogoutConfirmDialog
				open={showLogoutConfirm}
				onOpenChange={setShowLogoutConfirm}
			/>

			<ChangePasswordModal
				open={showChangePassword}
				onOpenChange={setShowChangePassword}
			/>
		</>
	);
}
