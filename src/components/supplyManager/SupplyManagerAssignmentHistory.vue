<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import Button from "primevue/button";
import ProgressSpinner from "primevue/progressspinner";
import Select from "primevue/select";

import { errorText } from "@katren/vue-collection-lib";

import { supplyManagerWorkspaceApi } from "@/api/supplyManagerWorkspace";
import type { MaterialBalanceConstructionSite } from "@/types/materialBalance";
import type {
	MaterialRequestSupplierAssignmentHistory,
	MaterialRequestSupplierAssignmentHistoryItem,
	SupplyManagerReference,
} from "@/types/supplyManagerWorkspace";

interface HistorySupplierGroup {
	supplierID: number;
	supplier: SupplyManagerReference;
	items: MaterialRequestSupplierAssignmentHistoryItem[];
}

const PAGE_SIZE = 30;

const props = withDefaults(
	defineProps<{
		revision?: number;
		siteFilterDisabled?: boolean;
	}>(),
	{
		revision: 0,
		siteFilterDisabled: false,
	},
);

const constructionSiteID = defineModel<number | null>("constructionSiteID", {
	default: null,
});

const { t } = useI18n();
const rows = ref<MaterialRequestSupplierAssignmentHistory[]>([]);
const sites = ref<MaterialBalanceConstructionSite[]>([]);
const total = ref(0);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref("");
const sitesError = ref("");
const loadedOffset = ref(0);
let loadSequence = 0;

const numberFormatter = new Intl.NumberFormat("ru-RU", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 4,
});

const formatNumber = (value: number): string => {
	return numberFormatter.format(value);
};

const formatDateTime = (value: Date): string => {
	return value.toLocaleString("ru-RU");
};

const formatDate = (value: Date | null): string => {
	return value?.toLocaleDateString("ru-RU") ?? "—";
};

const supplierGroups = (
	items: MaterialRequestSupplierAssignmentHistoryItem[],
): HistorySupplierGroup[] => {
	const groups = new Map<number, HistorySupplierGroup>();
	for (const item of items) {
		let group = groups.get(item.supplier_id);
		if (group === undefined) {
			group = {
				supplierID: item.supplier_id,
				supplier: item.supplier,
				items: [],
			};
			groups.set(item.supplier_id, group);
		}
		group.items.push(item);
	}

	return Array.from(groups.values()).sort((left, right) =>
		left.supplier.descr.localeCompare(right.supplier.descr, "ru"),
	);
};

const load = async (reset: boolean): Promise<void> => {
	if (!reset && (loading.value || loadingMore.value)) {
		return;
	}
	const sequence = ++loadSequence;
	if (reset) {
		loading.value = true;
		loadingMore.value = false;
		rows.value = [];
		total.value = 0;
		loadedOffset.value = 0;
	} else {
		loadingMore.value = true;
	}
	error.value = "";
	try {
		const response =
			await supplyManagerWorkspaceApi.assignmentHistory({
				constructionSiteID: constructionSiteID.value,
				from: reset ? 0 : loadedOffset.value,
				count: PAGE_SIZE,
			});
		if (sequence !== loadSequence) {
			return;
		}
		if (reset) {
			rows.value = response.rows;
			loadedOffset.value = response.rows.length;
		} else {
			const existingIDs = new Set(
				rows.value.map((assignment) => assignment.id),
			);
			rows.value = [
				...rows.value,
				...response.rows.filter(
					(assignment) =>
						!existingIDs.has(assignment.id),
				),
			];
			loadedOffset.value += response.rows.length;
		}
		total.value = response.agg.tot_count;
	} catch (caught: unknown) {
		if (sequence === loadSequence) {
			error.value = errorText(caught);
		}
	} finally {
		if (sequence === loadSequence) {
			loading.value = false;
			loadingMore.value = false;
		}
	}
};

const loadSites = async (): Promise<void> => {
	sitesError.value = "";
	try {
		sites.value =
			await supplyManagerWorkspaceApi.constructionSites();
	} catch (caught: unknown) {
		sites.value = [];
		sitesError.value = errorText(caught);
	}
};

watch(
	() => [props.revision, constructionSiteID.value] as const,
	() => {
		void load(true);
	},
);

onMounted(() => {
	void Promise.all([loadSites(), load(true)]);
});
</script>

