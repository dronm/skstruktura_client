import type { RouteLocationRaw } from "vue-router";

import type { RoleId } from "@/types/enums/roleId";

export const getDefaultRouteForRole = (
	roleId: RoleId | null | undefined,
): RouteLocationRaw => {
	switch (roleId) {
		case "admin":
			return { name: "users" };
		case "construction_site_manager":
			return { name: "constructionManagerWorkspace" };
		case "supply_manager":
			return { name: "supplyManagerWorkspace" };
		default:
			return { name: "userProfile" };
	}
};
