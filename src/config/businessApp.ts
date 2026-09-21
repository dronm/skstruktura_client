import type { BusinessAppConfig } from "@katren/vue-business-app/core";

import api from "@/api/http";
import { i18n } from "@/i18n";
import { applicationRouteManifest } from "@/router/routeManifest";
import { RoleIdSchema } from "@/schemas/enums/roleId";
import { ROLE_ID_VALUES, type RoleId } from "@/types/enums/roleId";

const translate = (
	key: string,
	params: Record<string, unknown> = {},
): string => {
	return String(
		i18n.global.t(
			key,
			params as Record<string, string | number | boolean>,
		),
	);
};

export const businessAppConfig: BusinessAppConfig<RoleId> = {
	api,
	branding: {
		title: "СК Структура",
		subtitle: "Система управления",
		fallbackMark: "СК",
	},
	applicationRouteManifest,
	roles: {
		options: ROLE_ID_VALUES.map((value) => ({
			value,
			label: translate(`RoleId.${value}`),
		})),
		defaultRoleId: "admin",
		schema: RoleIdSchema,
	},
	userReferenceRoutes: {
		list: {
			name: "users",
		},
		edit: (id: number) => ({
			name: "userEdit",
			params: {
				id,
			},
		}),
	},
	translate,
};
