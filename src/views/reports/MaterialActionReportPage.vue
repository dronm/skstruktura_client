<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";

import Button from "primevue/button";

import { errorText } from "@katren/vue-collection-lib";

import { materialActionReportApi } from "@/api/materialActionReport";
import DocumentDateTimePicker from "@/components/documents/DocumentDateTimePicker.vue";
import MultiReferenceGrid from "@/components/reports/MultiReferenceGrid.vue";
import ReportContainer from "@/components/reports/ReportContainer.vue";
import {
	constructionSiteReference,
	materialReference,
} from "@/references/inventoryReferences";
import type {
	MaterialActionReportLevel,
	MaterialActionReportRequest,
	MaterialActionReportRow,
} from "@/types/materialActionReport";

interface ReportFilters {
	dateFrom: Date;
	dateTo: Date;
	constructionSiteIds: number[];
	materialIds: number[];
}

interface ReportTreeRow extends MaterialActionReportRow {
	children?: ReportTreeRow[];
	expanded: boolean;
	loading: boolean;
}

interface VisibleReportRow {
	row: ReportTreeRow;
	depth: number;
}

const { t } = useI18n();
const now = new Date();
now.setMilliseconds(0);
const filters = reactive<ReportFilters>({
	dateFrom: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
	dateTo: now,
	constructionSiteIds: [],
	materialIds: [],
});
const appliedFilters = ref<ReportFilters | null>(null);
const rows = ref<ReportTreeRow[]>([]);
const generatedAt = ref<Date | null>(null);
const loading = ref(false);
const error = ref("");
const generated = ref(false);
const filtersExpanded = ref(true);

const numberFormatter = new Intl.NumberFormat("ru-RU", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 4,
});

const toTreeRows = (value: MaterialActionReportRow[]): ReportTreeRow[] => {
	return value.map((row) => ({
		...row,
		expanded: false,
		loading: false,
	}));
};

const cloneFilters = (value: ReportFilters): ReportFilters => ({
	dateFrom: new Date(value.dateFrom),
	dateTo: new Date(value.dateTo),
	constructionSiteIds: [...value.constructionSiteIds],
	materialIds: [...value.materialIds],
});

const fetchAllRows = async (
	request: Omit<MaterialActionReportRequest, "from" | "count">,
): Promise<{ rows: MaterialActionReportRow[]; generatedAt: Date }> => {
	const result: MaterialActionReportRow[] = [];
	let from = 0;
	let total = 0;
	let responseGeneratedAt = new Date();

	do {
		const response = await materialActionReportApi.list({
			...request,
			from,
			count: 1000,
		});
		responseGeneratedAt = response.generated_at;
		total = response.total;
		result.push(...response.rows);
		from += response.rows.length;

		if (response.rows.length === 0) {
			break;
		}
	} while (from < total);

	return {
		rows: result,
		generatedAt: responseGeneratedAt,
	};
};

const reportRequest = (
	level: MaterialActionReportLevel,
	parentConstructionSiteId?: number,
	parentMaterialId?: number,
): Omit<MaterialActionReportRequest, "from" | "count"> => {
	const value = appliedFilters.value;
	if (value === null) {
		throw new Error(t("MaterialActionReport.errors.notGenerated"));
	}

	return {
		...cloneFilters(value),
		level,
		parentConstructionSiteId,
		parentMaterialId,
	};
};

const generate = async (): Promise<void> => {
	error.value = "";
	if (
		!(filters.dateFrom instanceof Date) ||
		!(filters.dateTo instanceof Date)
	) {
		error.value = t("MaterialActionReport.errors.periodRequired");
		return;
	}
	if (filters.dateFrom > filters.dateTo) {
		error.value = t("MaterialActionReport.errors.invalidPeriod");
		return;
	}

	loading.value = true;
	try {
		appliedFilters.value = cloneFilters(filters);
		const response = await fetchAllRows(
			reportRequest("construction_site"),
		);
		rows.value = toTreeRows(response.rows);
		generatedAt.value = response.generatedAt;
		generated.value = true;
	} catch (err: unknown) {
		error.value = errorText(err);
		rows.value = [];
		generated.value = false;
	} finally {
		loading.value = false;
	}
};

const loadChildren = async (row: ReportTreeRow): Promise<void> => {
	row.loading = true;
	error.value = "";
	try {
		const level: MaterialActionReportLevel =
			row.row_type === "construction_site"
				? "material"
				: "document";
		const response = await fetchAllRows(
			reportRequest(
				level,
				row.construction_site_id,
				row.material_id,
			),
		);
		row.children = toTreeRows(response.rows);
		row.expanded = true;
	} catch (err: unknown) {
		error.value = errorText(err);
	} finally {
		row.loading = false;
	}
};

