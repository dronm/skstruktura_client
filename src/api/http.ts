import {
	Conn,
	APIError,
	type ConnRequestOptions,
} from "@katren/vue-collection-lib/api/Conn";

import { API_BASE_URL, API_TIMEOUT } from "@/config/constants";

class ProjectConn extends Conn {
	isAuthed: boolean = false;
	unlogUser: (() => void) | null = null;

	constructor(baseURL: string, timeout: number) {
		super(baseURL, timeout);
	}

	public put<T = unknown>(
		endpoint: string,
		data?: unknown,
		requestOptions: ConnRequestOptions = {},
	): Promise<T> {
		return this.request<T>(
			endpoint,
			{
				method: "PUT",
				body:
					data === undefined
						? undefined
						: JSON.stringify(data),
				headers: {
					...this.defaultHTTPHeaders,
					"Content-Type": "application/json",
					"X-Query-Id": `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
				},
			},
			requestOptions,
		);
	}

	protected override async request<T = unknown>(
		endpoint: string,
		options: RequestInit = {},
		requestOptions: ConnRequestOptions = {},
	): Promise<T> {
		try {
			return await super.request<T>(
				endpoint,
				{
					...options,
					credentials: "include",
				},
				requestOptions,
			);
		} catch (err: unknown) {
			if (
				this.response?.status === 401 &&
				this.isAuthed &&
				this.unlogUser !== null
			) {
				this.unlogUser();
				window.location.href = window.location.origin;
				throw new Error("Unauthorized");
			}

			if (err instanceof APIError) {
				throw err;
			}

			if (err instanceof Error) {
				throw new Error(err.message || "unknown error");
			}

			throw new Error(String(err));
		}
	}
}

const api = new ProjectConn(API_BASE_URL, API_TIMEOUT);

export default api;
