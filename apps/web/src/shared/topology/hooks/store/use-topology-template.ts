import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";

export default (id?: string) => {
	const store = useTopologyStore();

	return store(
		useShallow((state) => {
			if (!id) return null;

			const template = state.templates.get(id);
			const { categoryId, ...rest } = template || { categoryId: "" };
			const category = state.templateCategories.get(categoryId);

			return {
				...rest,
				color: category?.color,
			};
		}),
	);
};
