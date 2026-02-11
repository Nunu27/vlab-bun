import { useTheme } from "@web/components/theme-provider";
import { Button } from "@web/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ModeToggle() {
	const { setTheme, theme } = useTheme();

	const toggle = () => {
		setTheme(theme === "light" ? "dark" : "light");
	};

	return (
		<Button variant="ghost" size="icon" onClick={toggle}>
			<Sun
				data-skip-theme-disable
				className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0"
			/>
			<Moon
				data-skip-theme-disable
				className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100"
			/>
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
