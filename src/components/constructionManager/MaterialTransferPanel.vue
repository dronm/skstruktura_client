<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import ConfirmDialog from "primevue/confirmdialog";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import { useConfirm } from "primevue/useconfirm";

import { errorText } from "@katren/vue-collection-lib";

import { constructionManagerWorkspaceApi } from "@/api/constructionManagerWorkspace";
import GroupedMaterialGrid from "@/components/constructionManager/GroupedMaterialGrid.vue";
import MaterialTransferHistoryGrid from "@/components/constructionManager/MaterialTransferHistoryGrid.vue";
import MaterialWorkbenchSummary from "@/components/constructionManager/MaterialWorkbenchSummary.vue";
import { useAuthStore } from "@/stores/useAuthStore";
import type {
	MaterialTransferWorkbenchLine,
	MaterialTransferWorkspaceDraft,
	MaterialWorkbenchRow,
} from "@/types/constructionManagerWorkspace";
import { materialBalanceRowToWorkbenchRow } from "@/types/constructionManagerWorkspace";
import type { MaterialBalanceConstructionSite } from "@/types/materialBalance";
import type { MaterialTransferDocumentSave } from "@/types/materialDocuments";

interface SelectedTransferLine {
	row: MaterialWorkbenchRow;
	line: MaterialTransferWorkbenchLine;
}

interface MaterialTypeFilterOption {
	id: number;
	name: string;
}

interface TransferDestinationOption extends MaterialBalanceConstructionSite {
	disabled: boolean;
}

type TransferPanelTab = "new" | "history";

const props = defineProps<{
	site: MaterialBalanceConstructionSite | null;
	inventoryRevision?: number;
}>();

const emit = defineEmits<{
	"submitting-change": [value: boolean];
	"inventory-updated": [];
}>();

const confirmGroup = "construction-manager-transfer";
const { t } = useI18n();
const confirm = useConfirm();
const authStore = useAuthStore();
const drafts = reactive(new Map<number, MaterialTransferWorkspaceDraft>());
const catalogRows = ref<MaterialWorkbenchRow[]>([]);
const destinations = ref<MaterialBalanceConstructionSite[]>([]);
const currentDraft = ref<MaterialTransferWorkspaceDraft | null>(null);
const catalogLoading = ref(false);
const destinationsLoading = ref(false);
const submitting = ref(false);
const catalogError = ref("");
const destinationsError = ref("");
const transferError = ref("");
const submittedTransferID = ref<number | null>(null);
const activeTab = ref<TransferPanelTab>("new");
const selectedMaterialTypeID = ref<number | null>(null);
let catalogLoadSequence = 0;
let watchedSiteID: number | null | undefined;
let ignoredInventoryRevision: number | null = null;

const createDraft = (): MaterialTransferWorkspaceDraft => ({
	destinationConstructionSiteID: null,
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
		? `construction-manager-transfer-draft:${userID}:${constructionSiteID}`
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
		// Storage availability must not prevent transfer processing.
	}
};

