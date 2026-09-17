import { defineCrudReference } from "@katren/vue-collection-lib";

import { employeePostApi } from "@/api/employeePost.gen";
import type { EmployeePost } from "@/types/employeePost.gen";

export type EmployeePostReferenceKey = {
	id: number;
};

export const employeePostReference = defineCrudReference<
	EmployeePost,
	EmployeePostReferenceKey,
	number
>({
	list: employeePostApi.list,
	detail: employeePostApi.detail,
	keyField: "id",
	searchField: "name",
	descrFields: ["name"],
	minLength: 0,
	completeOnFocus: true,
	fallback: (id) => `#${id}`,
	isEmpty: (id) => id <= 0,
	emptyValue: 0,
	openRoute: (value) => ({
		name: "employeePostEdit",
		params: value.keys ?? {},
	}),
	selectRoute: {
		name: "employeePosts",
	},
});
