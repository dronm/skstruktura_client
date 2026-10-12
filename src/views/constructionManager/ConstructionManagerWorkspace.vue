<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import Select from "primevue/select";

import MaterialBalancePanel from "@/components/constructionManager/MaterialBalancePanel.vue";
import MaterialConsumptionPanel from "@/components/constructionManager/MaterialConsumptionPanel.vue";
import MaterialRequestPanel from "@/components/constructionManager/MaterialRequestPanel.vue";
import MaterialStatusPanel from "@/components/constructionManager/MaterialStatusPanel.vue";
import MaterialTransferPanel from "@/components/constructionManager/MaterialTransferPanel.vue";
import ConcreteWorkLogPanel from "@/components/concreteWorkLog/ConcreteWorkLogPanel.vue";
import ConcreteHeatingLogPanel from "@/components/concreteHeatingLog/ConcreteHeatingLogPanel.vue";
import ConstructionWorkLogPanel from "@/components/constructionWorkLog/ConstructionWorkLogPanel.vue";
import { provideConstructionManagerSiteContext } from "@/composables/useConstructionManagerSiteContext";

type WorkspaceTab =
	| "balance"
	| "request"
	| "consumption"
	| "transfer"
	| "status"
	| "workLog"
	| "heatingLog"
	| "concreteLog";

const { t } = useI18n();
const siteContext = provideConstructionManagerSiteContext();
const activeTab = ref<WorkspaceTab>("balance");
const requestVisited = ref(false);
const consumptionVisited = ref(false);
const transferVisited = ref(false);
const statusVisited = ref(false);
const workLogVisited = ref(false);
const heatingLogVisited = ref(false);
const concreteLogVisited = ref(false);
const requestSubmitting = ref(false);
const consumptionSubmitting = ref(false);
const transferSubmitting = ref(false);
const statusSubmitting = ref(false);
const workLogSubmitting = ref(false);
const heatingLogSubmitting = ref(false);
const concreteLogSubmitting = ref(false);
const inventoryRevision = ref(0);

const selectTab = (tab: WorkspaceTab): void => {
	activeTab.value = tab;
	if (tab === "request") {
		requestVisited.value = true;
	} else if (tab === "consumption") {
		consumptionVisited.value = true;
	} else if (tab === "transfer") {
		transferVisited.value = true;
	} else if (tab === "status") {
		statusVisited.value = true;
	} else if (tab === "workLog") {
		workLogVisited.value = true;
	} else if (tab === "heatingLog") {
		heatingLogVisited.value = true;
	} else if (tab === "concreteLog") {
		concreteLogVisited.value = true;
	}
};

const selectConstructionSite = (constructionSiteID: number | null): void => {
	if (
		!requestSubmitting.value &&
		!consumptionSubmitting.value &&
		!transferSubmitting.value &&
		!statusSubmitting.value &&
		!workLogSubmitting.value &&
		!heatingLogSubmitting.value &&
		!concreteLogSubmitting.value
	) {
		siteContext.select(constructionSiteID);
	}
};

const refreshInventory = (): void => {
	inventoryRevision.value += 1;
};

onMounted(() => {
	void siteContext.load();
});
</script>

