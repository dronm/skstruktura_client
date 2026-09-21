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

export type UserListDTO = UserBaseDTO<RoleId>;
export type UserDTO = UserBaseDTO<RoleId> & {
	construction_site_ids: number[];
};
export type User = UserBase<RoleId> & {
	construction_site_ids: number[];
};
export type UserKey = UserKeyBase;
export type UserNew = UserNewBase<RoleId> & {
	construction_site_ids?: number[];
};
export type UserUpd = UserUpdBase<RoleId> & {
	construction_site_ids?: number[];
};
export type UserUpdate = Omit<UserUpdateBase<RoleId>, "model"> & {
	model: UserUpd;
};
export type UserLoginRequest = UserLoginRequestBase;
