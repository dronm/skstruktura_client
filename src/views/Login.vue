<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { userApi } from "@/api/user";
import { getDefaultRouteForRole } from "@/router/defaultRoute";
import { useAuthStore } from "@/stores/useAuthStore";
import type { UserLoginRequest } from "@/types/user";
import type { UserMaxAuthStatus } from "@/types/userMaxAuth";
import { errorText } from "@katren/vue-collection-lib/utils/errorText";

const MAX_POLL_INTERVAL_MS = 1500;

type LoginTab = "max" | "password";

const { t } = useI18n();

const authStore = useAuthStore();
const router = useRouter();

const activeTab = ref<LoginTab>("max");

const userLogin = ref("");
const userPwd = ref("");
const passwordErrorMessage = ref("");
const passwordSubmitting = ref(false);

const maxPhone = ref("");
const maxErrorMessage = ref("");
const maxStatus = ref<UserMaxAuthStatus | null>(null);
const maxRequestID = ref<string | null>(null);
const maxExpiresAt = ref<Date | null>(null);
const maxSubmitting = ref(false);
let maxPollTimer: ReturnType<typeof setTimeout> | null = null;

const loginInput = ref<HTMLInputElement | null>(null);
const maxPhoneInput = ref<HTMLInputElement | null>(null);

const normalizePhoneDigits = (value: string): string => {
	let digits = value.replace(/\D/g, "");
	if (digits.startsWith("8")) {
		digits = `7${digits.slice(1)}`;
	} else if (digits.length > 0 && !digits.startsWith("7")) {
		digits = `7${digits}`;
	}
	return digits.slice(0, 11);
};

const formatRussianPhone = (value: string): string => {
	const digits = normalizePhoneDigits(value);
	if (digits.length === 0) {
		return "";
	}

	const national = digits.startsWith("7") ? digits.slice(1) : digits;
	let result = "+7";

	if (national.length > 0) {
		result += `(${national.slice(0, 3)}`;
	}
	if (national.length >= 3) {
		result += ")";
	}
	if (national.length > 3) {
		result += `-${national.slice(3, 6)}`;
	}
	if (national.length > 6) {
		result += `-${national.slice(6, 8)}`;
	}
	if (national.length > 8) {
		result += `-${national.slice(8, 10)}`;
	}

	return result;
};

const normalizedMaxPhone = computed((): string => {
	const digits = normalizePhoneDigits(maxPhone.value);
	return digits.length === 11 && digits.startsWith("7") ? digits : "";
});

const maxRequestActive = computed((): boolean => {
	return (
		maxRequestID.value !== null &&
		(maxStatus.value === "pending" ||
			maxStatus.value === "approved")
	);
});

const maxStatusMessage = computed((): string => {
	switch (maxStatus.value) {
		case "pending":
		case "approved":
			return t("Login.max.pending");
		case "declined":
			return t("Login.max.declined");
		case "expired":
			return t("Login.max.expired");
		case "consumed":
			return t("Login.max.consumed");
		default:
			return "";
	}
});

const maxStatusClass = computed((): string => {
	if (maxStatus.value === "pending" || maxStatus.value === "approved") {
		return "border-blue-200 bg-blue-50 text-blue-700";
	}
	return "border-amber-200 bg-amber-50 text-amber-800";
});

const redirectAfterLogin = async (): Promise<void> => {
	await router.push(getDefaultRouteForRole(authStore.user?.role_id));
};

const clearMaxPoll = (): void => {
	if (maxPollTimer !== null) {
		clearTimeout(maxPollTimer);
		maxPollTimer = null;
	}
};

const scheduleMaxPoll = (delay = MAX_POLL_INTERVAL_MS): void => {
	clearMaxPoll();
	if (!maxRequestActive.value || activeTab.value !== "max") {
		return;
	}
	maxPollTimer = setTimeout(() => {
		void completeMaxLogin();
	}, delay);
};

const completeMaxLogin = async (): Promise<void> => {
	const requestID = maxRequestID.value;
	if (requestID === null) {
		return;
	}

	if (
		maxExpiresAt.value !== null &&
		maxExpiresAt.value.getTime() <= Date.now()
	) {
		maxStatus.value = "expired";
		clearMaxPoll();
		return;
	}

	try {
		const response = await userApi.completeMaxLogin({
			request_id: requestID,
		});
		maxStatus.value = response.status;
		maxErrorMessage.value = "";

		if (response.status === "authenticated") {
			clearMaxPoll();
			authStore.applyMaxLogin(response);
			await redirectAfterLogin();
			return;
		}

		if (
			response.status === "pending" ||
			response.status === "approved"
		) {
			scheduleMaxPoll();
			return;
		}

		clearMaxPoll();
	} catch (error: unknown) {
		maxErrorMessage.value = errorText(error);
		if (maxRequestActive.value) {
			scheduleMaxPoll(2500);
		}
	}
};

const handleMaxPhoneInput = (event: Event): void => {
	const input = event.target as HTMLInputElement;
	maxPhone.value = formatRussianPhone(input.value);
};

const handleMaxLogin = async (): Promise<void> => {
	maxErrorMessage.value = "";

	if (!normalizedMaxPhone.value) {
		maxErrorMessage.value = t("Login.max.invalidPhone");
		return;
	}

	maxSubmitting.value = true;
	clearMaxPoll();
	try {
		const response = await userApi.requestMaxLogin({
			phone: normalizedMaxPhone.value,
		});
		maxRequestID.value = response.request_id;
		maxStatus.value = response.status;
		maxExpiresAt.value = new Date(response.expires_at);
		scheduleMaxPoll(700);
	} catch (error: unknown) {
		maxErrorMessage.value = errorText(error);
	} finally {
		maxSubmitting.value = false;
	}
};