<template>
	<div
		class="construction-manager-workspace mx-auto min-w-0 w-full max-w-7xl space-y-4"
	>
		<section
			class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
		>
			<div class="flex items-center gap-3">
				<label
					for="constructionManagerSite"
					class="shrink-0 text-sm font-medium text-slate-700"
				>
					{{
						t(
							"ConstructionManagerWorkspace.site.label",
						)
					}}
				</label>
				<div class="min-w-0 flex-1 sm:max-w-xl">
					<div
						v-if="
							siteContext
								.hasSingleConstructionSite
								.value
						"
						id="constructionManagerSite"
						class="flex min-h-10 items-center wrap-anywhere rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-medium text-slate-800"
					>
						{{
							siteContext
								.selectedConstructionSite
								.value?.name
						}}
					</div>
					<Select
						overlayClass="construction-manager-select-overlay"
						v-else
						inputId="constructionManagerSite"
						:modelValue="
							siteContext
								.constructionSiteID
								.value
						"
						:options="
							siteContext
								.constructionSites
								.value
						"
						optionLabel="name"
						optionValue="id"
						:placeholder="
							t(
								'ConstructionManagerWorkspace.site.select',
							)
						"
						:loading="
							siteContext.loading
								.value
						"
						:disabled="
							siteContext.loading
								.value ||
							requestSubmitting ||
							consumptionSubmitting ||
							transferSubmitting ||
							statusSubmitting ||
							workLogSubmitting ||
							heatingLogSubmitting ||
							concreteLogSubmitting ||
							siteContext
								.constructionSites
								.value
								.length === 0
						"
						filter
						class="w-full"
						@update:modelValue="
							selectConstructionSite
						"
					/>
				</div>
			</div>

			<div
				v-if="siteContext.error.value"
				class="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
				role="alert"
			>
				{{ siteContext.error.value }}
			</div>
			<div
				v-else-if="
					!siteContext.loading.value &&
					siteContext.constructionSites.value
						.length === 0
				"
				class="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
			>
				{{
					t(
						"ConstructionManagerWorkspace.site.empty",
					)
				}}
			</div>
		</section>

		<nav
			class="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
			aria-label="Рабочее место прораба"
		>
			<button
				type="button"
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
				:class="
					activeTab === 'balance'
						? 'bg-cyan-700 text-white'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
				"
				:aria-selected="activeTab === 'balance'"
				@click="selectTab('balance')"
			>
				<i
					class="pi pi-chart-bar mr-2"
					aria-hidden="true"
				/>
				{{
					t(
						"ConstructionManagerWorkspace.tabs.balance",
					)
				}}
			</button>
			<button
				type="button"
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
				:class="
					activeTab === 'request'
						? 'bg-cyan-700 text-white'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
				"
				:aria-selected="activeTab === 'request'"
				@click="selectTab('request')"
			>
				<i
					class="pi pi-clipboard mr-2"
					aria-hidden="true"
				/>
				{{
					t(
						"ConstructionManagerWorkspace.tabs.request",
					)
				}}
			</button>
			<button
				type="button"
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
				:class="
					activeTab === 'consumption'
						? 'bg-cyan-700 text-white'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
				"
				:aria-selected="activeTab === 'consumption'"
				@click="selectTab('consumption')"
			>
				<i
					class="pi pi-minus-circle mr-2"
					aria-hidden="true"
				/>
				{{
					t(
						"ConstructionManagerWorkspace.tabs.consumption",
					)
				}}
			</button>
			<button
				type="button"
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
				:class="
					activeTab === 'transfer'
						? 'bg-cyan-700 text-white'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
				"
				:aria-selected="activeTab === 'transfer'"
				@click="selectTab('transfer')"
			>
				<i
					class="pi pi-arrow-right-arrow-left mr-2"
					aria-hidden="true"
				/>
				{{
					t(
						"ConstructionManagerWorkspace.tabs.transfer",
					)
				}}
			</button>
			<button
				type="button"
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
				:class="
					activeTab === 'status'
						? 'bg-cyan-700 text-white'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
				"
				:aria-selected="activeTab === 'status'"
				@click="selectTab('status')"
			>
				<i
					class="pi pi-wrench mr-2"
					aria-hidden="true"
				/>
				{{
					t(
						"ConstructionManagerWorkspace.tabs.status",
					)
				}}
			</button>
			<button
				type="button"
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
				:class="
					activeTab === 'workLog'
						? 'bg-cyan-700 text-white'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
				"
				:aria-selected="activeTab === 'workLog'"
				@click="selectTab('workLog')"
			>
				<i class="pi pi-book mr-2" aria-hidden="true" />
				{{
					t(
						"ConstructionManagerWorkspace.tabs.workLog",
					)
				}}
			</button>
			<button
				type="button"
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
				:class="
					activeTab === 'heatingLog'
						? 'bg-cyan-700 text-white'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
				"
				:aria-selected="activeTab === 'heatingLog'"
				@click="selectTab('heatingLog')"
			>
				<i class="pi pi-book mr-2" aria-hidden="true" />
				{{
					t(
						"ConstructionManagerWorkspace.tabs.heatingLog",
					)
				}}
			</button>
			<button
				type="button"
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
				:class="
					activeTab === 'concreteLog'
						? 'bg-cyan-700 text-white'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
				"
				:aria-selected="activeTab === 'concreteLog'"
				@click="selectTab('concreteLog')"
			>
				<i class="pi pi-book mr-2" aria-hidden="true" />
				{{
					t(
						"ConstructionManagerWorkspace.tabs.concreteLog",
					)
				}}
			</button>
		</nav>

		<section
			v-if="
				!siteContext.loading.value &&
				!siteContext.error.value &&
				siteContext.constructionSites.value.length >
					0 &&
				siteContext.selectedConstructionSite.value ===
					null
			"
			class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-14 text-center text-slate-500"
		>
			{{ t("ConstructionManagerWorkspace.site.required") }}
		</section>
		<section
			v-if="
				siteContext.selectedConstructionSite.value !==
				null
			"
			class="rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm sm:p-4"
		>
			<MaterialBalancePanel
				v-show="activeTab === 'balance'"
				:inventoryRevision="inventoryRevision"
				:site="
					siteContext.selectedConstructionSite
						.value
				"
			/>
			<MaterialRequestPanel
				v-if="requestVisited"
				v-show="activeTab === 'request'"
				:site="
					siteContext.selectedConstructionSite
						.value
				"
				:inventoryRevision="inventoryRevision"
				@submitting-change="requestSubmitting = $event"
			/>
			<MaterialConsumptionPanel
				v-if="consumptionVisited"
				v-show="activeTab === 'consumption'"
				:site="
					siteContext.selectedConstructionSite
						.value
				"
				:inventoryRevision="inventoryRevision"
				@submitting-change="
					consumptionSubmitting = $event
				"
				@inventory-updated="refreshInventory"
			/>
			<MaterialTransferPanel
				v-if="transferVisited"
				v-show="activeTab === 'transfer'"
				:site="
					siteContext.selectedConstructionSite
						.value
				"
				:inventoryRevision="inventoryRevision"
				@submitting-change="transferSubmitting = $event"
				@inventory-updated="refreshInventory"
			/>
			<MaterialStatusPanel
				v-if="statusVisited"
				v-show="activeTab === 'status'"
				:site="
					siteContext.selectedConstructionSite
						.value
				"
				:inventoryRevision="inventoryRevision"
				@submitting-change="statusSubmitting = $event"
			/>
			<ConstructionWorkLogPanel
				v-if="workLogVisited"
				v-show="activeTab === 'workLog'"
				:site="
					siteContext.selectedConstructionSite
						.value
				"
				embedded
				@submitting-change="workLogSubmitting = $event"
			/>
			<ConcreteHeatingLogPanel
				v-if="heatingLogVisited"
				v-show="activeTab === 'heatingLog'"
				:site="
					siteContext.selectedConstructionSite
						.value
				"
				embedded
				@submitting-change="
					heatingLogSubmitting = $event
				"
			/>
			<ConcreteWorkLogPanel
				v-if="concreteLogVisited"
				v-show="activeTab === 'concreteLog'"
				:site="
					siteContext.selectedConstructionSite
						.value
				"
				embedded
				@submitting-change="
					concreteLogSubmitting = $event
				"
			/>
		</section>
	</div>
</template>

<style scoped>
.construction-manager-workspace :deep(.p-select) {
	min-width: 0;
	max-width: 100%;
}

.construction-manager-workspace :deep(.p-select-label) {
	min-width: 0;
}

/* Select overlays are teleported outside the workspace root. */
:global(.construction-manager-select-overlay) {
	max-width: calc(100vw - 1rem);
}

:global(.construction-manager-select-overlay .p-select-option),
:global(.construction-manager-select-overlay .p-select-option-label) {
	min-width: 0;
	white-space: normal;
	overflow-wrap: anywhere;
}
</style>
