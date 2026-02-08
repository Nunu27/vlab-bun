import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { ThemeProvider } from "@web/components/theme-provider";
import { queryClient } from "@web/lib/query";
import { router } from "@web/lib/router";
import { enableArrayMethods, enableMapSet } from "immer";
import { Toaster } from "sonner";

enableArrayMethods();
enableMapSet();

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider
				defaultTheme="dark"
				storageKey="ui-theme"
				disableTransitionOnChange
			>
				<RouterProvider router={router} />

				<Toaster />
			</ThemeProvider>
		</QueryClientProvider>
	);
}

export { App };
