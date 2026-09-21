<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import Button from "primevue/button";
import Select from "primevue/select";

import { errorText } from "@katren/vue-collection-lib";

import { materialBalanceApi } from "@/api/materialBalance";
import ReportContainer from "@/components/reports/ReportContainer.vue";
import { useAuthStore } from "@/stores/useAuthStore";
import type {
	MaterialBalanceConstructionSite,
	MaterialBalanceRow,
} from "@/types/materialBalance";

interface MaterialBalanceGroup {
	id: number;
	name: string;
	rows: MaterialBalanceRow[];
}

const { t } = useI18n();
const authStore = useAuthStore();
const constructionSites = ref<MaterialBalanceConstructionSite[]>([]);
const constructionSiteID = ref<number | null>(null);
const appliedConstructionSite = ref<MaterialBalanceConstructionSite | null>(
	null,
);
const rows = ref<MaterialBalanceRow[]>([]);
const total = ref(0);
const generatedAt = ref<Date | null>(null);
const sitesLoading = ref(false);
const loading = ref(false);
const siteError = ref("");
const error = ref("");
const generated = ref(false);

const isConstructionManager = computed(() => {
	return authStore.user?.role_id === "construction_site_manager";
});

const hasSingleManagerSite = computed(() => {
	return (
		isConstructionManager.value &&
		constructionSites.value.length === 1
	);
});

const selectedConstructionSite = computed(() => {
	return (
		constructionSites.value.find(
			(site) => site.id === constructionSiteID.value,
		) ?? null
	);
});

const canGenerate = computed(() => {
	return (
		!sitesLoading.value &&
		!loading.value &&
		selectedConstructionSite.value !== null
	);
});

const groupedRows = computed<MaterialBalanceGroup[]>(() => {
	const groups = new Map<number, MaterialBalanceGroup>();

	for (const row of rows.value) {
		let group = groups.get(row.material_type_id);
		if (group === undefined) {
			group = {
				id: row.material_type_id,
				name: row.material_type.descr,
				rows: [],
			};
			groups.set(row.material_type_id, group);
		}
		group.rows.push(row);
	}

	return Array.from(groups.values());
});

const numberFormatter = new Intl.NumberFormat("ru-RU", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 4,
});

const formatNumber = (value: number): string => {
	return numberFormatter.format(value);
};

const formatDateTime = (value: Date | null): string => {
	return value?.toLocaleString("ru-RU") ?? "";
};

const reportFileName = computed(() => {
	const suffix = appliedConstructionSite.value?.id ?? "site";
	return `material-balance-${suffix}.xls`;
});

const generate = async (): Promise<void> => {
	const site = selectedConstructionSite.value;
	if (site === null) {
		error.value = t(
			"MaterialBalance.errors.constructionSiteRequired",
		);
		return;
	}

	loading.value = true;
	error.value = "";
	try {
		const response = await materialBalanceApi.list(site.id);
		rows.value = response.rows;
		total.value = response.total;
		generatedAt.value = response.generated_at;
		appliedConstructionSite.value = site;
		generated.value = true;
	} catch (err: unknown) {
		error.value = errorText(err);
		rows.value = [];
		total.value = 0;
		generatedAt.value = null;
		appliedConstructionSite.value = null;
		generated.value = false;
	} finally {
		loading.value = false;
	}
};

const loadConstructionSites = async (): Promise<void> => {
	sitesLoading.value = true;
	siteError.value = "";
	let generateSingleSiteReport = false;
	try {
		constructionSites.value =
			await materialBalanceApi.constructionSites();
		if (
			constructionSiteID.value !== null &&
			!constructionSites.value.some(
				(site) => site.id === constructionSiteID.value,
			)
		) {
			constructionSiteID.value = null;
		}

		if (
			isConstructionManager.value &&
			constructionSites.value.length === 1
		) {
			constructionSiteID.value =
				constructionSites.value[0]?.id ?? null;
			generateSingleSiteReport =
				constructionSiteID.value !== null;
		}
	} catch (err: unknown) {
		constructionSites.value = [];
		constructionSiteID.value = null;
		siteError.value = errorText(err);
	} finally {
		sitesLoading.value = false;
	}

	if (generateSingleSiteReport) {
		await generate();
	}
};

watch(constructionSiteID, (value, previousValue) => {
	if (value === previousValue) {
		return;
	}

	rows.value = [];
	total.value = 0;
	generatedAt.value = null;
	appliedConstructionSite.value = null;
	generated.value = false;
	error.value = "";
});

