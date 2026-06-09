import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";

export default (id?: string) => {
	const store = useTopologyStore();

	return store(
		useShallow((state) => {
			if (!id) return null;

			const template = state.templates.get(id);
			if (!template) return null;

			const category = state.templateCategories.get(template.categoryId);

			return {
				...template,
				color: category?.color,
			};
		}),
	);
};
