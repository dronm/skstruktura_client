<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";

import { HorizontalMainMenu, useMainMenu } from "@katren/vue-business-app/menu";
import { ProgAboutDialog } from "@katren/vue-business-app/prog-about";
import { useReferenceSelectionMode } from "@katren/vue-collection-lib";
import CollectionDirtyGuard from "@katren/vue-collection-lib/components/form/CollectionDirtyGuard.vue";

import wsManager from "@/api/wsConn";
import { useSupplyManagerDraftGuard } from "@/composables/useSupplyManagerDraftGuard";
import { useAuthStore } from "@/stores/useAuthStore";
import type { RoleId } from "@/types/enums/roleId";
import Login from "@/views/Login.vue";

interface RoleWorkspace {
	routeName: string;
	subtitle: string;
	icon: string;
}

const getRoleWorkspace = (
	roleId: RoleId | null | undefined,
): RoleWorkspace | null => {
	switch (roleId) {
		case "construction_site_manager":
			return {
				routeName: "constructionManagerWorkspace",
				subtitle: "Рабочее место прораба",
				icon: "pi pi-building",
			};
		case "supply_manager":
			return {
				routeName: "supplyManagerWorkspace",
				subtitle: "Рабочее место снабженца",
				icon: "pi pi-truck",
			};
		default:
			return null;
	}
};

const {
	menu,
	error: menuError,
	load: fetchMenu,
} = useMainMenu({
	autoLoad: false,
});

const progAboutVisible = ref(false);
const { t } = useI18n();
const { active: supplyManagerDraftActive } = useSupplyManagerDraftGuard();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const referenceSelectionMode = useReferenceSelectionMode();
const { user } = storeToRefs(authStore);

const authed = computed(() => authStore.isAuthenticated());
const userName = computed(() => user.value?.name ?? null);
const userRoleId = computed(() => user.value?.role_id ?? null);
const roleWorkspace = computed(() => getRoleWorkspace(userRoleId.value));
const canManageMenu = computed(() => userRoleId.value === "admin");
const canViewApplicationRoutes = computed(() => userRoleId.value === "admin");
const collectionDirtyGuardEnabled = computed(() => {
	return (
		typeof route.name === "string" &&
		/(Create|Edit)$/.test(route.name)
	);
});

const openUserProfile = async (): Promise<void> => {
	await router.push({
		name: "userProfile",
	});
};

const showProgAbout = (): void => {
	progAboutVisible.value = true;
};

const openMainMenuConstructor = async (): Promise<void> => {
	await router.push({
		name: "mainMenuConstructor",
	});
};

const openApplicationRoutes = async (): Promise<void> => {
	await router.push({
		name: "applicationRoutes",
	});
};

const handleLogout = async (): Promise<void> => {
	if (
		supplyManagerDraftActive.value &&
		!window.confirm(
			t("SupplyManagerWorkspace.assignment.leaveWarning"),
		)
	) {
		return;
	}
	supplyManagerDraftActive.value = false;
	try {
		await authStore.logout();
	} finally {
		menu.value = [];
		await router.push({ name: "main" });
	}
};

watch(
	() => [authed.value, user.value?.id, user.value?.role_id] as const,
	async ([isAuthed, , roleId]) => {
		if (isAuthed) {
			wsManager.connect();
			if (getRoleWorkspace(roleId) !== null) {
				menu.value = [];
				menuError.value = null;
				return;
			}
			await fetchMenu();
			return;
		}

		wsManager.disconnect();
		menu.value = [];
		menuError.value = null;
	},
	{ immediate: true },
);
</script>

<template>
	<Login v-if="!authed" />

	<div
		v-else
		class="skstruktura-shell relative min-h-screen overflow-x-clip bg-slate-100 text-slate-900"
	>
		<div
			v-if="!referenceSelectionMode"
			class="pointer-events-none fixed inset-0 overflow-hidden"
			aria-hidden="true"
		>
			<div
				class="absolute -right-32 top-12 h-96 w-96 rounded-full bg-cyan-300/15 blur-3xl"
			/>
			<div
				class="absolute -left-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-blue-300/10 blur-3xl"
			/>
			<div
				class="absolute inset-x-0 top-16 h-44 bg-gradient-to-b from-slate-200/55 to-transparent"
			/>
		</div>

		<HorizontalMainMenu
			v-if="!referenceSelectionMode && roleWorkspace === null"
			:menu="menu"
			:user-name="userName"
			:menu-error="menuError"
			:brand-route="{ name: 'main' }"
			:can-view-profile="true"
			:can-manage-menu="canManageMenu"
			:can-view-application-routes="canViewApplicationRoutes"
			@profile="openUserProfile"
			@about="showProgAbout"
			@constructor="openMainMenuConstructor"
			@all-routes="openApplicationRoutes"
			@logout="handleLogout"
		></HorizontalMainMenu>

		<header
			v-if="!referenceSelectionMode && roleWorkspace !== null"
			class="relative z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur"
		>
			<div
				class="mx-auto flex min-h-14 w-full max-w-[1700px] items-center gap-2 px-3 py-2 sm:px-5"
			>
				<RouterLink
					:to="{
						name: roleWorkspace.routeName,
					}"
					class="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-slate-800 transition-colors hover:bg-slate-100"
				>
					<span
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-700 text-white"
					>
						<i
							:class="
								roleWorkspace.icon
							"
							aria-hidden="true"
						/>
					</span>
					<span class="min-w-0">
						<span
							class="block truncate text-sm font-semibold leading-tight"
						>
							СК Структура
						</span>
						<span
							class="hidden truncate text-xs text-slate-500 sm:block"
						>
							{{
								roleWorkspace.subtitle
							}}
						</span>
					</span>
				</RouterLink>

				<div
					class="ml-auto flex min-w-0 items-center gap-1 sm:gap-2"
				>
					<span
						v-if="userName"
						class="hidden max-w-52 truncate text-sm font-medium text-slate-600 md:block"
					>
						{{ userName }}
					</span>
					<Button
						icon="pi pi-user"
						label="Профиль"
						severity="secondary"
						text
						size="small"
						aria-label="Открыть профиль"
						@click="openUserProfile"
					/>
					<Button
						icon="pi pi-sign-out"
						label="Выйти"
						severity="secondary"
						text
						size="small"
						aria-label="Выйти"
						@click="handleLogout"
					/>
				</div>
			</div>
		</header>

		<ProgAboutDialog v-model:visible="progAboutVisible" />

		<main
			class="relative"
			:class="
				referenceSelectionMode
					? 'min-h-screen'
					: 'min-h-[calc(100vh-4rem)] pb-8'
			"
		>
			<div
				class="relative mx-auto w-full max-w-[1700px]"
				:class="
					referenceSelectionMode
						? 'p-0'
						: 'px-2 py-2 sm:px-4 sm:py-3 lg:px-5 lg:py-4'
				"
			>
				<CollectionDirtyGuard
					:enabled="collectionDirtyGuardEnabled"
				>
					<router-view />
				</CollectionDirtyGuard>
			</div>
		</main>
	</div>
</template>
