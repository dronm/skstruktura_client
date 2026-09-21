<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import ConfirmDialog from "primevue/confirmdialog";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import { useConfirm } from "primevue/useconfirm";

import { errorText, FilterOperatorParam } from "@katren/vue-collection-lib";

import { constructionManagerWorkspaceApi } from "@/api/constructionManagerWorkspace";
import { materialRequestDocumentApi } from "@/api/materialDocuments";
import { orderImportanceApi } from "@/api/orderImportance.gen";
import GroupedMaterialGrid from "@/components/constructionManager/GroupedMaterialGrid.vue";
import MaterialRequestHistoryGrid from "@/components/constructionManager/MaterialRequestHistoryGrid.vue";
import MaterialWorkbenchSummary from "@/components/constructionManager/MaterialWorkbenchSummary.vue";
import { useAuthStore } from "@/stores/useAuthStore";
import type {
	MaterialRequestWorkbenchLine,
	MaterialRequestWorkspaceDraft,
	MaterialWorkbenchRow,
} from "@/types/constructionManagerWorkspace";
import { materialBalanceRowToWorkbenchRow } from "@/types/constructionManagerWorkspace";
import type { MaterialRequestDocumentSave } from "@/types/materialDocuments";
import type { MaterialBalanceConstructionSite } from "@/types/materialBalance";
import type { OrderImportance } from "@/types/orderImportance.gen";

interface SelectedRequestLine {
	row: MaterialWorkbenchRow;
	line: MaterialRequestWorkbenchLine;
}

interface MaterialTypeFilterOption {
	id: number;
	name: string;
}

type RequestPanelTab = "new" | "history";

const props = defineProps<{
	site: MaterialBalanceConstructionSite | null;
	inventoryRevision?: number;
}>();

const emit = defineEmits<{
	"submitting-change": [value: boolean];
}>();

const { t } = useI18n();
const confirm = useConfirm();
const authStore = useAuthStore();
const drafts = reactive(new Map<number, MaterialRequestWorkspaceDraft>());
const catalogRows = ref<MaterialWorkbenchRow[]>([]);
const currentDraft = ref<MaterialRequestWorkspaceDraft | null>(null);
const importances = ref<OrderImportance[]>([]);
const catalogLoading = ref(false);
const importancesLoading = ref(false);
const submitting = ref(false);
const catalogError = ref("");
const importancesError = ref("");
const requestError = ref("");
const submittedRequestID = ref<number | null>(null);
const activeTab = ref<RequestPanelTab>("new");
const selectedMaterialTypeID = ref<number | null>(null);
let catalogLoadSequence = 0;

const createDraft = (): MaterialRequestWorkspaceDraft => ({
	comment: "",
	lines: {},
	pendingRequest: null,
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
		? `construction-manager-request-draft:${userID}:${constructionSiteID}`
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
		// Storage availability must not prevent request processing.
	}
};

const readStoredDraft = (
	constructionSiteID: number,
): MaterialRequestWorkspaceDraft | null => {
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

		const lines: Record<number, MaterialRequestWorkbenchLine> = {};
		if (isRecord(value.lines)) {
			for (const [materialKey, storedLine] of Object.entries(
				value.lines,
			)) {
				const materialID = Number(materialKey);
				if (
					!Number.isInteger(materialID) ||
					materialID <= 0
				) {
					continue;
				}
				if (!isRecord(storedLine)) {
					continue;
				}

				const quant =
					typeof storedLine.quant === "number" &&
					Number.isFinite(storedLine.quant) &&
					storedLine.quant > 0
						? storedLine.quant
						: null;
				const orderImportanceID =
					typeof storedLine.orderImportanceID ===
						"number" &&
					Number.isInteger(
						storedLine.orderImportanceID,
					) &&
					storedLine.orderImportanceID > 0
						? storedLine.orderImportanceID
						: null;

				if (
					quant !== null ||
					orderImportanceID !== null
				) {
					lines[materialID] = {
						quant,
						orderImportanceID,
					};
				}
			}
		}

		let pendingRequest: MaterialRequestWorkspaceDraft["pendingRequest"] =
			null;
		if (
			isRecord(value.pendingRequest) &&
			typeof value.pendingRequest.id === "number" &&
			Number.isInteger(value.pendingRequest.id) &&
			value.pendingRequest.id > 0 &&
			typeof value.pendingRequest.version === "number" &&
			Number.isInteger(value.pendingRequest.version) &&
			value.pendingRequest.version > 0
		) {
			pendingRequest = {
				id: value.pendingRequest.id,
				version: value.pendingRequest.version,
			};
		}

		return {
			comment:
				typeof value.comment === "string"
					? value.comment
					: "",
			lines,
			pendingRequest,
		};
	} catch {
		removeStoredDraft(constructionSiteID);
		return null;
	}
};

