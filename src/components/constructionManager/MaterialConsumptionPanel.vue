<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import ConfirmDialog from "primevue/confirmdialog";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import { useConfirm } from "primevue/useconfirm";

import { errorText } from "@katren/vue-collection-lib";

import { constructionManagerWorkspaceApi } from "@/api/constructionManagerWorkspace";
import GroupedMaterialGrid from "@/components/constructionManager/GroupedMaterialGrid.vue";
import MaterialConsumptionHistoryGrid from "@/components/constructionManager/MaterialConsumptionHistoryGrid.vue";
import MaterialWorkbenchSummary from "@/components/constructionManager/MaterialWorkbenchSummary.vue";
import { useAuthStore } from "@/stores/useAuthStore";
import type {
	MaterialConsumptionWorkbenchLine,
	MaterialConsumptionWorkspaceDraft,
	MaterialWorkbenchRow,
} from "@/types/constructionManagerWorkspace";
import { materialBalanceRowToWorkbenchRow } from "@/types/constructionManagerWorkspace";
import type { MaterialBalanceConstructionSite } from "@/types/materialBalance";
import type { MaterialConsumptionDocumentSave } from "@/types/materialDocuments";

interface SelectedConsumptionLine {
	row: MaterialWorkbenchRow;
	line: MaterialConsumptionWorkbenchLine;
}

interface MaterialTypeFilterOption {
	id: number;
	name: string;
}

type ConsumptionPanelTab = "new" | "history";

const props = defineProps<{
	site: MaterialBalanceConstructionSite | null;
}>();

const emit = defineEmits<{
	"submitting-change": [value: boolean];
	"inventory-updated": [];
}>();

const confirmGroup = "construction-manager-consumption";
const { t } = useI18n();
const confirm = useConfirm();
const authStore = useAuthStore();
const drafts = reactive(new Map<number, MaterialConsumptionWorkspaceDraft>());
const catalogRows = ref<MaterialWorkbenchRow[]>([]);
const currentDraft = ref<MaterialConsumptionWorkspaceDraft | null>(null);
const catalogLoading = ref(false);
const submitting = ref(false);
const catalogError = ref("");
const consumptionError = ref("");
const submittedConsumptionID = ref<number | null>(null);
const activeTab = ref<ConsumptionPanelTab>("new");
const selectedMaterialTypeID = ref<number | null>(null);
let catalogLoadSequence = 0;

const createDraft = (): MaterialConsumptionWorkspaceDraft => ({
	comment: "",
	lines: {},
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value)
	);
};

const draftStorageKey = (constructionSiteID: number): string | null => {
	const userID = authStore.user?.id ?? 0;
	return userID > 0
		? `construction-manager-consumption-draft:${userID}:${constructionSiteID}`
		: null;
};

const removeStoredDraft = (constructionSiteID: number): void => {
	const key = draftStorageKey(constructionSiteID);
	if (key === null) {
		return;
	}

	try {
		localStorage.removeItem(key);
	} catch {
		// Storage availability must not prevent consumption processing.
	}
};

const readStoredDraft = (
	constructionSiteID: number,
): MaterialConsumptionWorkspaceDraft | null => {
	const key = draftStorageKey(constructionSiteID);
	if (key === null) {
		return null;
	}

	try {
		const value: unknown = JSON.parse(
			localStorage.getItem(key) ?? "null",
		);
		if (!isRecord(value)) {
			return null;
		}

		const lines: Record<number, MaterialConsumptionWorkbenchLine> =
			{};
		if (isRecord(value.lines)) {
			for (const [materialKey, storedLine] of Object.entries(
				value.lines,
			)) {
				const materialID = Number(materialKey);
				if (
					!Number.isInteger(materialID) ||
					materialID <= 0 ||
					!isRecord(storedLine)
				) {
					continue;
				}

				const quant =
					typeof storedLine.quant === "number" &&
					Number.isFinite(storedLine.quant) &&
					storedLine.quant > 0
						? storedLine.quant
						: null;
				if (quant !== null) {
					lines[materialID] = { quant };
				}
			}
		}

		return {
			comment:
				typeof value.comment === "string"
					? value.comment
					: "",
			lines,
		};
	} catch {
		removeStoredDraft(constructionSiteID);
		return null;
	}
};

