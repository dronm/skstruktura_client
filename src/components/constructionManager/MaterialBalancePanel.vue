<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import Button from "primevue/button";

import { errorText } from "@katren/vue-collection-lib";

import { materialBalanceApi } from "@/api/materialBalance";
import GroupedMaterialGrid from "@/components/constructionManager/GroupedMaterialGrid.vue";
import ReportContainer from "@/components/reports/ReportContainer.vue";
import type { MaterialWorkbenchRow } from "@/types/constructionManagerWorkspace";
import { materialBalanceRowToWorkbenchRow } from "@/types/constructionManagerWorkspace";
import type { MaterialBalanceConstructionSite } from "@/types/materialBalance";

const props = defineProps<{
	site: MaterialBalanceConstructionSite | null;
	inventoryRevision?: number;
}>();

const { t } = useI18n();
const rows = ref<MaterialWorkbenchRow[]>([]);
const generatedAt = ref<Date | null>(null);
const loading = ref(false);
const loaded = ref(false);
const error = ref("");
let loadSequence = 0;

const reportFileName = computed(() => {
	return `material-balance-${props.site?.id ?? "site"}.xls`;
});

const formatDateTime = (value: Date | null): string => {
	return value?.toLocaleString("ru-RU") ?? "";
};

const load = async (constructionSiteID: number | null): Promise<void> => {
	const sequence = ++loadSequence;
	rows.value = [];
	generatedAt.value = null;
	loaded.value = false;
	error.value = "";

	if (constructionSiteID === null) {
		loading.value = false;
		return;
	}

	loading.value = true;
	try {
		const response =
			await materialBalanceApi.list(constructionSiteID);
		if (sequence !== loadSequence) {
			return;
		}
		rows.value = response.rows.map(
			materialBalanceRowToWorkbenchRow,
		);
		generatedAt.value = response.generated_at;
		loaded.value = true;
	} catch (caught: unknown) {
		if (sequence !== loadSequence) {
			return;
		}
		error.value = errorText(caught);
	} finally {
		if (sequence === loadSequence) {
			loading.value = false;
		}
	}
};

watch(
	() => [props.site?.id ?? null, props.inventoryRevision ?? 0] as const,
	([constructionSiteID]) => {
		void load(constructionSiteID);
	},
	{ immediate: true },
);
</script>

<template>
	<div class="w-full max-w-5xl">
		<ReportContainer
			:title="t('MaterialBalance.title')"
			:sheetName="t('MaterialBalance.sheetName')"
			:fileName="reportFileName"
			:hasContent="loaded"
		>
			<template #actions>
				<Button
					:label="t('Grid.commands.refresh')"
					icon="pi pi-refresh"
					severity="secondary"
					outlined
					:loading="loading"
					:disabled="props.site === null"
					@click="load(props.site?.id ?? null)"
				/>
			</template>

			<div
				v-if="props.site"
				class="mb-3 text-sm text-slate-600"
			>
				<div>
					<strong
						>{{
							t(
								"MaterialBalance.filters.constructionSite",
							)
						}}:</strong
					>
					{{ props.site.name }}
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

			<GroupedMaterialGrid
				:rows="rows"
				:loading="loading"
				:error="error"
				:emptyText="t('MaterialBalance.empty')"
			/>
		</ReportContainer>
	</div>
</template>