<template>
	<div class="space-y-3">
		<div
			class="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
		>
			<label class="min-w-64 space-y-1">
				<span
					class="text-xs font-medium text-slate-600"
				>
					{{
						t(
							"SupplyManagerWorkspace.filters.site",
						)
					}}
				</span>
				<Select
					v-model="constructionSiteID"
					:options="sites"
					optionLabel="name"
					optionValue="id"
					:placeholder="
						t(
							'SupplyManagerWorkspace.filters.allSites',
						)
					"
					:disabled="
						props.siteFilterDisabled ||
						loading ||
						loadingMore
					"
					showClear
					filter
					class="w-full"
				/>
			</label>
			<Button
				:label="t('Grid.commands.refresh')"
				icon="pi pi-refresh"
				severity="secondary"
				outlined
				:loading="loading"
				:disabled="loading || loadingMore"
				@click="load(true)"
			/>
		</div>
		<div
			v-if="sitesError"
			class="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
			role="alert"
		>
			{{ sitesError }}
		</div>

		<div
			v-if="error"
			class="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
			role="alert"
		>
			{{ error }}
		</div>
		<div
			v-if="loading"
			class="flex min-h-64 items-center justify-center rounded-xl border border-slate-200 bg-white"
		>
			<ProgressSpinner class="h-10 w-10" strokeWidth="4" />
		</div>
		<div
			v-else-if="rows.length === 0"
			class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center text-slate-500"
		>
			{{ t("SupplyManagerWorkspace.history.empty") }}
		</div>

		<details
			v-for="assignment in rows"
			:key="assignment.id"
			class="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
		>
			<summary
				class="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-slate-50"
			>
				<span class="font-semibold text-slate-900">
					{{
						t(
							"SupplyManagerWorkspace.history.assignment",
							{
								id: assignment.id,
							},
						)
					}}
				</span>
				<span class="text-sm text-slate-600">
					{{ formatDateTime(assignment.date) }}
				</span>
				<span class="text-sm text-slate-600">
					{{ assignment.supply_manager.descr }}
				</span>
				<span
					class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
				>
					{{
						t(
							"SupplyManagerWorkspace.history.lineCount",
							{
								count: assignment
									.items
									.length,
							},
						)
					}}
				</span>
				<span
					v-if="assignment.comment"
					class="min-w-0 flex-1 truncate text-sm text-slate-500"
				>
					{{ assignment.comment }}
				</span>
				<i
					class="pi pi-chevron-down ml-auto text-slate-400 transition-transform group-open:rotate-180"
					aria-hidden="true"
				/>
			</summary>

			<div
				class="border-t border-slate-200 bg-slate-50/50 p-3 sm:p-4"
			>
				<div
					v-for="group in supplierGroups(
						assignment.items,
					)"
					:key="group.supplierID"
					class="mb-4 last:mb-0"
				>
					<h3
						class="mb-2 font-semibold text-slate-800"
					>
						{{ group.supplier.descr }}
					</h3>
					<div
						class="overflow-x-auto rounded-lg border border-slate-200 bg-white"
					>
						<table
							class="w-full min-w-[58rem] border-collapse text-sm"
						>
							<thead
								class="bg-slate-100 text-xs text-slate-600"
							>
								<tr>
									<th
										class="w-24 px-3 py-2 text-left font-semibold"
									>
										{{
											t(
												"SupplyManagerWorkspace.columns.request",
											)
										}}
									</th>
									<th
										class="min-w-56 px-3 py-2 text-left font-semibold"
									>
										{{
											t(
												"SupplyManagerWorkspace.columns.site",
											)
										}}
									</th>
									<th
										class="min-w-64 px-3 py-2 text-left font-semibold"
									>
										{{
											t(
												"SupplyManagerWorkspace.columns.material",
											)
										}}
									</th>
									<th
										class="w-32 px-3 py-2 text-right font-semibold"
									>
										{{
											t(
												"SupplyManagerWorkspace.columns.quantity",
											)
										}}
									</th>
									<th
										class="w-32 px-3 py-2 text-left font-semibold"
									>
										{{
											t(
												"SupplyManagerWorkspace.columns.requiredDate",
											)
										}}
									</th>
									<th
										class="w-40 px-3 py-2 text-left font-semibold"
									>
										{{
											t(
												"SupplyManagerWorkspace.columns.importance",
											)
										}}
									</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="item in group.items"
									:key="
										item.id
									"
									class="border-t border-slate-200"
								>
									<td
										class="px-3 py-2 text-slate-700"
									>
										№{{
											item.material_request_id
										}}
									</td>
									<td
										class="px-3 py-2 text-slate-700"
									>
										{{
											item
												.construction_site
												.descr
										}}
									</td>
									<td
										class="px-3 py-2 font-medium text-slate-900"
									>
										{{
											item
												.material
												.descr
										}}
									</td>
									<td
										class="px-3 py-2 text-right tabular-nums text-slate-800"
									>
										{{
											formatNumber(
												item.quant,
											)
										}}
										{{
											item
												.measure_unit
												.descr
										}}
									</td>
									<td
										class="px-3 py-2 text-slate-600"
									>
										{{
											formatDate(
												item.required_date,
											)
										}}
									</td>
									<td
										class="px-3 py-2 text-slate-700"
									>
										{{
											item
												.order_importance
												.descr
										}}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</details>

		<div
			v-if="loadedOffset < total"
			class="flex justify-center pt-1"
		>
			<Button
				:label="
					t(
						'SupplyManagerWorkspace.history.loadMore',
					)
				"
				icon="pi pi-angle-down"
				severity="secondary"
				outlined
				:loading="loadingMore"
				:disabled="loading || loadingMore"
				@click="load(false)"
			/>
		</div>
	</div>
</template>