const persistDraft = (
	constructionSiteID: number,
	draft: MaterialConsumptionWorkspaceDraft,
): void => {
	const key = draftStorageKey(constructionSiteID);
	if (key === null) {
		return;
	}

	try {
		const lines: Record<number, MaterialConsumptionWorkbenchLine> =
			{};
		for (const [materialKey, line] of Object.entries(draft.lines)) {
			if ((line.quant ?? 0) > 0) {
				lines[Number(materialKey)] = line;
			}
		}

		localStorage.setItem(
			key,
			JSON.stringify({
				comment: draft.comment,
				lines,
			}),
		);
	} catch {
		// Storage availability must not prevent consumption processing.
	}
};

const persistCurrentDraft = (): void => {
	const constructionSiteID = props.site?.id ?? null;
	if (constructionSiteID !== null && currentDraft.value !== null) {
		persistDraft(constructionSiteID, currentDraft.value);
	}
};

const ensureDraft = (
	constructionSiteID: number,
): MaterialConsumptionWorkspaceDraft => {
	let draft = drafts.get(constructionSiteID);
	if (draft === undefined) {
		draft = readStoredDraft(constructionSiteID) ?? createDraft();
		drafts.set(constructionSiteID, draft);
	}
	return draft;
};

const ensureLine = (materialID: number): MaterialConsumptionWorkbenchLine => {
	const draft = currentDraft.value;
	if (draft === null) {
		return { quant: null };
	}

	let line = draft.lines[materialID];
	if (line === undefined) {
		line = { quant: null };
		draft.lines[materialID] = line;
	}
	return line;
};

const materialTypeOptions = computed<MaterialTypeFilterOption[]>(() => {
	const options = new Map<number, MaterialTypeFilterOption>();
	for (const row of catalogRows.value) {
		if (!options.has(row.materialTypeID)) {
			options.set(row.materialTypeID, {
				id: row.materialTypeID,
				name: row.materialTypeName,
			});
		}
	}

	return Array.from(options.values());
});

const filteredCatalogRows = computed<MaterialWorkbenchRow[]>(() => {
	const materialTypeID = selectedMaterialTypeID.value;
	return materialTypeID === null
		? catalogRows.value
		: catalogRows.value.filter(
				(row) => row.materialTypeID === materialTypeID,
			);
});

const selectedLines = computed<SelectedConsumptionLine[]>(() => {
	const draft = currentDraft.value;
	if (draft === null) {
		return [];
	}

	return catalogRows.value.flatMap((row) => {
		const line = draft.lines[row.materialID];
		if (line === undefined || (line.quant ?? 0) <= 0) {
			return [];
		}
		return [{ row, line }];
	});
});

const canSubmit = computed(() => {
	return (
		!submitting.value &&
		props.site !== null &&
		selectedLines.value.length > 0 &&
		!catalogLoading.value
	);
});

const numberFormatter = new Intl.NumberFormat("ru-RU", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 4,
});

const formatNumber = (value: number): string => {
	return numberFormatter.format(value);
};

const setQuantity = (materialID: number, value: number | null): void => {
	const normalized =
		typeof value === "number" && Number.isFinite(value) && value > 0
			? Math.round((value + Number.EPSILON) * 10_000) / 10_000
			: null;
	ensureLine(materialID).quant = normalized;
	persistCurrentDraft();
	consumptionError.value = "";
	submittedConsumptionID.value = null;
};

const setComment = (value: string | undefined): void => {
	if (currentDraft.value !== null) {
		currentDraft.value.comment = value ?? "";
		persistCurrentDraft();
	}
};

const selectTab = (tab: ConsumptionPanelTab): void => {
	if (!submitting.value) {
		activeTab.value = tab;
	}
};

const loadCatalog = async (
	constructionSiteID: number | null,
): Promise<void> => {
	const sequence = ++catalogLoadSequence;
	catalogRows.value = [];
	selectedMaterialTypeID.value = null;
	catalogError.value = "";
	consumptionError.value = "";
	submittedConsumptionID.value = null;

	if (constructionSiteID === null) {
		catalogLoading.value = false;
		currentDraft.value = null;
		return;
	}

	currentDraft.value = ensureDraft(constructionSiteID);
	catalogLoading.value = true;
	try {
		const response =
			await constructionManagerWorkspaceApi.materials(
				constructionSiteID,
			);
		if (sequence !== catalogLoadSequence) {
			return;
		}
		catalogRows.value = response.rows.map(
			materialBalanceRowToWorkbenchRow,
		);
	} catch (caught: unknown) {
		if (sequence !== catalogLoadSequence) {
			return;
		}
		catalogError.value = errorText(caught);
	} finally {
		if (sequence === catalogLoadSequence) {
			catalogLoading.value = false;
		}
	}
};