onMounted(() => {
	void loadConstructionSites();
});
</script>

<template>
	<div class="space-y-5">
		<section class="rounded-lg border border-gray-200 bg-white p-4">
			<h1 class="mb-4 text-xl font-semibold">
				{{ t("MaterialBalance.title") }}
			</h1>

			<div class="flex flex-wrap items-end gap-3">
				<div class="min-w-72 flex-1 md:max-w-xl">
					<label
						for="materialBalanceConstructionSite"
						class="mb-1 block text-sm font-medium text-gray-700"
					>
						{{
							t(
								"MaterialBalance.filters.constructionSite",
							)
						}}
					</label>

					<div
						v-if="hasSingleManagerSite"
						id="materialBalanceConstructionSite"
						class="flex min-h-10 items-center rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-800"
					>
						{{
							selectedConstructionSite?.name
						}}
					</div>
					<Select
						v-else
						v-model="constructionSiteID"
						inputId="materialBalanceConstructionSite"
						:options="constructionSites"
						optionLabel="name"
						optionValue="id"
						:placeholder="
							constructionSites.length ===
								0 &&
							!sitesLoading
								? t(
										'MaterialBalance.filters.noConstructionSites',
									)
								: t(
										'MaterialBalance.filters.selectConstructionSite',
									)
						"
						:loading="sitesLoading"
						:disabled="
							sitesLoading ||
							loading ||
							constructionSites.length ===
								0
						"
						filter
						class="w-full"
					/>
				</div>

				<Button
					:label="t('Report.commands.generate')"
					icon="pi pi-play"
					:loading="loading"
					:disabled="!canGenerate"
					@click="generate"
				/>
			</div>

			<div
				v-if="
					isConstructionManager &&
					!sitesLoading &&
					constructionSites.length === 0 &&
					!siteError
				"
				class="mt-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800"
			>
				{{
					t(
						"MaterialBalance.errors.noAssignedConstructionSites",
					)
				}}
			</div>

			<div
				v-if="siteError || error"
				class="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-red-700"
			>
				{{ siteError || error }}
			</div>
		</section>

		<ReportContainer
			:title="t('MaterialBalance.title')"
			:sheetName="t('MaterialBalance.sheetName')"
			:fileName="reportFileName"
			:hasContent="generated"
		>
			<div
				v-if="appliedConstructionSite"
				class="mb-4 space-y-1 text-sm"
			>
				<div>
					<strong
						>{{
							t(
								"MaterialBalance.filters.constructionSite",
							)
						}}:</strong
					>
					{{ appliedConstructionSite.name }}
				</div>
				<div v-if="generatedAt">
					<strong
						>{{
							t(
								"MaterialBalance.generatedAt",
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
										"MaterialBalance.columns.material",
									)
								}}
							</th>
							<th
								class="w-48 border border-gray-300 px-2 py-2 text-left"
							>
								{{
									t(
										"MaterialBalance.columns.measureUnit",
									)
								}}
							</th>
							<th
								class="w-48 border border-gray-300 px-2 py-2 text-right"
							>
								{{
									t(
										"MaterialBalance.columns.balance",
									)
								}}
							</th>
						</tr>
					</thead>
					<tbody>
						<template
							v-for="group in groupedRows"
							:key="group.id"
						>
							<tr
								class="font-semibold text-sky-900"
								style="
									background-color: #e0f2fe;
									color: #075985;
									font-weight: 700;
								"
							>
								<td
									colspan="3"
									class="border border-gray-300 px-3 py-2"
								>
									{{
										group.name
									}}
								</td>
							</tr>
							<tr
								v-for="row in group.rows"
								:key="
									row.material_id
								"
							>
								<td
									class="border border-gray-300 px-3 py-1.5"
								>
									{{
										row
											.material
											.descr
									}}
								</td>
								<td
									class="border border-gray-300 px-3 py-1.5"
								>
									{{
										row
											.measure_unit
											.descr
									}}
								</td>
								<td
									class="border border-gray-300 px-3 py-1.5 text-right"
								>
									{{
										formatNumber(
											row.balance,
										)
									}}
								</td>
							</tr>
						</template>
						<tr v-if="total === 0">
							<td
								colspan="3"
								class="border border-gray-300 px-3 py-8 text-center text-gray-500"
							>
								{{
									t(
										"MaterialBalance.empty",
									)
								}}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div v-else class="py-12 text-center text-gray-500">
				{{ t("MaterialBalance.notGenerated") }}
			</div>
		</ReportContainer>
	</div>
</template>
