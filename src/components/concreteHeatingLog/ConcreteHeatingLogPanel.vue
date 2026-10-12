<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import Button from "primevue/button";
import ConfirmDialog from "primevue/confirmdialog";
import Select from "primevue/select";
import { useConfirm } from "primevue/useconfirm";

import { errorText, type CollectionFilter } from "@katren/vue-collection-lib";

import { constructionManagerWorkspaceApi } from "@/api/constructionManagerWorkspace";
import { concreteHeatingLogApi } from "@/api/concreteHeatingLog.gen";
import ConcreteHeatingLogDialog from "@/components/concreteHeatingLog/ConcreteHeatingLogDialog.vue";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ConcreteHeatingLogList } from "@/types/concreteHeatingLogList.gen";
import type { MaterialBalanceConstructionSite } from "@/types/materialBalance";

const props = withDefaults(
	defineProps<{
		site?: MaterialBalanceConstructionSite | null;
		embedded?: boolean;
	}>(),
	{ site: null, embedded: false },
);
const emit = defineEmits<{
	"submitting-change": [value: boolean];
}>();

const { t } = useI18n();
const authStore = useAuthStore();
const confirm = useConfirm();
const confirmGroup = "concrete-heating-log-delete";
const constructionSites = ref<MaterialBalanceConstructionSite[]>([]);
const selectedSiteID = ref<number | null>(null);
const sitesLoading = ref(false);
const siteError = ref("");
const today = new Date();
const localDateText = (date: Date): string => {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const fromDate = ref(
	localDateText(new Date(today.getFullYear(), today.getMonth(), 1)),
);
const toDate = ref(localDateText(today));
const selectedSection = ref<number | null>(null);
const rows = ref<ConcreteHeatingLogList[]>([]);
const total = ref(0);
const from = ref(0);
const pageSize = 30;
const loading = ref(false);
const error = ref("");
const successMessage = ref("");
const dialogVisible = ref(false);
const dialogRecordID = ref<number | null>(null);
const submitting = ref(false);
const deletingID = ref<number | null>(null);
let loadSequence = 0;

const selectedSite = computed<MaterialBalanceConstructionSite | null>(() => {
	return props.embedded
		? props.site
		: (constructionSites.value.find(
				(site) => site.id === selectedSiteID.value,
			) ?? null);
});
const canEdit = computed(() => {
	return (
		authStore.user?.role_id === "admin" ||
		authStore.user?.role_id === "construction_site_manager"
	);
});
const busy = computed(() => submitting.value || deletingID.value !== null);
const sectionOptions = computed(() => {
	return Array.from(
		{ length: Math.max(0, selectedSite.value?.section_cnt ?? 0) },
		(_, index) => ({ id: index + 1, label: String(index + 1) }),
	);
});
const dateRangeError = computed(() => {
	return fromDate.value && toDate.value && fromDate.value > toDate.value
		? t("ConcreteHeatingLog.errors.dateRange")
		: "";
});
const pageCount = computed(() =>
	Math.max(1, Math.ceil(total.value / pageSize)),
);
const currentPage = computed(() => Math.floor(from.value / pageSize) + 1);
const paginationSummary = computed(() => {
	return t("ConcreteHeatingLog.pagination.summary", {
		from: total.value === 0 ? 0 : from.value + 1,
		to: Math.min(from.value + rows.value.length, total.value),
		total: total.value,
	});
});
const selectPT = {
	overlay: { style: { maxWidth: "calc(100vw - 2rem)" } },
	optionLabel: {
		style: { whiteSpace: "normal", overflowWrap: "anywhere" },
	},
};
const numberFormatter = new Intl.NumberFormat("ru-RU", {
	maximumFractionDigits: 4,
});
const referenceText = (reference: Record<string, unknown> | null): string => {
	return typeof reference?.descr === "string" ? reference.descr : "";
};
const formatDate = (date: Date): string =>
	date.toLocaleDateString("ru-RU", { timeZone: "UTC" });
const formatNumber = (value: number | null): string =>
	value === null ? "—" : numberFormatter.format(value);
const loadSites = async (): Promise<void> => {
	sitesLoading.value = true;
	siteError.value = "";
	try {
		constructionSites.value =
			await constructionManagerWorkspaceApi.constructionSites();
		if (
			!constructionSites.value.some(
				(site) => site.id === selectedSiteID.value,
			)
		) {
			selectedSiteID.value =
				constructionSites.value.length === 1
					? (constructionSites.value[0]?.id ??
						null)
					: null;
		}
	} catch (caught: unknown) {
		constructionSites.value = [];
		selectedSiteID.value = null;
		siteError.value = errorText(caught);
	} finally {
		sitesLoading.value = false;
	}
};

const load = async (offset = 0): Promise<void> => {
	const sequence = ++loadSequence;
	const siteID = selectedSite.value?.id ?? null;
	const section = selectedSection.value;
	const start = fromDate.value;
	const end = toDate.value;
	rows.value = [];
	total.value = 0;
	from.value = offset;
	error.value = "";
	if (siteID === null || dateRangeError.value) {
		loading.value = false;
		return;
	}
	const filter: CollectionFilter[] = [
		{ f: { construction_site_id: { o: "e", v: siteID } } },
	];
	if (start) {
		filter.push({ f: { date: { o: "ge", v: start } } });
	}
	if (end) {
		filter.push({ f: { date: { o: "le", v: end } } });
	}
	if (section !== null) {
		filter.push({ f: { section: { o: "e", v: section } } });
	}
	loading.value = true;
	try {
		const response = await concreteHeatingLogApi.list({
			filter,
			sorter: [
				{ f: "date", d: "d" },
				{ f: "id", d: "d" },
			],
			from: offset,
			count: pageSize,
		});
		if (sequence !== loadSequence) {
			return;
		}
		const count = response.agg.tot_count;
		if (count > 0 && offset >= count) {
			await load(
				Math.floor((count - 1) / pageSize) * pageSize,
			);
			return;
		}
		rows.value = response.rows;
		total.value = count;
		if (count === 0) {
			from.value = 0;
		}
	} catch (caught: unknown) {
		if (sequence === loadSequence) {
			error.value = errorText(caught);
		}
	} finally {
		if (sequence === loadSequence) {
			loading.value = false;
		}
	}
};

const openEditor = (recordID: number | null): void => {
	if (selectedSite.value === null || !canEdit.value || busy.value) {
		return;
	}
	dialogRecordID.value = recordID;
	successMessage.value = "";
	dialogVisible.value = true;
};

const setSubmitting = (value: boolean): void => {
	submitting.value = value;
	emit("submitting-change", value);
};

const saved = (): void => {
	successMessage.value = t("ConcreteHeatingLog.messages.saved");
	void load(from.value);
};

const deleteRow = async (
	row: ConcreteHeatingLogList,
	siteID: number,
): Promise<void> => {
	if (
		!canEdit.value ||
		busy.value ||
		selectedSite.value?.id !== siteID ||
		row.construction_site_id !== siteID
	) {
		return;
	}
	deletingID.value = row.id;
	emit("submitting-change", true);
	error.value = "";
	successMessage.value = "";
	try {
		await concreteHeatingLogApi.delete({ id: row.id });
		successMessage.value = t("ConcreteHeatingLog.messages.deleted");
		await load(from.value);
	} catch (caught: unknown) {
		error.value = errorText(caught);
	} finally {
		deletingID.value = null;
		emit("submitting-change", false);
	}
};

const confirmDelete = (row: ConcreteHeatingLogList): void => {
	const siteID = selectedSite.value?.id;
	if (siteID === undefined || !canEdit.value || busy.value) {
		return;
	}
	confirm.require({
		group: confirmGroup,
		header: t("ConcreteHeatingLog.commands.delete"),
		message: t("ConcreteHeatingLog.messages.deleteConfirm", {
			date: formatDate(row.date),
			work: referenceText(row.building_element),
		}),
		icon: "pi pi-exclamation-triangle",
		acceptLabel: t("ConcreteHeatingLog.commands.delete"),
		rejectLabel: t("ConcreteHeatingLog.commands.cancel"),
		acceptProps: { severity: "danger" },
		rejectProps: { severity: "secondary", outlined: true },
		accept: () => {
			void deleteRow(row, siteID);
		},
	});
};

watch(
	() => selectedSite.value?.id ?? null,
	() => {
		selectedSection.value = null;
		if (!submitting.value) {
			dialogVisible.value = false;
		}
		successMessage.value = "";
	},
	{ flush: "sync" },
);
watch(
	() =>
		[
			selectedSite.value?.id ?? null,
			fromDate.value,
			toDate.value,
			selectedSection.value,
		] as const,
	() => {
		void load();
	},
	{ immediate: true },
);
onMounted(() => {
	if (!props.embedded) {
		void loadSites();
	}
});
</script>

<template>
	<section class="construction-log-panel">
		<ConfirmDialog
			:group="confirmGroup"
			:style="{ maxWidth: 'calc(100vw - 1rem)' }"
		/>
		<h1 v-if="!embedded" class="mb-4 text-xl font-semibold">
			{{ t("ConcreteHeatingLog.title") }}
		</h1>
		<div class="log-filters">
			<div
				v-if="!embedded"
				class="log-filter log-site-filter"
			>
				<label for="constructionLogSite">{{
					t(
						"ConcreteHeatingLog.filters.constructionSite",
					)
				}}</label>
				<Select
					inputId="constructionLogSite"
					v-model="selectedSiteID"
					:options="constructionSites"
					optionValue="id"
					optionLabel="name"
					:placeholder="
						t(
							constructionSites.length ===
								0 &&
								!sitesLoading
								? 'ConcreteHeatingLog.filters.noConstructionSites'
								: 'ConcreteHeatingLog.filters.selectConstructionSite',
						)
					"
					:loading="sitesLoading"
					:disabled="
						sitesLoading ||
						busy ||
						dialogVisible ||
						constructionSites.length === 0
					"
					:pt="selectPT"
					filter
					class="log-select"
				/>
			</div>
			<div class="log-filter">
				<label for="constructionLogFromDate">{{
					t("ConcreteHeatingLog.filters.fromDate")
				}}</label>
				<input
					id="constructionLogFromDate"
					v-model="fromDate"
					type="date"
					:disabled="busy"
					class="log-date-filter"
				/>
			</div>
			<div class="log-filter">
				<label for="constructionLogToDate">{{
					t("ConcreteHeatingLog.filters.toDate")
				}}</label>
				<input
					id="constructionLogToDate"
					v-model="toDate"
					type="date"
					:disabled="busy"
					class="log-date-filter"
				/>
			</div>
			<div
				v-if="(selectedSite?.section_cnt ?? 0) > 1"
				class="log-filter"
			>
				<label for="constructionLogSection">{{
					t("ConcreteHeatingLog.filters.section")
				}}</label>
				<Select
					inputId="constructionLogSection"
					v-model="selectedSection"
					:options="sectionOptions"
					optionValue="id"
					optionLabel="label"
					:placeholder="
						t(
							'ConcreteHeatingLog.filters.allSections',
						)
					"
					:disabled="busy"
					:pt="selectPT"
					showClear
					class="log-select"
				/>
			</div>
			<div class="log-toolbar">
				<Button
					:label="
						t(
							'ConcreteHeatingLog.commands.refresh',
						)
					"
					icon="pi pi-refresh"
					severity="secondary"
					outlined
					:loading="loading"
					:disabled="
						selectedSite === null ||
						busy ||
						!!dateRangeError
					"
					@click="load(from)"
				/>
				<Button
					v-if="canEdit"
					:label="
						t(
							'ConcreteHeatingLog.commands.create',
						)
					"
					icon="pi pi-plus"
					:disabled="
						selectedSite === null || busy
					"
					@click="openEditor(null)"
				/>
			</div>
		</div>
		<div v-if="siteError" class="log-error" role="alert">
			<span>{{ siteError }}</span>
			<Button
				:label="
					t('ConcreteHeatingLog.commands.refresh')
				"
				severity="secondary"
				text
				:loading="sitesLoading"
				@click="loadSites"
			/>
		</div>
		<div
			v-if="dateRangeError || error"
			class="log-error"
			role="alert"
		>
			{{ dateRangeError || error }}
		</div>
		<div v-if="successMessage" class="log-success" role="status">
			{{ successMessage }}
		</div>
		<div
			v-if="
				!embedded &&
				!sitesLoading &&
				constructionSites.length === 0 &&
				!siteError
			"
			class="log-empty"
		>
			{{ t("ConcreteHeatingLog.messages.noAssignedSites") }}
		</div>
		<div v-else-if="selectedSite === null" class="log-empty">
			{{ t("ConcreteHeatingLog.messages.chooseSite") }}
		</div>
		<div v-else class="log-table-container" :aria-busy="loading">
			<div v-if="loading" class="log-empty" role="status">
				<i
					class="pi pi-spin pi-spinner mr-2"
					aria-hidden="true"
				/>{{ t("Grid.loading") }}
			</div>
			<div
				class="log-table-scroll"
				tabindex="0"
				:aria-label="t('ConcreteHeatingLog.title')"
			>
				<table class="log-table">
					<thead>
						<tr>
							<th
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.fields.building_element_id",
									)
								}}
							</th>
							<th
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.fields.volume_m3",
									)
								}}
							</th>
							<th
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.fields.surface_modulus_m_inv",
									)
								}}
							</th>
							<th
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.fields.curing_method",
									)
								}}
							</th>
							<th
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.fields.date",
									)
								}}
							</th>
							<th
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.fields.temperature_well_number",
									)
								}}
							</th>
							<th
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.fields.outside_air_temperature_c",
									)
								}}
							</th>
							<th
								scope="colgroup"
								colspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.columns.measurements",
									)
								}}
							</th>
							<th
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.fields.curing_duration_hours",
									)
								}}
							</th>
							<th
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.fields.degree_hours",
									)
								}}
							</th>
							<th
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.fields.average_curing_temperature_c",
									)
								}}
							</th>
							<th
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.fields.specimen_marking",
									)
								}}
							</th>
							<th
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.fields.specimen_curing_conditions",
									)
								}}
							</th>
							<th
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.fields.specimen_strength_mpa",
									)
								}}
							</th>
							<th
								v-if="
									(selectedSite?.section_cnt ??
										0) >
									1
								"
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.fields.section",
									)
								}}
							</th>
							<th
								v-if="canEdit"
								scope="col"
								rowspan="2"
							>
								{{
									t(
										"ConcreteHeatingLog.columns.actions",
									)
								}}
							</th>
						</tr>
						<tr>
							<th scope="col">
								{{
									t(
										"ConcreteHeatingLog.fields.measured_at",
									)
								}}
							</th>
							<th scope="col">
								{{
									t(
										"ConcreteHeatingLog.fields.concrete_temperature_c",
									)
								}}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in rows"
							:key="row.id"
						>
							<td>
								{{
									referenceText(
										row.building_element,
									) || "—"
								}}
							</td>
							<td>
								{{
									formatNumber(
										row.volume_m3,
									)
								}}
							</td>
							<td>
								{{
									formatNumber(
										row.surface_modulus_m_inv,
									)
								}}
							</td>
							<td>
								{{
									row.curing_method ||
									"—"
								}}
							</td>
							<td>
								{{
									formatDate(
										row.date,
									)
								}}
							</td>
							<td>
								{{
									row.temperature_well_number ||
									"—"
								}}
							</td>
							<td>
								{{
									row.outside_air_temperature_c ===
									null
										? "—"
										: `${formatNumber(row.outside_air_temperature_c)} °C`
								}}
							</td>
							<td>
								{{
									row.measured_at ===
									null
										? "—"
										: row.measured_at.toLocaleString(
												"ru-RU",
											)
								}}
							</td>
							<td>
								{{
									row.concrete_temperature_c ===
									null
										? "—"
										: `${formatNumber(row.concrete_temperature_c)} °C`
								}}
							</td>
							<td>
								{{
									formatNumber(
										row.curing_duration_hours,
									)
								}}
							</td>
							<td>
								{{
									formatNumber(
										row.degree_hours,
									)
								}}
							</td>
							<td>
								{{
									row.average_curing_temperature_c ===
									null
										? "—"
										: `${formatNumber(row.average_curing_temperature_c)} °C`
								}}
							</td>
							<td>
								{{
									row.specimen_marking ||
									"—"
								}}
							</td>
							<td>
								{{
									row.specimen_curing_conditions ||
									"—"
								}}
							</td>
							<td>
								{{
									formatNumber(
										row.specimen_strength_mpa,
									)
								}}
							</td>
							<td
								v-if="
									(selectedSite?.section_cnt ??
										0) >
									1
								"
							>
								{{
									row.section ??
									"—"
								}}
							</td>
							<td
								v-if="canEdit"
								class="log-actions-cell"
							>
								<div
									class="log-row-actions"
								>
									<Button
										icon="pi pi-pencil"
										:aria-label="
											t(
												'ConcreteHeatingLog.commands.edit',
											)
										"
										:title="
											t(
												'ConcreteHeatingLog.commands.edit',
											)
										"
										severity="secondary"
										outlined
										:disabled="
											busy
										"
										@click="
											openEditor(
												row.id,
											)
										"
									/>
									<Button
										icon="pi pi-trash"
										:aria-label="
											t(
												'ConcreteHeatingLog.commands.delete',
											)
										"
										:title="
											t(
												'ConcreteHeatingLog.commands.delete',
											)
										"
										severity="danger"
										text
										:loading="
											deletingID ===
											row.id
										"
										:disabled="
											busy
										"
										@click="
											confirmDelete(
												row,
											)
										"
									/>
								</div>
							</td>
						</tr>
						<tr v-if="rows.length === 0">
							<td
								:colspan="
									15 +
									(canEdit
										? 1
										: 0) +
									((selectedSite?.section_cnt ??
										0) >
									1
										? 1
										: 0)
								"
								class="log-empty"
							>
								{{
									t(
										"ConcreteHeatingLog.messages.empty",
									)
								}}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<nav
				v-if="total > 0"
				class="log-pagination"
				:aria-label="t('ConcreteHeatingLog.title')"
			>
				<span class="log-muted">{{
					paginationSummary
				}}</span>
				<div class="log-page-buttons">
					<Button
						icon="pi pi-angle-double-left"
						:aria-label="
							t(
								'Grid.commands.firstPage',
							)
						"
						severity="secondary"
						text
						:disabled="
							currentPage === 1 ||
							loading ||
							busy
						"
						@click="load(0)"
					/>
					<Button
						icon="pi pi-angle-left"
						:aria-label="
							t(
								'Grid.commands.previousPage',
							)
						"
						severity="secondary"
						text
						:disabled="
							currentPage === 1 ||
							loading ||
							busy
						"
						@click="
							load(
								Math.max(
									0,
									from -
										pageSize,
								),
							)
						"
					/>
					<span class="log-page-count"
						>{{ currentPage }} /
						{{ pageCount }}</span
					>
					<Button
						icon="pi pi-angle-right"
						:aria-label="
							t(
								'Grid.commands.nextPage',
							)
						"
						severity="secondary"
						text
						:disabled="
							currentPage >=
								pageCount ||
							loading ||
							busy
						"
						@click="load(from + pageSize)"
					/>
					<Button
						icon="pi pi-angle-double-right"
						:aria-label="
							t(
								'Grid.commands.lastPage',
							)
						"
						severity="secondary"
						text
						:disabled="
							currentPage >=
								pageCount ||
							loading ||
							busy
						"
						@click="
							load(
								(pageCount -
									1) *
									pageSize,
							)
						"
					/>
				</div>
			</nav>
		</div>
		<ConcreteHeatingLogDialog
			v-model:visible="dialogVisible"
			:site="selectedSite"
			:recordID="dialogRecordID"
			:initialDate="localDateText(new Date())"
			:initialSection="selectedSection"
			@saved="saved"
			@submitting-change="setSubmitting"
		/>
	</section>
