import {
	computed,
	inject,
	provide,
	ref,
	type ComputedRef,
	type InjectionKey,
	type Ref,
} from "vue";

import { errorText } from "@katren/vue-collection-lib";

import { constructionManagerWorkspaceApi } from "@/api/constructionManagerWorkspace";
import { useAuthStore } from "@/stores/useAuthStore";
import type { MaterialBalanceConstructionSite } from "@/types/materialBalance";

export interface ConstructionManagerSiteContext {
	constructionSites: Ref<MaterialBalanceConstructionSite[]>;
	constructionSiteID: Ref<number | null>;
	selectedConstructionSite: ComputedRef<MaterialBalanceConstructionSite | null>;
	hasSingleConstructionSite: ComputedRef<boolean>;
	loading: Ref<boolean>;
	error: Ref<string>;
	load: () => Promise<void>;
	select: (constructionSiteID: number | null) => void;
}

const siteContextKey: InjectionKey<ConstructionManagerSiteContext> = Symbol(
	"constructionManagerSiteContext",
);

const storedSiteKey = (userID: number): string => {
	return `construction-manager-site:${userID}`;
};

const readStoredSiteID = (userID: number): number | null => {
	const stored = localStorage.getItem(storedSiteKey(userID));
	if (stored === null) {
		return null;
	}

	const value = Number(stored);
	return Number.isInteger(value) && value > 0 ? value : null;
};

const createConstructionManagerSiteContext =
	(): ConstructionManagerSiteContext => {
		const authStore = useAuthStore();
		const constructionSites = ref<
			MaterialBalanceConstructionSite[]
		>([]);
		const constructionSiteID = ref<number | null>(null);
		const loading = ref(false);
		const error = ref("");
		let loadSequence = 0;

		const selectedConstructionSite = computed(() => {
			return (
				constructionSites.value.find(
					(site) =>
						site.id ===
						constructionSiteID.value,
				) ?? null
			);
		});

		const hasSingleConstructionSite = computed(() => {
			return constructionSites.value.length === 1;
		});

		const select = (value: number | null): void => {
			const normalized =
				typeof value === "number" &&
				Number.isInteger(value) &&
				constructionSites.value.some(
					(site) => site.id === value,
				)
					? value
					: null;
			constructionSiteID.value = normalized;

			const userID = authStore.user?.id ?? 0;
			if (userID <= 0) {
				return;
			}
			if (normalized === null) {
				localStorage.removeItem(storedSiteKey(userID));
				return;
			}
			localStorage.setItem(
				storedSiteKey(userID),
				String(normalized),
			);
		};

		const load = async (): Promise<void> => {
			const sequence = ++loadSequence;
			loading.value = true;
			error.value = "";
			try {
				const sites =
					await constructionManagerWorkspaceApi.constructionSites();
				if (sequence !== loadSequence) {
					return;
				}

				constructionSites.value = sites;
				if (sites.length === 1) {
					select(sites[0]?.id ?? null);
					return;
				}

				const currentID = constructionSiteID.value;
				if (
					currentID !== null &&
					sites.some(
						(site) => site.id === currentID,
					)
				) {
					select(currentID);
					return;
				}

				const userID = authStore.user?.id ?? 0;
				const storedID =
					userID > 0
						? readStoredSiteID(userID)
						: null;
				select(
					storedID !== null &&
						sites.some(
							(site) =>
								site.id ===
								storedID,
						)
						? storedID
						: null,
				);
			} catch (caught: unknown) {
				if (sequence !== loadSequence) {
					return;
				}
				constructionSites.value = [];
				constructionSiteID.value = null;
				error.value = errorText(caught);
			} finally {
				if (sequence === loadSequence) {
					loading.value = false;
				}
			}
		};

		return {
			constructionSites,
			constructionSiteID,
			selectedConstructionSite,
			hasSingleConstructionSite,
			loading,
			error,
			load,
			select,
		};
	};

export const provideConstructionManagerSiteContext =
	(): ConstructionManagerSiteContext => {
		const context = createConstructionManagerSiteContext();
		provide(siteContextKey, context);
		return context;
	};

export const useConstructionManagerSiteContext =
	(): ConstructionManagerSiteContext => {
		const context = inject(siteContextKey);
		if (context === undefined) {
			throw new Error(
				"Construction manager site context is not provided",
			);
		}
		return context;
	};
