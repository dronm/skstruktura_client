import * as v from "valibot";

import { defaultTranslate, type TranslateFn } from "@/schemas/common";
import { ROLE_ID_VALUES } from "@/types/enums/roleId";

export const createRoleIdSchemas = (t: TranslateFn) => {
	const RoleIdSchema = v.picklist(
		ROLE_ID_VALUES,
		t("validation.required"),
	);

	return {
		RoleIdSchema,
	};
};

const roleIdSchemas = createRoleIdSchemas(defaultTranslate);

export const RoleIdSchema = roleIdSchemas.RoleIdSchema;
