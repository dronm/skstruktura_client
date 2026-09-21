<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Select from "primevue/select";

import { errorText } from "@katren/vue-collection-lib";
import { APIError } from "@katren/vue-collection-lib/api/Conn";

import { constructionManagerWorkspaceApi } from "@/api/constructionManagerWorkspace";
import MaterialStatusHistoryGrid from "@/components/constructionManager/MaterialStatusHistoryGrid.vue";
import DocumentDateTimePicker from "@/components/documents/DocumentDateTimePicker.vue";
import type { ConstructionManagerMaterialStatusCurrent } from "@/types/constructionManagerMaterialStatus";
import type { MaterialStatusType } from "@/types/enums/materialStatusType.gen";
import type { MaterialBalanceConstructionSite } from "@/types/materialBalance";

interface MaterialTypeFilterOption {
	id: number;
	name: string;
}

type MaterialStatusPanelTab = "current" | "history";

const props = defineProps<{
	site: MaterialBalanceConstructionSite | null;
	inventoryRevision?: number;
}>();

const emit = defineEmits<{
	"submitting-change": [value: boolean];
}>();

const { t } = useI18n();
const activeTab = ref<MaterialStatusPanelTab>("current");
const rows = ref<ConstructionManagerMaterialStatusCurrent[]>([]);
const historyMaterialTypeOptions = ref<MaterialTypeFilterOption[]>([]);
const selectedMaterialTypeID = ref<number | null>(null);
const loading = ref(false);
const historyTypesLoading = ref(false);
const loadError = ref("");
const historyTypesError = ref("");
const submitting = ref(false);
const dialogVisible = ref(false);
const selectedRow = ref<ConstructionManagerMaterialStatusCurrent | null>(null);
const changeDate = ref<Date | undefined>(undefined);
const dialogError = ref("");
const dialogRequiresRefresh = ref(false);
const dialogRefreshing = ref(false);
const historyRevision = ref(0);
const successMessage = ref("");
let loadSequence = 0;
let historyTypesLoadSequence = 0;
let watchedSiteID: number | null | undefined;

const reverseStatus = (status: MaterialStatusType): MaterialStatusType => {
	return status === "at_work" ? "on_maintenance" : "at_work";
};

const targetStatus = computed<MaterialStatusType | null>(() => {
	if (selectedRow.value === null) {
		return null;
	}

	return reverseStatus(selectedRow.value.status);
});

const materialTypeOptions = computed<MaterialTypeFilterOption[]>(() => {
	const options = new Map<number, MaterialTypeFilterOption>();
	for (const option of historyMaterialTypeOptions.value) {
		options.set(option.id, option);
	}
	for (const row of rows.value) {
		if (!options.has(row.material_type_id)) {
			options.set(row.material_type_id, {
				id: row.material_type_id,
				name: row.material_type_name,
			});
		}
	}

	return Array.from(options.values()).sort((left, right) =>
		left.name.localeCompare(right.name, "ru"),
	);
});

const filteredRows = computed<ConstructionManagerMaterialStatusCurrent[]>(
	() => {
		const materialTypeID = selectedMaterialTypeID.value;
		return materialTypeID === null
			? rows.value
			: rows.value.filter(
					(row) =>
						row.material_type_id ===
						materialTypeID,
				);
	},
);

const canSubmit = computed(() => {
	const date = changeDate.value;
	return (
		!submitting.value &&
		!dialogRequiresRefresh.value &&
		!dialogRefreshing.value &&
		props.site !== null &&
		selectedRow.value !== null &&
		targetStatus.value !== null &&
		date instanceof Date &&
		!Number.isNaN(date.getTime())
	);
});

const statusLabel = (status: MaterialStatusType): string => {
	return t(`MaterialStatusType.${status}`);
};

const statusPillClass = (status: MaterialStatusType): string => {
	return status === "on_maintenance"
		? "border-rose-200 bg-rose-100 text-rose-800 hover:bg-rose-200"
		: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100";
};

const closeDialog = (): void => {
	if (submitting.value || dialogRefreshing.value) {
		return;
	}

	dialogVisible.value = false;
	selectedRow.value = null;
	changeDate.value = undefined;
	dialogError.value = "";
	dialogRequiresRefresh.value = false;
	dialogRefreshing.value = false;
};

