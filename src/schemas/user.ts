import * as v from "valibot";

import { createUserBaseSchemas } from "@katren/vue-business-app/user";

import { defaultTranslate, type TranslateFn } from "@/schemas/common";
import { createRoleIdSchemas } from "@/schemas/enums/roleId";
import type { User } from "@/types/user";

export const createUserSchemas = (t: TranslateFn) => {
	const { RoleIdSchema } = createRoleIdSchemas(t);
	const base = createUserBaseSchemas(RoleIdSchema, t);
	const ConstructionSiteIDsSchema = v.array(base.UserIdSchema);
	const UserDTOSchema = v.object({
		...base.UserBaseEntries,
		construction_site_ids: ConstructionSiteIDsSchema,
	});
	const UserNewSchema = v.object({
		...base.UserNewBaseEntries,
		construction_site_ids: v.optional(ConstructionSiteIDsSchema),
	});
	const UserUpdSchema = v.partial(UserNewSchema);
	const UserUpdateSchema = v.object({
		key: base.UserKeyBaseSchema,
		model: UserUpdSchema,
	});

	return {
		UserIdSchema: base.UserIdSchema,
		UserNameSchema: base.UserNameSchema,
		UserPasswordSchema: base.UserPasswordSchema,
		UserListDTOSchema: base.UserBaseSchema,
		UserDTOSchema,
		UserSchema: UserDTOSchema,
		UserKeySchema: base.UserKeyBaseSchema,
		UserNewSchema,
		UserUpdSchema,
		UserUpdateSchema,
		UserLoginRequestSchema: base.UserLoginRequestBaseSchema,
	};
};

const userSchemas = createUserSchemas(defaultTranslate);

export const UserIdSchema = userSchemas.UserIdSchema;
export const UserNameSchema = userSchemas.UserNameSchema;
export const UserPasswordSchema = userSchemas.UserPasswordSchema;
export const UserListDTOSchema = userSchemas.UserListDTOSchema;
export const UserDTOSchema = userSchemas.UserDTOSchema;
export const UserSchema = userSchemas.UserSchema;
export const UserKeySchema = userSchemas.UserKeySchema;
export const UserNewSchema = userSchemas.UserNewSchema;
export const UserUpdSchema = userSchemas.UserUpdSchema;
export const UserUpdateSchema = userSchemas.UserUpdateSchema;
export const UserLoginRequestSchema = userSchemas.UserLoginRequestSchema;

export const userListFromDTO = (dto: unknown): User => {
	const parsedDTO = v.parse(UserListDTOSchema, dto);

	return {
		...parsedDTO,
		construction_site_ids: [],
	};
};

export const userFromDTO = (dto: unknown): User => {
	return v.parse(UserDTOSchema, dto);
};
