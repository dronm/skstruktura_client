import api from "@/api/http";
import { createCrudApi } from "@/api/createCrudApi";
import { userFromDTO, userListFromDTO } from "@/schemas/user";
import type {
	User,
	UserDTO,
	UserKey,
	UserListDTO,
	UserLoginRequest,
	UserNew,
	UserUpd,
} from "@/types/user";
import type { UserLoginResponse } from "@/types/userLogin";
import type {
	UserMaxAuthCompleteRequest,
	UserMaxAuthCompleteResponse,
	UserMaxAuthRequest,
	UserMaxAuthRequestResponse,
} from "@/types/userMaxAuth";

const basePath = "/users";

const routes = {
	login: `${basePath}/login`,
	maxLoginRequest: `${basePath}/login/max/request`,
	maxLoginComplete: `${basePath}/login/max/complete`,
	logout: `${basePath}/logout`,
};

const userCrudApi = createCrudApi<
	User,
	UserListDTO,
	User,
	UserDTO,
	UserKey,
	UserNew,
	UserUpd
>({
	basePath,
	serviceName: "User",
	getKeyValue: (key) => key.id,
	fromListDTO: userListFromDTO,
	fromDetailDTO: userFromDTO,
});

export const userApi = {
	...userCrudApi,

	login: async (req: UserLoginRequest): Promise<UserLoginResponse> => {
		return await api.post<UserLoginResponse>(routes.login, req);
	},

	requestMaxLogin: async (
		req: UserMaxAuthRequest,
	): Promise<UserMaxAuthRequestResponse> => {
		return await api.post<UserMaxAuthRequestResponse>(
			routes.maxLoginRequest,
			req,
		);
	},

	completeMaxLogin: async (
		req: UserMaxAuthCompleteRequest,
	): Promise<UserMaxAuthCompleteResponse> => {
		return await api.post<UserMaxAuthCompleteResponse>(
			routes.maxLoginComplete,
			req,
		);
	},

	logout: async (): Promise<void> => {
		return await api.post<void>(routes.logout);
	},
};