const openDialog = (row: ConstructionManagerMaterialStatusCurrent): void => {
	selectedRow.value = row;
	changeDate.value = new Date();
	dialogError.value = "";
	dialogRequiresRefresh.value = false;
	successMessage.value = "";
	dialogVisible.value = true;
};

const selectTab = (tab: MaterialStatusPanelTab): void => {
	if (!submitting.value) {
		activeTab.value = tab;
	}
};

const focusTab = (tab: MaterialStatusPanelTab): void => {
	selectTab(tab);
	requestAnimationFrame(() => {
		document.getElementById(
			tab === "current"
				? "constructionManagerStatusCurrentTab"
				: "constructionManagerStatusHistoryTab",
		)?.focus();
	});
};

const handleTabKeydown = (event: KeyboardEvent): void => {
	if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
		event.preventDefault();
		focusTab(activeTab.value === "current" ? "history" : "current");
	} else if (event.key === "Home") {
		event.preventDefault();
		focusTab("current");
	} else if (event.key === "End") {
		event.preventDefault();
		focusTab("history");
	}
};

const loadCurrent = async (
	constructionSiteID: number | null,
	resetFilter: boolean,
): Promise<boolean> => {
	const sequence = ++loadSequence;
	let loaded = false;
	loadError.value = "";
	if (resetFilter) {
		rows.value = [];
		selectedMaterialTypeID.value = null;
		successMessage.value = "";
	}

	if (constructionSiteID === null) {
		loading.value = false;
		return true;
	}

	loading.value = true;
	try {
		const loadedRows: ConstructionManagerMaterialStatusCurrent[] =
			[];
		const pageSize = 100;
		let from = 0;

		while (true) {
			const response =
				await constructionManagerWorkspaceApi.materialStatusesCurrent(
					constructionSiteID,
					null,
					{
						from,
						count: pageSize,
					},
				);
			if (sequence !== loadSequence) {
				return false;
			}

			loadedRows.push(...response.rows);
			if (response.rows.length < pageSize) {
				break;
			}
			from += response.rows.length;
		}

		rows.value = loadedRows;
		loaded = true;
		if (
			selectedMaterialTypeID.value !== null &&
			!loadedRows.some(
				(row) =>
					row.material_type_id ===
					selectedMaterialTypeID.value,
			) &&
			!historyMaterialTypeOptions.value.some(
				(option) =>
					option.id ===
					selectedMaterialTypeID.value,
			)
		) {
			selectedMaterialTypeID.value = null;
		}
	} catch (caught: unknown) {
		if (sequence === loadSequence) {
			loadError.value = errorText(caught);
		}
	} finally {
		if (sequence === loadSequence) {
			loading.value = false;
		}
	}

	return loaded;
};

const loadHistoryMaterialTypes = async (
	constructionSiteID: number | null,
	resetOptions = false,
): Promise<void> => {
	const sequence = ++historyTypesLoadSequence;
	if (resetOptions || constructionSiteID === null) {
		historyMaterialTypeOptions.value = [];
	}
	historyTypesError.value = "";
	if (constructionSiteID === null) {
		historyTypesLoading.value = false;
		return;
	}

	historyTypesLoading.value = true;
	try {
		const options = new Map<number, MaterialTypeFilterOption>();
		const pageSize = 100;
		let from = 0;

		while (true) {
			const response =
				await constructionManagerWorkspaceApi.materialStatusHistory(
					constructionSiteID,
					null,
					{
						from,
						count: pageSize,
					},
				);
			if (sequence !== historyTypesLoadSequence) {
				return;
			}

			for (const row of response.rows) {
				options.set(row.material_type_id, {
					id: row.material_type_id,
					name: row.material_type_name,
				});
			}
			if (response.rows.length < pageSize) {
				break;
			}
			from += response.rows.length;
		}

		historyMaterialTypeOptions.value = Array.from(options.values());
	} catch (caught: unknown) {
		if (sequence === historyTypesLoadSequence) {
			historyTypesError.value = errorText(caught);
		}
	} finally {
		if (sequence === historyTypesLoadSequence) {
			historyTypesLoading.value = false;
		}
	}
};

const retryCurrentLoad = (): void => {
	void loadCurrent(props.site?.id ?? null, false);
};