const toggleRow = async (row: ReportTreeRow): Promise<void> => {
	if (!row.has_children || row.loading) {
		return;
	}
	if (row.expanded) {
		row.expanded = false;
		return;
	}
	if (row.children !== undefined) {
		row.expanded = true;
		return;
	}

	await loadChildren(row);
};

const visibleRows = computed<VisibleReportRow[]>(() => {
	const result: VisibleReportRow[] = [];
	const append = (items: ReportTreeRow[], depth: number): void => {
		for (const row of items) {
			result.push({ row, depth });
			if (row.expanded && row.children !== undefined) {
				append(row.children, depth + 1);
			}
		}
	};
	append(rows.value, 0);
	return result;
});

const formatNumber = (value: number | null): string => {
	return value === null ? "" : numberFormatter.format(value);
};

const formatDateTime = (value: Date | null): string => {
	return value?.toLocaleString("ru-RU") ?? "";
};

const formatFilterIDs = (values: number[]): string => {
	return values.length > 0
		? values.join(", ")
		: t("MaterialActionReport.filters.all");
};

const rowClass = (row: ReportTreeRow): string => {
	if (row.row_type === "construction_site") {
		return "bg-gray-100 font-semibold";
	}
	if (row.row_type === "material") {
		return "bg-gray-50 font-medium";
	}
	return "bg-white";
};

const reportFileName = computed(() => {
	const date = appliedFilters.value?.dateTo ?? filters.dateTo;
	const suffix = [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
	].join("");
	return `material-actions-${suffix}.xls`;
});
</script>

