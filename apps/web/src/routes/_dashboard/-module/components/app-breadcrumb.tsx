import { Link } from "@tanstack/react-router";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@web/components/ui/breadcrumb";
import { getTitleFromBreadcrumbs } from "@web/helper/string";
import { Fragment, useEffect } from "react";
import { useBreadcrumbs } from "../hooks/use-breadcrumbs";

function AppBreadcrumb() {
	const breadcrumbs = useBreadcrumbs();

	useEffect(() => {
		if (breadcrumbs.length > 0) {
			document.title = getTitleFromBreadcrumbs(breadcrumbs);
		} else {
			document.title = "vLab";
		}
	}, [breadcrumbs]);

	return (
		<Breadcrumb>
			<BreadcrumbList>
				{breadcrumbs.map((breadcrumb, index) => (
					<Fragment key={breadcrumb.title}>
						{index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
						<BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
							{breadcrumb.url ? (
								<BreadcrumbLink asChild>
									<Link to={breadcrumb.url}>{breadcrumb.title}</Link>
								</BreadcrumbLink>
							) : (
								<BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
							)}
						</BreadcrumbItem>
					</Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}

export default AppBreadcrumb;