const createConsumptionModel = (): MaterialConsumptionDocumentSave | null => {
	const site = props.site;
	const draft = currentDraft.value;
	if (site === null || draft === null) {
		return null;
	}

	return {
		id: 0,
		version: 0,
		date: new Date(),
		construction_site_id: site.id,
		comment: draft.comment.trim() || null,
		items: selectedLines.value.map(({ row, line }) => ({
			material_id: row.materialID,
			measure_unit_id: row.measureUnitID,
			quant: line.quant ?? 0,
		})),
	};
};

const submitConsumption = async (): Promise<void> => {
	const site = props.site;
	const draft = currentDraft.value;
	const model = createConsumptionModel();
	if (
		site === null ||
		draft === null ||
		model === null ||
		!canSubmit.value
	) {
		return;
	}

	submitting.value = true;
	emit("submitting-change", true);
	consumptionError.value = "";
	submittedConsumptionID.value = null;
	try {
		const created =
			await constructionManagerWorkspaceApi.createMaterialConsumption(
				model,
			);
		draft.comment = "";
		draft.lines = {};
		removeStoredDraft(site.id);
		emit("inventory-updated");
		await loadCatalog(site.id);
		submittedConsumptionID.value = created.id;
	} catch (caught: unknown) {
		consumptionError.value = errorText(caught);
	} finally {
		submitting.value = false;
		emit("submitting-change", false);
	}
};

const requestSubmit = (): void => {
	if (!canSubmit.value) {
		return;
	}

	confirm.require({
		group: confirmGroup,
		header: t(
			"ConstructionManagerWorkspace.consumption.confirmHeader",
		),
		message: t(
			"ConstructionManagerWorkspace.consumption.confirmMessage",
		),
		icon: "pi pi-exclamation-triangle",
		acceptLabel: t(
			"ConstructionManagerWorkspace.consumption.submit",
		),
		rejectLabel: t("Grid.commands.cancel"),
		accept: () => {
			void submitConsumption();
		},
	});
};

watch(
	() => props.site?.id ?? null,
	(constructionSiteID) => {
		void loadCatalog(constructionSiteID);
	},
	{ immediate: true },
);
</script>