const readStoredDraft = (
	constructionSiteID: number,
): MaterialTransferWorkspaceDraft | null => {
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

		const lines: Record<number, MaterialTransferWorkbenchLine> = {};
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

		const destinationConstructionSiteID =
			typeof value.destinationConstructionSiteID ===
				"number" &&
			Number.isInteger(value.destinationConstructionSiteID) &&
			value.destinationConstructionSiteID > 0
				? value.destinationConstructionSiteID
				: null;

		return {
			destinationConstructionSiteID,
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
	draft: MaterialTransferWorkspaceDraft,
): void => {
	const key = draftStorageKey(constructionSiteID);
	if (key === null) {
		return;
	}

	try {
		const lines: Record<number, MaterialTransferWorkbenchLine> = {};
		for (const [materialKey, line] of Object.entries(draft.lines)) {
			if ((line.quant ?? 0) > 0) {
				lines[Number(materialKey)] = line;
			}
		}

		localStorage.setItem(
			key,
			JSON.stringify({
				destinationConstructionSiteID:
					draft.destinationConstructionSiteID,
				comment: draft.comment,
				lines,
			}),
		);
	} catch {
		// Storage availability must not prevent transfer processing.
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
): MaterialTransferWorkspaceDraft => {
	let draft = drafts.get(constructionSiteID);
	if (draft === undefined) {
		draft = readStoredDraft(constructionSiteID) ?? createDraft();
		drafts.set(constructionSiteID, draft);
	}
	return draft;
};

const ensureLine = (materialID: number): MaterialTransferWorkbenchLine => {
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

const destinationOptions = computed<TransferDestinationOption[]>(() => {
	const sourceConstructionSiteID = props.site?.id ?? null;
	return destinations.value.map((site) => ({
		...site,
		disabled: site.id === sourceConstructionSiteID,
	}));
});

const selectedDestination = computed<
	MaterialBalanceConstructionSite | undefined
>(() => {
	const destinationConstructionSiteID =
		currentDraft.value?.destinationConstructionSiteID ?? null;
	return destinations.value.find(
		(site) => site.id === destinationConstructionSiteID,
	);
});

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

const selectedLines = computed<SelectedTransferLine[]>(() => {
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
	const sourceConstructionSiteID = props.site?.id ?? null;
	const destinationConstructionSiteID =
		selectedDestination.value?.id ?? null;
	return (
		!submitting.value &&
		sourceConstructionSiteID !== null &&
		destinationConstructionSiteID !== null &&
		destinationConstructionSiteID !== sourceConstructionSiteID &&
		selectedLines.value.length > 0 &&
		!catalogLoading.value &&
		!destinationsLoading.value
	);
});

const numberFormatter = new Intl.NumberFormat("ru-RU", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 4,
});

const formatNumber = (value: number): string => {
	return numberFormatter.format(value);
};

const clearSubmissionFeedback = (): void => {
	transferError.value = "";
	submittedTransferID.value = null;
};

const setDestination = (value: number | null): void => {
	if (currentDraft.value === null) {
		return;
	}

	currentDraft.value.destinationConstructionSiteID =
		typeof value === "number" &&
		Number.isInteger(value) &&
		value > 0
			? value
			: null;
	persistCurrentDraft();
	clearSubmissionFeedback();
};

const setQuantity = (materialID: number, value: number | null): void => {
	const normalized =
		typeof value === "number" && Number.isFinite(value) && value > 0
			? Math.round((value + Number.EPSILON) * 10_000) / 10_000
			: null;
	ensureLine(materialID).quant = normalized;
	persistCurrentDraft();
	clearSubmissionFeedback();
};

const setComment = (value: string | undefined): void => {
	if (currentDraft.value !== null) {
		currentDraft.value.comment = value ?? "";
		persistCurrentDraft();
		clearSubmissionFeedback();
	}
};

const selectTab = (tab: TransferPanelTab): void => {
	if (!submitting.value) {
		activeTab.value = tab;
	}
};

const loadDestinations = async (): Promise<void> => {
	destinationsLoading.value = true;
	destinationsError.value = "";
	try {
		destinations.value =
			await constructionManagerWorkspaceApi.transferDestinations();

		const destinationConstructionSiteID =
			currentDraft.value?.destinationConstructionSiteID ??
			null;
		if (
			destinationConstructionSiteID !== null &&
			!destinations.value.some(
				(site) =>
					site.id ===
					destinationConstructionSiteID,
			)
		) {
			currentDraft.value!.destinationConstructionSiteID =
				null;
			persistCurrentDraft();
		}
	} catch (caught: unknown) {
		destinations.value = [];
		destinationsError.value = errorText(caught);
	} finally {
		destinationsLoading.value = false;
	}
};

const loadCatalog = async (
	constructionSiteID: number | null,
	resetSubmissionFeedback: boolean,
): Promise<void> => {
	const sequence = ++catalogLoadSequence;
	catalogRows.value = [];
	selectedMaterialTypeID.value = null;
	catalogError.value = "";
	if (resetSubmissionFeedback) {
		clearSubmissionFeedback();
	}

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

const createTransferModel = (): MaterialTransferDocumentSave | null => {
	const site = props.site;
	const destination = selectedDestination.value;
	const draft = currentDraft.value;
	if (site === null || destination === undefined || draft === null) {
		return null;
	}

	return {
		id: 0,
		version: 0,
		date: new Date(),
		source_construction_site_id: site.id,
		destination_construction_site_id: destination.id,
		comment: draft.comment.trim() || null,
		items: selectedLines.value.map(({ row, line }) => ({
			material_id: row.materialID,
			measure_unit_id: row.measureUnitID,
			quant: line.quant ?? 0,
		})),
	};
};

const submitTransfer = async (): Promise<void> => {
	const site = props.site;
	const draft = currentDraft.value;
	const model = createTransferModel();
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
	transferError.value = "";
	submittedTransferID.value = null;
	try {
		const created =
			await constructionManagerWorkspaceApi.createMaterialTransfer(
				model,
			);
		draft.destinationConstructionSiteID = null;
		draft.comment = "";
		draft.lines = {};
		removeStoredDraft(site.id);
		ignoredInventoryRevision = (props.inventoryRevision ?? 0) + 1;
		emit("inventory-updated");
		await loadCatalog(site.id, false);
		submittedTransferID.value = created.id;
	} catch (caught: unknown) {
		transferError.value = errorText(caught);
	} finally {
		submitting.value = false;
		emit("submitting-change", false);
	}
};

const requestSubmit = (): void => {
	const destination = selectedDestination.value;
	if (!canSubmit.value || destination === undefined) {
		return;
	}

	confirm.require({
		group: confirmGroup,
		header: t(
			"ConstructionManagerWorkspace.transfer.confirmHeader",
		),
		message: t(
			"ConstructionManagerWorkspace.transfer.confirmMessage",
			{ destination: destination.name },
		),
		icon: "pi pi-exclamation-triangle",
		acceptLabel: t("ConstructionManagerWorkspace.transfer.submit"),
		rejectLabel: t("Grid.commands.cancel"),
		accept: () => {
			void submitTransfer();
		},
	});
};

watch(
	() => [props.site?.id ?? null, props.inventoryRevision ?? 0] as const,
	([constructionSiteID, inventoryRevision]) => {
		const siteChanged =
			watchedSiteID === undefined ||
			watchedSiteID !== constructionSiteID;
		watchedSiteID = constructionSiteID;

		if (
			!siteChanged &&
			ignoredInventoryRevision === inventoryRevision
		) {
			ignoredInventoryRevision = null;
			return;
		}

		void loadCatalog(constructionSiteID, siteChanged);
	},
	{ immediate: true },
);

onMounted(() => {
	void loadDestinations();
});
</script>

<template>
	<div class="w-full max-w-6xl">
		<ConfirmDialog :group="confirmGroup" />

		<nav
			class="mb-4 flex gap-1 border-b border-slate-200"
			role="tablist"
			:aria-label="
				t('ConstructionManagerWorkspace.tabs.transfer')
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
						"ConstructionManagerWorkspace.transfer.tabs.new",
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
						"ConstructionManagerWorkspace.transfer.tabs.history",
					)
				}}
			</button>
		</nav>

		<div v-show="activeTab === 'new'">
			<div
				v-if="transferError"
				class="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
				role="alert"
			>
				{{ transferError }}
			</div>
			<div
				v-if="submittedTransferID !== null"
				class="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
				role="status"
			>
				{{
					t(
						"ConstructionManagerWorkspace.transfer.submitted",
						{ id: submittedTransferID },
					)
				}}
			</div>

			<div
				class="mb-3 rounded-lg border border-slate-200 bg-white p-4"
			>
				<div
					class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]"
				>
					<div>
						<label
							for="constructionManagerTransferDestination"
							class="mb-1 block text-sm font-medium text-slate-700"
						>
							{{
								t(
									"ConstructionManagerWorkspace.transfer.destination",
								)
							}}
						</label>
						<Select
							inputId="constructionManagerTransferDestination"
							:modelValue="
								currentDraft?.destinationConstructionSiteID ??
								null
							"
							:options="
								destinationOptions
							"
							optionLabel="name"
							optionValue="id"
							optionDisabled="disabled"
							:placeholder="
								t(
									'ConstructionManagerWorkspace.transfer.destinationPlaceholder',
								)
							"
							:loading="
								destinationsLoading
							"
							:disabled="
								submitting ||
								props.site ===
									null
							"
							filter
							showClear
							class="w-full"
							@update:modelValue="
								setDestination
							"
						/>
						<p
							v-if="destinationsError"
							class="mt-1 text-sm text-red-700"
							role="alert"
						>
							{{ destinationsError }}
						</p>
					</div>

					<div>
						<label
							for="constructionManagerTransferComment"
							class="mb-1 block text-sm font-medium text-slate-700"
						>
							{{
								t(
									"ConstructionManagerWorkspace.transfer.comment",
								)
							}}
						</label>
						<Textarea
							id="constructionManagerTransferComment"
							:modelValue="
								currentDraft?.comment ??
								''
							"
							rows="2"
							class="w-full"
							:disabled="
								submitting ||
								props.site ===
									null
							"
							@update:modelValue="
								setComment
							"
						/>
					</div>
				</div>
			</div>

			<div
				class="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
			>
				<label
					for="constructionManagerTransferMaterialType"
					class="text-sm font-medium text-slate-700"
				>
					{{
						t(
							"ConstructionManagerWorkspace.transfer.materialType",
						)
					}}
				</label>
				<Select
					inputId="constructionManagerTransferMaterialType"
					v-model="selectedMaterialTypeID"
					:options="materialTypeOptions"
					optionLabel="name"
					optionValue="id"
					:placeholder="
						t(
							'ConstructionManagerWorkspace.transfer.allMaterialTypes',
						)
					"
					:disabled="submitting"
					showClear
					class="w-full sm:w-72"
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
							'ConstructionManagerWorkspace.transfer.empty',
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
							'ConstructionManagerWorkspace.transfer.summary',
						)
					"
					:count="selectedLines.length"
					:actionLabel="
						t(
							'ConstructionManagerWorkspace.transfer.submit',
						)
					"
					actionIcon="pi pi-arrow-right-arrow-left"
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
								"ConstructionManagerWorkspace.transfer.summaryEmpty",
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
							v-if="
								props.site !==
									null &&
								selectedDestination
							"
							class="mb-2 text-xs font-medium text-slate-700"
						>
							{{ props.site.name }}
							<i
								class="pi pi-arrow-right mx-1"
								aria-hidden="true"
							/>
							{{
								selectedDestination.name
							}}
						</p>
						<p
							class="text-xs text-slate-500"
						>
							{{
								t(
									"ConstructionManagerWorkspace.transfer.clearAfterSuccess",
								)
							}}
						</p>
					</template>
				</MaterialWorkbenchSummary>
			</div>
		</div>

		<MaterialTransferHistoryGrid
			v-if="activeTab === 'history' && props.site !== null"
			:key="props.site.id"
			:constructionSiteID="props.site.id"
		/>
	</div>
</template>
