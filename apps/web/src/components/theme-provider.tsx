import { createContext, useContext, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
	children: React.ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
	disableTransitionOnChange?: boolean;
};

type ThemeProviderState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
	theme: "system",
	setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = "vite-ui-theme",
	disableTransitionOnChange = false,
	...props
}: ThemeProviderProps) {
	const [theme, setTheme] = useLocalStorage(storageKey, defaultTheme);

	useEffect(() => {
		const root = window.document.documentElement;

		let cleanup: (() => void) | null = null;
		if (disableTransitionOnChange) {
			const css = document.createElement("style");
			css.appendChild(
				document.createTextNode(
					`*:not([data-skip-theme-disable]) {
						-webkit-transition: none !important;
						-moz-transition: none !important;
						-o-transition: none !important;
						-ms-transition: none !important;
						transition: none !important;
					}`,
				),
			);
			document.head.appendChild(css);
			cleanup = () => {
				(() => window.getComputedStyle(document.body))();
				setTimeout(() => document.head.removeChild(css), 1);
			};
		}

		root.classList.remove("light", "dark");

		if (theme === "system") {
			const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
				.matches
				? "dark"
				: "light";

			root.classList.add(systemTheme);
		} else {
			root.classList.add(theme);
		}

		cleanup?.();
	}, [theme, disableTransitionOnChange]);

	const value = {
		theme,
		setTheme,
	};

	return (
		<ThemeProviderContext.Provider {...props} value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
}

export const useTheme = () => {
	const context = useContext(ThemeProviderContext);

	if (context === undefined)
		throw new Error("useTheme must be used within a ThemeProvider");

	return context;
};
