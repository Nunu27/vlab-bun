import { createFileRoute, Link } from "@tanstack/react-router";
import { ListFilterSelect } from "@web/components/infinite-list";
import { InfiniteListPage } from "@web/components/layouts/infinite-list-page";
import { Button } from "@web/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyMedia,
	EmptyTitle,
} from "@web/components/ui/empty";
import { useApiInfiniteList } from "@web/hooks/pagination/use-api-infinite-list";
import api from "@web/lib/api";
import { BookOpenIcon } from "lucide-react";
import { useState } from "react";
import { LabCard } from "./-module/components/lab-card";

export const Route = createFileRoute("/_dashboard/_student/lab/enrolled")({
	staticData: {
		breadcrumbs: [{ title: "Lab" }, { title: "Enrolled Labs" }],
	},
	component: RouteComponent,
});

function RouteComponent() {
	const [search, setSearch] = useState("");
	const [orderBy, setOrderBy] = useState("");

	const [sortBy, sortOrder] = orderBy.split("-");

	const list = useApiInfiniteList(api.lab.pagination, {
		params: {
			perPage: 20,
			enrolled: true,
			search: search || undefined,
			sortBy: (sortBy as "createdAt" | "name" | undefined) || undefined,
			sortOrder: sortOrder as "asc" | "desc" | undefined,
		},
	});

	return (
		<InfiniteListPage
			title="Enrolled Labs"
			subtitle="View and resume your active lab sessions."
			search={search}
			onSearchChange={setSearch}
			searchPlaceholder="Search enrolled labs..."
			list={list}
			renderItem={(lab) => <LabCard key={lab.id} lab={lab} />}
			renderEmpty={() => (
				<Empty className="border-0 py-16">
					<EmptyContent>
						<EmptyMedia variant="icon">
							<BookOpenIcon className="h-6 w-6 text-muted-foreground" />
						</EmptyMedia>
						<EmptyTitle>You haven't enrolled in any labs yet</EmptyTitle>
						<Button className="mt-4" asChild>
							<Link to="/lab/browse">Browse Labs</Link>
						</Button>
					</EmptyContent>
				</Empty>
			)}
			filters={
				<ListFilterSelect
					value={orderBy}
					onChange={setOrderBy}
					placeholder="Order by..."
					options={[
						{ label: "Newest", value: "createdAt-desc" },
						{ label: "Oldest", value: "createdAt-asc" },
						{ label: "Name (A-Z)", value: "name-asc" },
						{ label: "Name (Z-A)", value: "name-desc" },
					]}
				/>
			}
		/>
	);
}