const retryHistoryMaterialTypes = (): void => {
	void loadHistoryMaterialTypes(props.site?.id ?? null);
};

const refreshDialogStatus = async (): Promise<void> => {
	const constructionSiteID = props.site?.id ?? null;
	const materialID = selectedRow.value?.material_id ?? null;
	if (constructionSiteID === null || materialID === null) {
		return;
	}

	dialogRefreshing.value = true;
	try {
		const loaded = await loadCurrent(constructionSiteID, false);
		if (!loaded || props.site?.id !== constructionSiteID) {
			return;
		}

		const refreshedRow = rows.value.find(
			(row) => row.material_id === materialID,
		);
		if (refreshedRow === undefined) {
			dialogError.value = t(
				"ConstructionManagerWorkspace.status.materialUnavailable",
			);
			return;
		}

		selectedRow.value = refreshedRow;
		changeDate.value = new Date();
		dialogRequiresRefresh.value = false;
	} finally {
		dialogRefreshing.value = false;
	}
};

const submitStatusChange = async (): Promise<void> => {
	const site = props.site;
	const row = selectedRow.value;
	const date = changeDate.value;
	const newStatus = targetStatus.value;
	if (
		site === null ||
		row === null ||
		date === undefined ||
		newStatus === null ||
		!canSubmit.value
	) {
		return;
	}

	submitting.value = true;
	emit("submitting-change", true);
	dialogError.value = "";
	successMessage.value = "";
	try {
		await constructionManagerWorkspaceApi.createMaterialStatus({
			construction_site_id: site.id,
			material_id: row.material_id,
			created_at: date,
			expected_status_record_id: row.status_record_id,
			expected_status: row.status,
			target_status: newStatus,
		});

		successMessage.value = t(
			"ConstructionManagerWorkspace.status.updated",
			{
				material: row.material_name,
				status: statusLabel(newStatus),
			},
		);
		dialogVisible.value = false;
		selectedRow.value = null;
		changeDate.value = undefined;
		historyRevision.value += 1;
		await loadCurrent(site.id, false);
	} catch (caught: unknown) {
		dialogError.value = errorText(caught);
		if (caught instanceof APIError && caught.status === 409) {
			dialogRequiresRefresh.value = true;
			await refreshDialogStatus();
		}
	} finally {
		submitting.value = false;
		emit("submitting-change", false);
	}
};

