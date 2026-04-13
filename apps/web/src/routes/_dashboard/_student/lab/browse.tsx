import { createFileRoute } from "@tanstack/react-router";
import { ListFilterSelect } from "@web/components/infinite-list";
import { InfiniteListPage } from "@web/components/layouts/infinite-list-page";
import { useApiInfiniteList } from "@web/hooks/pagination/use-api-infinite-list";
import api from "@web/lib/api";
import { useState } from "react";
import { LabCard } from "./-module/components/lab-card";

export const Route = createFileRoute("/_dashboard/_student/lab/browse")({
	staticData: {
		breadcrumbs: [{ title: "Lab" }, { title: "Browse Labs" }],
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
			search: search || undefined,
			sortBy: (sortBy as "createdAt" | "name" | undefined) || undefined,
			sortOrder: sortOrder as "asc" | "desc" | undefined,
		},
	});

	return (
		<InfiniteListPage
			title="Browse Labs"
			subtitle="Explore and enroll in available hands-on labs."
			search={search}
			onSearchChange={setSearch}
			searchPlaceholder="Search labs..."
			list={list}
			renderItem={(lab) => <LabCard key={lab.id} lab={lab} />}
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