<template>
	<div class="space-y-5">
		<section class="rounded-lg border border-gray-200 bg-white p-4">
			<h1 class="mb-4 text-xl font-semibold">
				{{ t("MaterialActionReport.title") }}
			</h1>

			<div class="space-y-3">
				<div
					class="flex flex-wrap items-end gap-x-3 gap-y-2"
				>
					<div
						class="pb-2 text-sm font-semibold text-gray-700"
					>
						{{
							t(
								"MaterialActionReport.filters.period",
							)
						}}
					</div>

					<label class="flex items-center gap-2">
						<span
							class="text-sm text-gray-600"
						>
							{{
								t(
									"MaterialActionReport.filters.from",
								)
							}}
						</span>
						<DocumentDateTimePicker
							inputId="materialActionReportDateFrom"
							v-model="
								filters.dateFrom
							"
							required
						/>
					</label>

					<span
						class="pb-2 text-gray-400"
						aria-hidden="true"
						>—</span
					>

					<label class="flex items-center gap-2">
						<span
							class="text-sm text-gray-600"
						>
							{{
								t(
									"MaterialActionReport.filters.to",
								)
							}}
						</span>
						<DocumentDateTimePicker
							inputId="materialActionReportDateTo"
							v-model="filters.dateTo"
							required
						/>
					</label>

					<Button
						class="lg:ml-auto"
						:label="
							t(
								'Report.commands.generate',
							)
						"
						icon="pi pi-play"
						:loading="loading"
						@click="generate"
					/>
				</div>

				<div
					class="overflow-hidden rounded-md border border-gray-200"
				>
					<button
						type="button"
						class="flex w-full items-center justify-between bg-gray-50 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
						:aria-expanded="filtersExpanded"
						@click="
							filtersExpanded =
								!filtersExpanded
						"
					>
						<span>{{
							t(
								"MaterialActionReport.filters.title",
							)
						}}</span>
						<i
							class="pi text-xs"
							:class="
								filtersExpanded
									? 'pi-chevron-up'
									: 'pi-chevron-down'
							"
						/>
					</button>

					<div
						v-show="filtersExpanded"
						class="grid grid-cols-1 gap-3 border-t border-gray-200 p-3 xl:grid-cols-2"
					>
						<MultiReferenceGrid
							v-model="
								filters.constructionSiteIds
							"
							:title="
								t(
									'MaterialActionReport.filters.constructionSites',
								)
							"
							headerKey="ConstructionSite.title"
							:reference="
								constructionSiteReference
							"
						/>
						<MultiReferenceGrid
							v-model="
								filters.materialIds
							"
							:title="
								t(
									'MaterialActionReport.filters.materials',
								)
							"
							headerKey="Material.title"
							:reference="
								materialReference
							"
						/>
					</div>
				</div>
			</div>

			<div
				v-if="error"
				class="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-red-700"
			>
				{{ error }}
			</div>
		</section>

		<ReportContainer
			:title="t('MaterialActionReport.title')"
			:sheetName="t('MaterialActionReport.sheetName')"
			:fileName="reportFileName"
			:hasContent="generated"
		>
			<div
				v-if="appliedFilters"
				class="mb-4 space-y-1 text-sm"
			>
				<div>
					<strong
						>{{
							t(
								"MaterialActionReport.filters.period",
							)
						}}:</strong
					>
					{{
						formatDateTime(
							appliedFilters.dateFrom,
						)
					}}
					—
					{{
						formatDateTime(
							appliedFilters.dateTo,
						)
					}}
				</div>
				<div>
					<strong
						>{{
							t(
								"MaterialActionReport.filters.constructionSites",
							)
						}}:</strong
					>
					{{
						formatFilterIDs(
							appliedFilters.constructionSiteIds,
						)
					}}
				</div>
				<div>
					<strong
						>{{
							t(
								"MaterialActionReport.filters.materials",
							)
						}}:</strong
					>
					{{
						formatFilterIDs(
							appliedFilters.materialIds,
						)
					}}
				</div>
				<div v-if="generatedAt">
					<strong
						>{{
							t(
								"MaterialActionReport.generatedAt",
							)
						}}:</strong
					>
					{{ formatDateTime(generatedAt) }}
				</div>
			</div>

			<div v-if="generated" class="overflow-x-auto">
				<table class="w-full border-collapse text-sm">
					<thead>
						<tr class="bg-gray-100">
							<th
								class="border border-gray-300 px-2 py-2 text-left"
							>
								{{
									t(
										"MaterialActionReport.columns.grouping",
									)
								}}
							</th>
							<th
								class="border border-gray-300 px-2 py-2 text-right"
							>
								{{
									t(
										"MaterialActionReport.columns.balanceStart",
									)
								}}
							</th>
							<th
								class="border border-gray-300 px-2 py-2 text-right"
							>
								{{
									t(
										"MaterialActionReport.columns.income",
									)
								}}
							</th>
							<th
								class="border border-gray-300 px-2 py-2 text-right"
							>
								{{
									t(
										"MaterialActionReport.columns.outcome",
									)
								}}
							</th>
							<th
								class="border border-gray-300 px-2 py-2 text-right"
							>
								{{
									t(
										"MaterialActionReport.columns.balanceEnd",
									)
								}}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="item in visibleRows"
							:key="item.row.key"
							:class="
								rowClass(
									item.row,
								)
							"
						>
							<td
								class="border border-gray-300 px-2 py-1.5"
							>
								<div
									class="flex items-center gap-1"
									:style="{
										paddingLeft: `${item.depth * 1.5}rem`,
									}"
								>
									<button
										v-if="
											item
												.row
												.has_children
										"
										type="button"
										class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-400 bg-white font-bold"
										data-report-exclude
										:disabled="
											item
												.row
												.loading
										"
										@click="
											toggleRow(
												item.row,
											)
										"
									>
										<i
											v-if="
												item
													.row
													.loading
											"
											class="pi pi-spin pi-spinner text-xs"
										/>
										<span
											v-else
											>{{
												item
													.row
													.expanded
													? "−"
													: "+"
											}}</span
										>
									</button>
									<span
										v-else
										class="inline-block w-5 shrink-0"
									/>
									<span>{{
										item
											.row
											.caption
									}}</span>
								</div>
							</td>
							<td
								class="border border-gray-300 px-2 py-1.5 text-right"
							>
								{{
									formatNumber(
										item
											.row
											.balance_start,
									)
								}}
							</td>
							<td
								class="border border-gray-300 px-2 py-1.5 text-right"
							>
								{{
									formatNumber(
										item
											.row
											.income,
									)
								}}
							</td>
							<td
								class="border border-gray-300 px-2 py-1.5 text-right"
							>
								{{
									formatNumber(
										item
											.row
											.outcome,
									)
								}}
							</td>
							<td
								class="border border-gray-300 px-2 py-1.5 text-right"
							>
								{{
									formatNumber(
										item
											.row
											.balance_end,
									)
								}}
							</td>
						</tr>
						<tr
							v-if="
								visibleRows.length ===
								0
							"
						>
							<td
								colspan="5"
								class="border border-gray-300 px-3 py-8 text-center text-gray-500"
							>
								{{
									t(
										"MaterialActionReport.empty",
									)
								}}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div v-else class="py-12 text-center text-gray-500">
				{{ t("MaterialActionReport.notGenerated") }}
			</div>
		</ReportContainer>
	</div>
</template>