watch(
	() => [props.site?.id ?? null, props.inventoryRevision ?? 0] as const,
	([constructionSiteID]) => {
		const siteChanged =
			watchedSiteID === undefined ||
			watchedSiteID !== constructionSiteID;
		watchedSiteID = constructionSiteID;
		closeDialog();
		void loadCurrent(constructionSiteID, siteChanged);
		if (siteChanged) {
			void loadHistoryMaterialTypes(constructionSiteID, true);
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div class="w-full max-w-4xl">
		<nav
			class="mb-4 flex gap-1 border-b border-slate-200"
			role="tablist"
			:aria-label="
				t('ConstructionManagerWorkspace.tabs.status')
			"
		>
			<button
				id="constructionManagerStatusCurrentTab"
				type="button"
				role="tab"
				class="border-b-2 px-4 py-2 text-sm font-medium transition-colors"
				:class="
					activeTab === 'current'
						? 'border-cyan-700 text-cyan-800'
						: 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
				"
				:aria-selected="activeTab === 'current'"
				aria-controls="constructionManagerStatusCurrentPanel"
				:tabindex="activeTab === 'current' ? 0 : -1"
				:disabled="submitting"
				@click="selectTab('current')"
				@keydown="handleTabKeydown"
			>
				{{
					t(
						"ConstructionManagerWorkspace.status.tabs.current",
					)
				}}
			</button>
			<button
				id="constructionManagerStatusHistoryTab"
				type="button"
				role="tab"
				class="border-b-2 px-4 py-2 text-sm font-medium transition-colors"
				:class="
					activeTab === 'history'
						? 'border-cyan-700 text-cyan-800'
						: 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
				"
				:aria-selected="activeTab === 'history'"
				aria-controls="constructionManagerStatusHistoryPanel"
				:tabindex="activeTab === 'history' ? 0 : -1"
				:disabled="submitting"
				@click="selectTab('history')"
				@keydown="handleTabKeydown"
			>
				{{
					t(
						"ConstructionManagerWorkspace.status.tabs.history",
					)
				}}
			</button>
		</nav>

		<div
			class="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
		>
			<label
				for="constructionManagerStatusMaterialType"
				class="text-sm font-medium text-slate-700"
			>
				{{
					t(
						"ConstructionManagerWorkspace.status.materialType",
					)
				}}
			</label>
			<Select
				inputId="constructionManagerStatusMaterialType"
				v-model="selectedMaterialTypeID"
				:options="materialTypeOptions"
				optionLabel="name"
				optionValue="id"
				:placeholder="
					t(
						'ConstructionManagerWorkspace.status.allMaterialTypes',
					)
				"
				:disabled="
					loading ||
					historyTypesLoading ||
					submitting
				"
				showClear
				class="w-full sm:w-72"
			/>
			<div
				v-if="historyTypesError"
				class="flex basis-full items-center justify-between gap-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"
				role="alert"
			>
				<span>
					{{
						t(
							"ConstructionManagerWorkspace.status.materialTypesError",
						)
					}}:
					{{ historyTypesError }}
				</span>
				<button
					type="button"
					class="shrink-0 rounded-md border border-amber-300 bg-white px-2.5 py-1 font-medium text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
					:disabled="historyTypesLoading"
					@click="retryHistoryMaterialTypes"
				>
					{{
						t(
							"ConstructionManagerWorkspace.status.retry",
						)
					}}
				</button>
			</div>
		</div>

		<div
			id="constructionManagerStatusCurrentPanel"
			v-show="activeTab === 'current'"
			role="tabpanel"
			aria-labelledby="constructionManagerStatusCurrentTab"
		>
			<div
				v-if="successMessage"
				class="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
				role="status"
			>
				{{ successMessage }}
			</div>

			<div
				v-if="loadError"
				class="mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
				role="alert"
			>
				<span>{{ loadError }}</span>
				<button
					type="button"
					class="shrink-0 rounded-md border border-red-300 bg-white px-2.5 py-1 font-medium text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
					:disabled="loading"
					@click="retryCurrentLoad"
				>
					{{
						t(
							"ConstructionManagerWorkspace.status.retry",
						)
					}}
				</button>
			</div>

			<div
				class="overflow-hidden rounded-lg border border-slate-200 bg-white"
			>
				<div
					v-if="loading"
					class="flex min-h-40 items-center justify-center text-sm text-slate-500"
				>
					<i
						class="pi pi-spin pi-spinner mr-2"
						aria-hidden="true"
					/>
					{{ t("Grid.loading") }}
				</div>
				<div
					v-else-if="filteredRows.length === 0"
					class="px-4 py-12 text-center text-sm text-slate-500"
				>
					{{
						t(
							"ConstructionManagerWorkspace.status.empty",
						)
					}}
				</div>
				<div v-else class="overflow-x-auto">
					<table
						class="w-full min-w-[34rem] table-fixed"
					>
						<thead class="bg-slate-100">
							<tr>
								<th
									scope="col"
									class="px-4 py-2.5 text-left text-sm font-semibold text-slate-700"
								>
									{{
										t(
											"ConstructionManagerWorkspace.status.columns.material",
										)
									}}
								</th>
								<th
									scope="col"
									class="w-52 px-4 py-2.5 text-center text-sm font-semibold text-slate-700"
								>
									{{
										t(
											"ConstructionManagerWorkspace.status.columns.status",
										)
									}}
								</th>
							</tr>
						</thead>
						<tbody
							class="divide-y divide-slate-200"
						>
							<tr
								v-for="row in filteredRows"
								:key="
									row.material_id
								"
								:class="
									row.status ===
									'on_maintenance'
										? 'bg-rose-50/60'
										: 'bg-white'
								"
							>
								<td
									class="px-4 py-3 text-sm font-medium text-slate-800"
								>
									{{
										row.material_name
									}}
								</td>
								<td
									class="px-4 py-2 text-center"
								>
									<button
										type="button"
										class="inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
										:class="
											statusPillClass(
												row.status,
											)
										"
										:aria-label="
											t(
												'ConstructionManagerWorkspace.status.changeAriaLabel',
												{
													material: row.material_name,
													current: statusLabel(
														row.status,
													),
													target: statusLabel(
														reverseStatus(
															row.status,
														),
													),
												},
											)
										"
										:disabled="
											submitting
										"
										@click="
											openDialog(
												row,
											)
										"
									>
										{{
											statusLabel(
												row.status,
											)
										}}
										<i
											class="pi pi-pencil ml-2 text-xs"
											aria-hidden="true"
										/>
									</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<div
			id="constructionManagerStatusHistoryPanel"
			v-if="activeTab === 'history' && props.site !== null"
			role="tabpanel"
			aria-labelledby="constructionManagerStatusHistoryTab"
		>
			<MaterialStatusHistoryGrid
				:key="`${props.site.id}:${selectedMaterialTypeID ?? 'all'}:${historyRevision}`"
				:constructionSiteID="props.site.id"
				:materialTypeID="selectedMaterialTypeID"
			/>
		</div>

		<Dialog
			v-model:visible="dialogVisible"
			modal
			:header="
				t(
					'ConstructionManagerWorkspace.status.dialog.title',
				)
			"
			:closable="!submitting && !dialogRefreshing"
			:dismissableMask="!submitting && !dialogRefreshing"
			:style="{
				width: '34rem',
				maxWidth: 'calc(100vw - 2rem)',
			}"
			@hide="closeDialog"
		>
			<div v-if="selectedRow !== null" class="space-y-4">
				<div
					v-if="dialogError"
					class="flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
					role="alert"
				>
					<span>{{ dialogError }}</span>
					<button
						v-if="dialogRequiresRefresh"
						type="button"
						class="shrink-0 rounded-md border border-red-300 bg-white px-2.5 py-1 font-medium text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
						:disabled="
							dialogRefreshing ||
							submitting
						"
						@click="refreshDialogStatus"
					>
						{{
							t(
								"ConstructionManagerWorkspace.status.refreshData",
							)
						}}
					</button>
				</div>

				<div
					class="grid grid-cols-[minmax(8rem,auto)_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-lg bg-slate-50 p-4 text-sm"
				>
					<div class="text-slate-500">
						{{
							t(
								"ConstructionManagerWorkspace.status.columns.material",
							)
						}}
					</div>
					<div
						class="font-semibold text-slate-900"
					>
						{{ selectedRow.material_name }}
					</div>
					<div class="text-slate-500">
						{{
							t(
								"ConstructionManagerWorkspace.status.dialog.currentStatus",
							)
						}}
					</div>
					<div>
						<span
							class="inline-flex rounded-full border px-3 py-1 font-semibold"
							:class="
								statusPillClass(
									selectedRow.status,
								)
							"
						>
							{{
								statusLabel(
									selectedRow.status,
								)
							}}
						</span>
					</div>
					<div class="text-slate-500">
						{{
							t(
								"ConstructionManagerWorkspace.status.dialog.newStatus",
							)
						}}
					</div>
					<div>
						<span
							v-if="
								targetStatus !==
								null
							"
							class="inline-flex rounded-full border px-3 py-1 font-semibold"
							:class="
								statusPillClass(
									targetStatus,
								)
							"
						>
							{{
								statusLabel(
									targetStatus,
								)
							}}
						</span>
					</div>
				</div>

				<div>
					<label
						for="constructionManagerStatusDate"
						class="mb-1 block text-sm font-medium text-slate-700"
					>
						{{
							t(
								"ConstructionManagerWorkspace.status.dialog.date",
							)
						}}
					</label>
					<DocumentDateTimePicker
						inputId="constructionManagerStatusDate"
						v-model="changeDate"
						:disabled="
							submitting ||
							dialogRefreshing
						"
						required
					/>
				</div>
			</div>

			<template #footer>
				<Button
					:label="t('Grid.commands.cancel')"
					severity="secondary"
					text
					:disabled="
						submitting || dialogRefreshing
					"
					@click="closeDialog"
				/>
				<Button
					:label="
						t(
							'ConstructionManagerWorkspace.status.dialog.submit',
						)
					"
					icon="pi pi-check"
					:loading="submitting"
					:disabled="!canSubmit"
					@click="submitStatusChange"
				/>
			</template>
		</Dialog>
	</div>
</template>