<template>
	<div class="w-full max-w-6xl">
		<ConfirmDialog :group="confirmGroup" />

		<nav
			class="mb-4 flex gap-1 border-b border-slate-200"
			role="tablist"
			:aria-label="
				t(
					'ConstructionManagerWorkspace.tabs.consumption',
				)
			"
		>
			<button
				type="button"
				role="tab"
				class="border-b-2 px-4 py-2 text-sm font-medium transition-colors"
				:class="
					activeTab === 'new'
						? 'border-cyan-700 text-cyan-800'
						: 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
				"
				:aria-selected="activeTab === 'new'"
				:disabled="submitting"
				@click="selectTab('new')"
			>
				{{
					t(
						"ConstructionManagerWorkspace.consumption.tabs.new",
					)
				}}
			</button>
			<button
				type="button"
				role="tab"
				class="border-b-2 px-4 py-2 text-sm font-medium transition-colors"
				:class="
					activeTab === 'history'
						? 'border-cyan-700 text-cyan-800'
						: 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
				"
				:aria-selected="activeTab === 'history'"
				:disabled="submitting"
				@click="selectTab('history')"
			>
				{{
					t(
						"ConstructionManagerWorkspace.consumption.tabs.history",
					)
				}}
			</button>
		</nav>

		<div v-show="activeTab === 'new'">
			<div
				v-if="consumptionError"
				class="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
				role="alert"
			>
				{{ consumptionError }}
			</div>
			<div
				v-if="submittedConsumptionID !== null"
				class="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
				role="status"
			>
				{{
					t(
						"ConstructionManagerWorkspace.consumption.submitted",
						{
							id: submittedConsumptionID,
						},
					)
				}}
			</div>

			<div
				class="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
			>
				<label
					for="constructionManagerConsumptionMaterialType"
					class="text-sm font-medium text-slate-700"
				>
					{{
						t(
							"ConstructionManagerWorkspace.consumption.materialType",
						)
					}}
				</label>
				<Select
					inputId="constructionManagerConsumptionMaterialType"
					v-model="selectedMaterialTypeID"
					:options="materialTypeOptions"
					optionLabel="name"
					optionValue="id"
					:placeholder="
						t(
							'ConstructionManagerWorkspace.consumption.allMaterialTypes',
						)
					"
					showClear
					class="w-full sm:w-72"
				/>
			</div>

			<div
				class="mb-4 rounded-lg border border-slate-200 bg-white p-4"
			>
				<label
					for="constructionManagerConsumptionComment"
					class="mb-1 block text-sm font-medium text-slate-700"
				>
					{{
						t(
							"ConstructionManagerWorkspace.consumption.comment",
						)
					}}
				</label>
				<Textarea
					id="constructionManagerConsumptionComment"
					:modelValue="
						currentDraft?.comment ?? ''
					"
					rows="2"
					class="w-full"
					:disabled="
						submitting ||
						props.site === null
					"
					@update:modelValue="setComment"
				/>
			</div>

			<div
				class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]"
			>
				<GroupedMaterialGrid
					:rows="filteredCatalogRows"
					:loading="catalogLoading"
					:error="catalogError"
					:emptyText="
						t(
							'ConstructionManagerWorkspace.consumption.empty',
						)
					"
					:extraColumnCount="1"
					minWidth="40rem"
				>
					<template #extra-headers>
						<th
							class="w-28 px-1.5 py-2 text-right font-semibold text-slate-700"
						>
							{{
								t(
									"ConstructionManagerWorkspace.grid.quantity",
								)
							}}
						</th>
					</template>
					<template #extra-cells="{ row }">
						<td class="w-28 px-1.5 py-1.5">
							<InputNumber
								:modelValue="
									ensureLine(
										row.materialID,
									).quant
								"
								:min="0"
								:minFractionDigits="
									0
								"
								:maxFractionDigits="
									4
								"
								:useGrouping="
									false
								"
								size="small"
								showButtons
								buttonLayout="horizontal"
								incrementButtonClass="!w-7"
								decrementButtonClass="!w-7"
								:step="1"
								:disabled="
									submitting
								"
								inputClass="h-9 min-w-0 text-right tabular-nums"
								class="h-9 w-28"
								@update:modelValue="
									setQuantity(
										row.materialID,
										$event,
									)
								"
							/>
						</td>
					</template>
				</GroupedMaterialGrid>

				<MaterialWorkbenchSummary
					:title="
						t(
							'ConstructionManagerWorkspace.consumption.summary',
						)
					"
					:count="selectedLines.length"
					:actionLabel="
						t(
							'ConstructionManagerWorkspace.consumption.submit',
						)
					"
					actionIcon="pi pi-minus-circle"
					:busy="submitting"
					:disabled="!canSubmit"
					@action="requestSubmit"
				>
					<div
						v-if="
							selectedLines.length ===
							0
						"
						class="py-8 text-center text-sm text-slate-500"
					>
						{{
							t(
								"ConstructionManagerWorkspace.consumption.summaryEmpty",
							)
						}}
					</div>
					<div
						v-for="item in selectedLines"
						:key="item.row.materialID"
						class="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 text-sm"
					>
						<div
							class="min-w-0 font-medium text-slate-800"
						>
							{{
								item.row
									.materialName
							}}
						</div>
						<div
							class="whitespace-nowrap text-right font-medium tabular-nums text-slate-900"
						>
							{{
								formatNumber(
									item
										.line
										.quant ??
										0,
								)
							}}
							{{
								item.row
									.measureUnitName
							}}
						</div>
					</div>
					<template #footer>
						<p
							class="text-xs text-slate-500"
						>
							{{
								t(
									"ConstructionManagerWorkspace.consumption.clearAfterSuccess",
								)
							}}
						</p>
					</template>
				</MaterialWorkbenchSummary>
			</div>
		</div>

		<MaterialConsumptionHistoryGrid
			v-if="activeTab === 'history' && props.site !== null"
			:key="props.site.id"
			:constructionSiteID="props.site.id"
		/>
	</div>
</template>
