import type { Auth } from "@/types/auth";
import type { UserLogin } from "@/types/userLogin";

export type UserMaxAuthStatus =
	| "pending"
	| "approved"
	| "declined"
	| "expired"
	| "consumed"
	| "authenticated";

export interface UserMaxAuthRequest {
	phone: string;
}

export interface UserMaxAuthRequestResponse {
	request_id: string;
	status: UserMaxAuthStatus;
	expires_at: string;
}

export interface UserMaxAuthCompleteRequest {
	request_id: string;
}

export interface UserMaxAuthCompleteResponse {
	status: UserMaxAuthStatus;
	user?: UserLogin;
	auth?: Auth;
}