</template>

<style scoped>
.construction-log-panel,
.log-table-container {
	width: 100%;
	max-width: 100%;
	min-width: 0;
}
.construction-log-panel {
	container: concrete-heating-log / inline-size;
}
.log-filters {
	display: flex;
	flex-wrap: wrap;
	align-items: end;
	gap: 0.75rem;
	padding: 0.75rem;
	border: 1px solid #e2e8f0;
	border-radius: 0.5rem;
	background: white;
	margin-bottom: 1rem;
}
.log-filter {
	flex: 1 1 10rem;
	min-width: 0;
	max-width: 100%;
	display: grid;
	gap: 0.3rem;
}
.log-site-filter {
	flex: 2 1 18rem;
}
.log-filter label {
	font-size: 0.875rem;
	font-weight: 500;
	overflow-wrap: anywhere;
}
.log-date-filter,
.log-select {
	box-sizing: border-box;
	width: 100%;
	min-width: 0;
	max-width: 100%;
}
.log-date-filter {
	padding: 0.5rem 0.75rem;
	border: 1px solid #cbd5e1;
	border-radius: 0.375rem;
	background: white;
	color: #0f172a;
}
.log-select :deep(.p-select-label) {
	min-width: 0;
	white-space: normal;
	overflow-wrap: anywhere;
}
.log-toolbar,
.log-row-actions,
.log-page-buttons {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.3rem;
	min-width: 0;
}
.log-toolbar :deep(.p-button) {
	max-width: 100%;
	white-space: normal;
}
.log-error,
.log-success {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.5rem;
	margin-bottom: 0.75rem;
	padding: 0.75rem;
	border: 1px solid #fca5a5;
	border-radius: 0.5rem;
	background: #fef2f2;
	color: #b91c1c;
	overflow-wrap: anywhere;
}
.log-error > span {
	flex: 1 1 12rem;
	min-width: 0;
}
.log-success {
	border-color: #86efac;
	background: #f0fdf4;
	color: #166534;
}
.log-table-container {
	border: 1px solid #e2e8f0;
	border-radius: 0.5rem;
	background: white;
}
.log-table-scroll {
	width: 100%;
	max-width: 100%;
	overflow-x: auto;
}
.log-table {
	width: 100%;
	table-layout: fixed;
	border-collapse: collapse;
}
.log-table th,
.log-table td {
	min-width: 0;
	text-align: left;
	vertical-align: top;
	overflow-wrap: anywhere;
	border: 1px solid #e2e8f0;
	padding: 0.4rem 0.3rem;
}
.log-table thead {
	background: #f1f5f9;
}
.log-table th:first-child {
	width: 13%;
}
.log-table th {
	text-align: center;
	vertical-align: middle;
	font-size: 0.8rem;
}
.log-table td {
	font-size: 0.85rem;
}
.log-ordinal-column {
	width: 3%;
}
.log-date-column {
	width: 8%;
}
.log-work-column {
	width: 18%;
}
.log-value-column {
	width: 5%;
}
.log-axis-column {
	width: 4%;
}
.log-reason-column {
	width: 13%;
}
.log-actions-column {
	width: 5rem;
}
.log-date-cell time {
	display: block;
}
.log-ordinal,
.log-muted,
.log-details dt {
	color: #64748b;
	font-size: 0.8rem;
}
.log-work-name {
	font-weight: 600;
	margin-bottom: 0.25rem;
}
.log-details {
	display: grid;
	gap: 0.25rem;
	margin: 0;
}
.log-details > div {
	display: flex;
	flex-wrap: wrap;
	gap: 0.2rem 0.5rem;
	min-width: 0;
}
.log-details dd {
	margin: 0;
	min-width: 0;
}
.log-time {
	margin-top: 0.25rem;
}
.log-empty {
	padding: 2.5rem 0.75rem !important;
	text-align: center !important;
	color: #64748b;
	overflow-wrap: anywhere;
}
.log-row-actions :deep(.p-button),
.log-page-buttons :deep(.p-button) {
	width: 2rem;
	height: 2rem;
	padding: 0;
	flex-shrink: 0;
}
.log-pagination {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	padding: 0.75rem;
}
.log-page-count {
	padding: 0 0.25rem;
	font-size: 0.875rem;
}
@container concrete-heating-log (max-width: 55rem) {
	.log-table {
		min-width: 64rem;
	}
}
</style>