const persistDraft = (
	constructionSiteID: number,
	draft: MaterialRequestWorkspaceDraft,
): void => {
	const key = draftStorageKey(constructionSiteID);
	if (key === null) {
		return;
	}

	try {
		const lines: Record<number, MaterialRequestWorkbenchLine> = {};
		for (const [materialKey, line] of Object.entries(draft.lines)) {
			if (
				(line.quant ?? 0) > 0 ||
				(line.orderImportanceID ?? 0) > 0
			) {
				lines[Number(materialKey)] = line;
			}
		}

		localStorage.setItem(
			key,
			JSON.stringify({
				comment: draft.comment,
				lines,
				pendingRequest: draft.pendingRequest,
			}),
		);
	} catch {
		// Storage availability must not prevent request processing.
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
): MaterialRequestWorkspaceDraft => {
	let draft = drafts.get(constructionSiteID);
	if (draft === undefined) {
		draft = readStoredDraft(constructionSiteID) ?? createDraft();
		drafts.set(constructionSiteID, draft);
	}
	return draft;
};

const ensureLine = (materialID: number): MaterialRequestWorkbenchLine => {
	const draft = currentDraft.value;
	if (draft === null) {
		return {
			quant: null,
			orderImportanceID: null,
		};
	}

	let line = draft.lines[materialID];
	if (line === undefined) {
		line = {
			quant: null,
			orderImportanceID: null,
		};
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

const selectedLines = computed<SelectedRequestLine[]>(() => {
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

const hasActiveImportance = (importanceID: number | null): boolean => {
	return importances.value.some(
		(importance) =>
			importance.id === importanceID && importance.is_active,
	);
};

const hasIncompleteLines = computed(() => {
	return selectedLines.value.some(
		(item) => !hasActiveImportance(item.line.orderImportanceID),
	);
});

const pendingRequest = computed(() => {
	return currentDraft.value?.pendingRequest ?? null;
});

const inputsDisabled = computed(() => {
	return submitting.value || pendingRequest.value !== null;
});

const canSubmit = computed(() => {
	if (submitting.value || props.site === null) {
		return false;
	}
	if (pendingRequest.value !== null) {
		return true;
	}
	return (
		selectedLines.value.length > 0 &&
		!hasIncompleteLines.value &&
		!catalogLoading.value &&
		!importancesLoading.value &&
		importances.value.length > 0
	);
});

const actionLabel = computed(() => {
	return pendingRequest.value === null
		? t("ConstructionManagerWorkspace.request.submit")
		: t("ConstructionManagerWorkspace.request.retrySubmit");
});

const numberFormatter = new Intl.NumberFormat("ru-RU", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 4,
});

const formatNumber = (value: number): string => {
	return numberFormatter.format(value);
};

const importanceName = (importanceID: number | null): string => {
	return (
		importances.value.find(
			(importance) => importance.id === importanceID,
		)?.name ??
		t("ConstructionManagerWorkspace.request.importanceRequired")
	);
};

const setQuantity = (materialID: number, value: number | null): void => {
	const normalized =
		typeof value === "number" && Number.isFinite(value) && value > 0
			? Math.round((value + Number.EPSILON) * 10_000) / 10_000
			: null;
	ensureLine(materialID).quant = normalized;
	persistCurrentDraft();
	requestError.value = "";
	submittedRequestID.value = null;
};

const setImportance = (materialID: number, value: number | null): void => {
	ensureLine(materialID).orderImportanceID =
		typeof value === "number" && value > 0 ? value : null;
	persistCurrentDraft();
	requestError.value = "";
	submittedRequestID.value = null;
};

const setComment = (value: string | undefined): void => {
	if (currentDraft.value !== null) {
		currentDraft.value.comment = value ?? "";
		persistCurrentDraft();
	}
};

const selectTab = (tab: RequestPanelTab): void => {
	if (!submitting.value) {
		activeTab.value = tab;
	}
};

const loadImportances = async (): Promise<void> => {
	importancesLoading.value = true;
	importancesError.value = "";
	try {
		const response = await orderImportanceApi.list({
			from: 0,
			count: 1000,
			filter: [
				{
					f: {
						is_active: {
							o: FilterOperatorParam.E,
							v: true,
						},
					},
				},
			],
			sorter: [
				{ f: "sort_order", d: "a" },
				{ f: "name", d: "a" },
			],
		});
		importances.value = response.rows;
	} catch (caught: unknown) {
		importances.value = [];
		importancesError.value = errorText(caught);
	} finally {
		importancesLoading.value = false;
	}
};

const loadCatalog = async (
	constructionSiteID: number | null,
): Promise<void> => {
	const sequence = ++catalogLoadSequence;
	catalogRows.value = [];
	selectedMaterialTypeID.value = null;
	catalogError.value = "";
	requestError.value = "";
	submittedRequestID.value = null;

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

const createRequestModel = (): MaterialRequestDocumentSave | null => {
	const site = props.site;
	const managerID = authStore.user?.id ?? 0;
	const draft = currentDraft.value;
	if (site === null || managerID <= 0 || draft === null) {
		return null;
	}

	return {
		id: 0,
		version: 0,
		date: new Date(),
		construction_site_id: site.id,
		construction_manager_id: managerID,
		comment: draft.comment.trim() || null,
		items: selectedLines.value.map(({ row, line }) => ({
			material_id: row.materialID,
			measure_unit_id: row.measureUnitID,
			quant: line.quant ?? 0,
			supplier_id: null,
			required_date: null,
			order_importance_id: line.orderImportanceID ?? 0,
			status_id: 0,
		})),
	};
};

const submitRequest = async (): Promise<void> => {
	const site = props.site;
	const draft = currentDraft.value;
	if (site === null || draft === null || !canSubmit.value) {
		return;
	}

	submitting.value = true;
	emit("submitting-change", true);
	requestError.value = "";
	submittedRequestID.value = null;
	try {
		let pending = draft.pendingRequest;
		if (pending === null) {
			const model = createRequestModel();
			if (model === null) {
				return;
			}
			const created =
				await materialRequestDocumentApi.create(model);
			pending = {
				id: created.id,
				version: created.version,
			};
			draft.pendingRequest = pending;
			persistDraft(site.id, draft);
		}

		const submitted = await materialRequestDocumentApi.submit(
			{ id: pending.id },
			pending.version,
		);
		submittedRequestID.value = submitted.id;
		draft.comment = "";
		draft.lines = {};
		draft.pendingRequest = null;
		removeStoredDraft(site.id);
	} catch (caught: unknown) {
		requestError.value = errorText(caught);
	} finally {
		submitting.value = false;
		emit("submitting-change", false);
	}
};

const requestSubmit = (): void => {
	if (!canSubmit.value) {
		return;
	}
	if (pendingRequest.value !== null) {
		void submitRequest();
		return;
	}

	confirm.require({
		header: t("MaterialRequest.actions.submitConfirmHeader"),
		message: t("MaterialRequest.actions.submitConfirmMessage"),
		icon: "pi pi-send",
		acceptLabel: t("ConstructionManagerWorkspace.request.submit"),
		rejectLabel: t("Grid.commands.cancel"),
		accept: () => {
			void submitRequest();
		},
	});
};

watch(
	() => [props.site?.id ?? null, props.inventoryRevision ?? 0] as const,
	([constructionSiteID]) => {
		void loadCatalog(constructionSiteID);
	},
	{ immediate: true },
);

onMounted(() => {
	void loadImportances();
});
</script>

<template>
	<div class="w-full max-w-6xl">
		<ConfirmDialog />

		<nav
			class="mb-4 flex gap-1 border-b border-slate-200"
			role="tablist"
			:aria-label="
				t('ConstructionManagerWorkspace.tabs.request')
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
						"ConstructionManagerWorkspace.request.tabs.new",
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
						"ConstructionManagerWorkspace.request.tabs.history",
					)
				}}
			</button>
		</nav>

		<div v-show="activeTab === 'new'">
			<div
				v-if="importancesError"
				class="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
				role="alert"
			>
				{{ importancesError }}
			</div>
			<div
				v-if="requestError"
				class="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
				role="alert"
			>
				{{ requestError }}
			</div>
			<div
				v-if="submittedRequestID !== null"
				class="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
				role="status"
			>
				{{
					t(
						"ConstructionManagerWorkspace.request.submitted",
						{
							id: submittedRequestID,
						},
					)
				}}
			</div>
			<div
				v-if="pendingRequest !== null"
				class="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
				role="status"
			>
				{{
					t(
						"ConstructionManagerWorkspace.request.pending",
						{
							id: pendingRequest.id,
						},
					)
				}}
			</div>

			<div
				class="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
			>
				<label
					for="constructionManagerMaterialType"
					class="text-sm font-medium text-slate-700"
				>
					{{
						t(
							"ConstructionManagerWorkspace.request.materialType",
						)
					}}
				</label>
				<Select
					inputId="constructionManagerMaterialType"
					v-model="selectedMaterialTypeID"
					:options="materialTypeOptions"
					optionLabel="name"
					optionValue="id"
					:placeholder="
						t(
							'ConstructionManagerWorkspace.request.allMaterialTypes',
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
					for="constructionManagerRequestComment"
					class="mb-1 block text-sm font-medium text-slate-700"
				>
					{{
						t(
							"ConstructionManagerWorkspace.request.comment",
						)
					}}
				</label>
				<Textarea
					id="constructionManagerRequestComment"
					:modelValue="
						currentDraft?.comment ?? ''
					"
					rows="2"
					class="w-full"
					:disabled="
						inputsDisabled ||
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
							'ConstructionManagerWorkspace.request.empty',
						)
					"
					:extraColumnCount="2"
					minWidth="50rem"
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
						<th
							class="w-52 px-2 py-2 text-left font-semibold text-slate-700"
						>
							{{
								t(
									"ConstructionManagerWorkspace.grid.importance",
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
									inputsDisabled
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
						<td class="px-2 py-1.5">
							<Select
								:modelValue="
									ensureLine(
										row.materialID,
									)
										.orderImportanceID
								"
								:options="
									importances
								"
								optionLabel="name"
								optionValue="id"
								:loading="
									importancesLoading
								"
								:disabled="
									inputsDisabled
								"
								size="small"
								showClear
								class="h-9 w-full"
								@update:modelValue="
									setImportance(
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
							'ConstructionManagerWorkspace.request.summary',
						)
					"
					:count="selectedLines.length"
					:actionLabel="actionLabel"
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
								"ConstructionManagerWorkspace.request.summaryEmpty",
							)
						}}
					</div>
					<div
						v-for="item in selectedLines"
						:key="item.row.materialID"
						class="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 text-sm"
					>
						<div class="min-w-0">
							<div
								class="font-medium text-slate-800"
							>
								{{
									item.row
										.materialName
								}}
							</div>
							<div
								class="mt-0.5 text-xs"
								:class="
									hasActiveImportance(
										item
											.line
											.orderImportanceID,
									)
										? 'text-slate-500'
										: 'font-medium text-red-600'
								"
							>
								{{
									importanceName(
										item
											.line
											.orderImportanceID,
									)
								}}
							</div>
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
							v-if="
								hasIncompleteLines
							"
							class="text-xs text-red-600"
						>
							{{
								t(
									"ConstructionManagerWorkspace.request.completeImportance",
								)
							}}
						</p>
						<p
							v-else
							class="text-xs text-slate-500"
						>
							{{
								t(
									"ConstructionManagerWorkspace.request.clearAfterSuccess",
								)
							}}
						</p>
					</template>
				</MaterialWorkbenchSummary>
			</div>
		</div>

		<MaterialRequestHistoryGrid
			v-if="activeTab === 'history' && props.site !== null"
			:key="props.site.id"
			:constructionSiteID="props.site.id"
		/>
	</div>
</template>
