import type {
	UserBase,
	UserBaseDTO,
	UserKeyBase,
	UserLoginRequestBase,
	UserNewBase,
	UserUpdBase,
	UserUpdateBase,
} from "@katren/vue-business-app/user";

import type { RoleId } from "@/types/enums/roleId";

export type UserDTO = UserBaseDTO<RoleId>;
export type User = UserBase<RoleId>;
export type UserKey = UserKeyBase;
export type UserNew = UserNewBase<RoleId>;
export type UserUpd = UserUpdBase<RoleId>;
export type UserUpdate = UserUpdateBase<RoleId>;
export type UserLoginRequest = UserLoginRequestBase;