const handlePasswordLogin = async (): Promise<void> => {
	passwordErrorMessage.value = "";
	passwordSubmitting.value = true;
	clearMaxPoll();
	try {
		const cred: UserLoginRequest = {
			name: userLogin.value,
			pwd: userPwd.value,
		};
		await authStore.login(cred);
		await redirectAfterLogin();
	} catch (error: unknown) {
		passwordErrorMessage.value = errorText(error);
	} finally {
		passwordSubmitting.value = false;
	}
};

const selectTab = async (tab: LoginTab): Promise<void> => {
	activeTab.value = tab;
	if (tab === "password") {
		clearMaxPoll();
	} else if (maxRequestActive.value) {
		scheduleMaxPoll(0);
	}

	await nextTick();
	if (tab === "max") {
		maxPhoneInput.value?.focus();
	} else {
		loginInput.value?.focus();
	}
};

onMounted(() => {
	maxPhoneInput.value?.focus();
});

onBeforeUnmount(() => {
	clearMaxPoll();
});
</script>

<template>
	<div
		class="min-h-screen bg-slate-100 px-4 py-10 flex items-center justify-center"
	>
		<div class="w-full max-w-md">
			<div class="mb-8 text-center">
				<h1
					class="text-3xl font-bold tracking-tight text-slate-900"
				>
					{{ t("Login.title") }}
				</h1>
			</div>

			<div
				class="overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/80 ring-1 ring-slate-200"
			>
				<div
					class="grid grid-cols-2 border-b border-slate-200 bg-slate-50 p-1.5"
					role="tablist"
					:aria-label="t('Login.tabs.label')"
				>
					<button
						type="button"
						role="tab"
						:aria-selected="
							activeTab === 'max'
						"
						class="rounded-xl px-3 py-2.5 text-sm font-semibold transition"
						:class="
							activeTab === 'max'
								? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
								: 'text-slate-500 hover:text-slate-800'
						"
						@click="selectTab('max')"
					>
						{{ t("Login.tabs.max") }}
					</button>

					<button
						type="button"
						role="tab"
						:aria-selected="
							activeTab === 'password'
						"
						class="rounded-xl px-3 py-2.5 text-sm font-semibold transition"
						:class="
							activeTab === 'password'
								? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
								: 'text-slate-500 hover:text-slate-800'
						"
						@click="selectTab('password')"
					>
						{{ t("Login.tabs.password") }}
					</button>
				</div>

				<div class="p-8">
					<form
						v-if="activeTab === 'max'"
						class="space-y-5"
						@submit.prevent="handleMaxLogin"
					>
						<div class="space-y-2">
							<label
								for="maxPhone"
								class="block text-sm font-medium text-slate-700"
							>
								{{
									t(
										"Login.max.phoneLabel",
									)
								}}
							</label>

							<input
								id="maxPhone"
								ref="maxPhoneInput"
								:value="
									maxPhone
								"
								type="tel"
								inputmode="tel"
								autocomplete="tel"
								required
								:disabled="
									maxRequestActive
								"
								class="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 disabled:text-slate-500"
								:placeholder="
									t(
										'Login.max.phonePlaceholder',
									)
								"
								@input="
									handleMaxPhoneInput
								"
							/>
						</div>

						<p
							class="text-sm leading-6 text-slate-500"
						>
							{{
								t(
									"Login.max.hint",
								)
							}}
						</p>

						<div
							v-if="maxStatusMessage"
							class="rounded-xl border px-4 py-3 text-sm font-medium"
							:class="maxStatusClass"
							aria-live="polite"
						>
							{{ maxStatusMessage }}
						</div>

						<div
							v-if="maxErrorMessage"
							class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
							aria-live="polite"
						>
							{{ maxErrorMessage }}
						</div>

						<button
							type="submit"
							:disabled="
								maxSubmitting ||
								maxRequestActive ||
								!normalizedMaxPhone
							"
							class="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
						>
							{{
								maxRequestActive
									? t(
											"Login.max.waiting",
										)
									: t(
											"Login.max.submit",
										)
							}}
						</button>
					</form>

					<form
						v-else
						class="space-y-5"
						@submit.prevent="
							handlePasswordLogin
						"
					>
						<div class="space-y-2">
							<label
								for="userLogin"
								class="block text-sm font-medium text-slate-700"
							>
								{{
									t(
										"Login.login.label",
									)
								}}
							</label>

							<input
								id="userLogin"
								ref="loginInput"
								v-model="
									userLogin
								"
								type="text"
								required
								autocomplete="username"
								class="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
								:placeholder="
									t(
										'Login.login.placeholder',
									)
								"
							/>
						</div>

						<div class="space-y-2">
							<label
								for="userPwd"
								class="block text-sm font-medium text-slate-700"
							>
								{{
									t(
										"Login.pwd.label",
									)
								}}
							</label>

							<input
								id="userPwd"
								v-model="
									userPwd
								"
								type="password"
								required
								autocomplete="current-password"
								class="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
								:placeholder="
									t(
										'Login.pwd.placeholder',
									)
								"
							/>
						</div>

						<div
							v-if="
								passwordErrorMessage
							"
							class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
						>
							{{
								passwordErrorMessage
							}}
						</div>

						<button
							type="submit"
							:disabled="
								passwordSubmitting
							"
							class="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
						>
							{{ t("Login.submit") }}
						</button>
					</form>
				</div>
			</div>
		</div>
	</div>
</template>
