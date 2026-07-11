import { Compile } from "@sinclair/typemap";
import type { UpdateDeviceTemplateRequest } from "@vlab/shared/schemas";
import { TestDeviceTemplateRequest } from "@vlab/ws/device-template";
import { LogViewer } from "@web/components/log-viewer";
import { Button } from "@web/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@web/components/ui/dialog";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@web/components/ui/tabs";
import { withForm } from "@web/hooks/form/use-app-form";
import { useWSAction } from "@web/hooks/ws";
import GuacamoleConnection from "@web/shared/guacamole/components/guacamole-connection";
import { GuacamoleConnectionProvider } from "@web/shared/guacamole/stores/guacamole-connection-store";
import { Monitor, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { useTestDeviceStore } from "../../stores/test-device-store";

const validator = Compile(TestDeviceTemplateRequest);
type FieldKeys = keyof typeof TestDeviceTemplateRequest.static;

const TestConnectionButton = withForm({
	defaultValues: {} as typeof UpdateDeviceTemplateRequest.static,
	render: function Render({ form }) {
		const { send, dispose } = useWSAction("device-template:test");
		const store = useTestDeviceStore();

		const open = store.use.open();
		const token = store.use.token();
		const logs = store.use.logs();
		const activeTab = store.use.activeTab();
		const suggestedStats = store.use.suggestedStats();
		const { setOpen, setToken, log, setDispose, setTab, setSuggestedStats } =
			store.use.actions();

		const handleTestDevice = async () => {
			const value = form.state.values;

			if (!validator.Check(value)) {
				toast.error("Validation failed", {
					description: "Please check all required fields",
				});

				const errors = validator.Errors(value);

				for (const error of errors) {
					const key = error.path.substring(1).replace(/\//g, ".") as FieldKeys;

					form.setFieldMeta(key, (meta) => ({
						...meta,
						isTouched: true,
						errorMap: { onSubmit: [error] },
					}));
				}

				return;
			}

			setOpen(true);
			setDispose(dispose);

			send({
				data: validator.Parse(value),
				onError: (error) => log("error", error),
				onResponse: (token) => setToken(token),
				callbacks: {
					info: (msg) => log("info", msg),
					warn: (msg) => log("warn", msg),
					stats: (data) => setSuggestedStats(data),
				},
			});
		};

		const handleApplyStats = () => {
			if (!suggestedStats) return;
			form.setFieldValue("cpuCostCores", suggestedStats.cpuCores);
			form.setFieldValue("memoryCostMB", suggestedStats.memoryMB);
			setSuggestedStats(undefined);
			toast.success("Cost fields updated", {
				description: `CPU: ${suggestedStats.cpuCores} cores · Memory: ${suggestedStats.memoryMB} MB`,
			});
		};

		return (
			<>
				<Button
					data-tour="test-connection-button"
					onClick={handleTestDevice}
					type="button"
				>
					Test Connection
				</Button>

				<Dialog open={open} onOpenChange={setOpen}>
					<Tabs value={activeTab} onValueChange={setTab} asChild>
						<DialogContent showCloseButton={false} className="p-0 sm:max-w-200">
							<GuacamoleConnectionProvider>
								<DialogHeader className="flex-row items-center justify-between p-4 pb-2">
									<DialogTitle>Device Template Test</DialogTitle>

									<TabsList>
										<TabsTrigger
											value="logs"
											className="flex items-center gap-1.5"
										>
											<ScrollText className="size-3.5" />
											Logs
										</TabsTrigger>
										<TabsTrigger
											value="desktop"
											disabled={!token}
											className="flex items-center gap-1.5"
										>
											<Monitor className="size-3.5" />
											Desktop
										</TabsTrigger>
									</TabsList>
								</DialogHeader>

								<div className="relative aspect-video w-full overflow-hidden bg-slate-950">
									<TabsContent
										value="desktop"
										forceMount
										className="absolute inset-0 data-[state=inactive]:pointer-events-none data-[state=inactive]:opacity-0"
									>
										{token && (
											<GuacamoleConnection
												token={token}
												onError={(msg) => log("error", msg)}
												onConnect={() =>
													log("info", "Desktop connection established")
												}
											/>
										)}
									</TabsContent>
									<TabsContent value="logs" className="absolute inset-0">
										<LogViewer
											logs={logs}
											emptyMessage="Initializing connection sequence..."
										/>
									</TabsContent>
								</div>
								{suggestedStats && (
									<div className="flex items-center justify-between border-t bg-muted/50 px-4 py-2.5 text-sm">
										<span className="text-muted-foreground">
											Measured cost:{" "}
											<span className="font-medium text-foreground">
												{suggestedStats.cpuCores} cores ·{" "}
												{suggestedStats.memoryMB} MB
											</span>
										</span>
										<Button
											size="sm"
											variant="outline"
											type="button"
											onClick={handleApplyStats}
										>
											Apply to cost fields
										</Button>
									</div>
								)}

								<DialogFooter className="p-4 pt-2">
									<DialogClose asChild>
										<Button variant="secondary">
											{token ? "Close Session" : "Cancel"}
										</Button>
									</DialogClose>
								</DialogFooter>
							</GuacamoleConnectionProvider>
						</DialogContent>
					</Tabs>
				</Dialog>
			</>
		);
	},
});

export default TestConnectionButton;
