import * as v from "valibot";

import { createUserBaseSchemas } from "@katren/vue-business-app/user";

import { defaultTranslate, type TranslateFn } from "@/schemas/common";
import { createRoleIdSchemas } from "@/schemas/enums/roleId";
import type { User } from "@/types/user";

export const createUserSchemas = (t: TranslateFn) => {
	const { RoleIdSchema } = createRoleIdSchemas(t);
	const base = createUserBaseSchemas(RoleIdSchema, t);

	return {
		UserIdSchema: base.UserIdSchema,
		UserNameSchema: base.UserNameSchema,
		UserPasswordSchema: base.UserPasswordSchema,
		UserDTOSchema: base.UserBaseSchema,
		UserSchema: base.UserBaseSchema,
		UserKeySchema: base.UserKeyBaseSchema,
		UserNewSchema: base.UserNewBaseSchema,
		UserUpdSchema: base.UserUpdBaseSchema,
		UserUpdateSchema: base.UserUpdateBaseSchema,
		UserLoginRequestSchema: base.UserLoginRequestBaseSchema,
	};
};

const userSchemas = createUserSchemas(defaultTranslate);

export const UserIdSchema = userSchemas.UserIdSchema;
export const UserNameSchema = userSchemas.UserNameSchema;
export const UserPasswordSchema = userSchemas.UserPasswordSchema;
export const UserDTOSchema = userSchemas.UserDTOSchema;
export const UserSchema = userSchemas.UserSchema;
export const UserKeySchema = userSchemas.UserKeySchema;
export const UserNewSchema = userSchemas.UserNewSchema;
export const UserUpdSchema = userSchemas.UserUpdSchema;
export const UserUpdateSchema = userSchemas.UserUpdateSchema;
export const UserLoginRequestSchema = userSchemas.UserLoginRequestSchema;

export const userFromDTO = (dto: unknown): User => {
	return v.parse(UserDTOSchema, dto);
};
