<script setup lang="ts">
import { useI18n } from "vue-i18n";

import {
	CollectionGrid,
	type CollectionGridApi,
	type CollectionParams,
	type GridColumn,
	type GridCommand,
} from "@katren/vue-collection-lib";

import { constructionManagerWorkspaceApi } from "@/api/constructionManagerWorkspace";
import type { ConstructionManagerMaterialStatusHistory } from "@/types/constructionManagerMaterialStatus";

interface MaterialStatusHistoryKey {
	id: number;
}

type ReadonlyPayload = Record<string, never>;

const props = defineProps<{
	constructionSiteID: number;
	materialTypeID: number | null;
}>();

const { t } = useI18n();

const formatDate = (value: unknown): string => {
	return value instanceof Date ? value.toLocaleString("ru-RU") : "";
};

const formatStatus = (value: unknown): string => {
	return typeof value === "string"
		? t(`MaterialStatusType.${value}`)
		: "";
};

const api: CollectionGridApi<
	ConstructionManagerMaterialStatusHistory,
	MaterialStatusHistoryKey,
	ReadonlyPayload,
	ReadonlyPayload
> = {
	list: async (params: CollectionParams = {}) => {
		return await constructionManagerWorkspaceApi.materialStatusHistory(
			props.constructionSiteID,
			props.materialTypeID,
			params,
		);
	},
};

const columns: GridColumn<ConstructionManagerMaterialStatusHistory>[] = [
	{
		field: "created_at",
		headerKey: "ConstructionManagerWorkspace.status.columns.date",
		dataType: "datetime",
		format: formatDate,
		searchable: false,
		width: "11rem",
	},
	{
		field: "material_name",
		headerKey: "ConstructionManagerWorkspace.status.columns.material",
		searchable: false,
	},
	{
		field: "status",
		headerKey: "ConstructionManagerWorkspace.status.columns.status",
		format: formatStatus,
		searchable: false,
		width: "10rem",
	},
];

const commands: GridCommand<
	ConstructionManagerMaterialStatusHistory,
	MaterialStatusHistoryKey
>[] = [{ name: "refresh" }];

const getKey = (
	row: ConstructionManagerMaterialStatusHistory,
): MaterialStatusHistoryKey => ({
	id: row.id,
});
</script>

<template>
	<CollectionGrid
		class="status-history-grid"
		:api="api"
		:columns="columns"
		:commands="commands"
		dataKey="id"
		:getKey="getKey"
		:pageSize="30"
		:showCommandShortcuts="false"
		:showContextMenu="false"
	>
		<template #body-created_at="{ value }">
			<span class="status-history-label">{{
				t(
					"ConstructionManagerWorkspace.status.columns.date",
				)
			}}</span>
			<span>{{ formatDate(value) }}</span>
		</template>
		<template #body-material_name="{ value }">
			<span>{{ value }}</span>
		</template>
		<template #body-status="{ value }">
			<span class="status-history-label">{{
				t(
					"ConstructionManagerWorkspace.status.columns.status",
				)
			}}</span>
			<span>{{ formatStatus(value) }}</span>
		</template>
	</CollectionGrid>
</template>

<style scoped>
.status-history-grid,
.status-history-grid :deep(.p-datatable),
.status-history-grid :deep(.p-datatable-table-container) {
	max-width: 100%;
	min-width: 0;
}

.status-history-grid :deep(.p-datatable-table) {
	width: 100%;
	min-width: 0 !important;
	table-layout: fixed;
}

.status-history-grid :deep(.p-datatable-thead > tr > th),
.status-history-grid :deep(.p-datatable-tbody > tr > td),
.status-history-grid :deep(.crud-grid-cell-content) {
	white-space: normal;
	overflow-wrap: anywhere;
}

.status-history-grid :deep(.p-paginator),
.status-history-grid :deep(.p-paginator-content) {
	max-width: 100%;
	min-width: 0;
	flex-wrap: wrap;
}

.status-history-label {
	display: none;
}

@media (max-width: 639px) {
	.status-history-grid :deep(.p-datatable-table),
	.status-history-grid :deep(.p-datatable-tbody),
	.status-history-grid :deep(.p-datatable-tfoot) {
		display: block;
		width: 100%;
	}

	.status-history-grid :deep(.p-datatable-thead) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
	}

	.status-history-grid :deep(.p-datatable-tbody > tr),
	.status-history-grid :deep(.p-datatable-tfoot > tr) {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.375rem 0.75rem;
		padding: 0.75rem;
		border-bottom: 1px solid var(--p-content-border-color, #e2e8f0);
	}

	.status-history-grid :deep(.p-datatable-tbody > tr > td),
	.status-history-grid :deep(.p-datatable-tfoot > tr > td) {
		display: block;
		width: auto !important;
		min-width: 0;
		padding: 0 !important;
		border: 0;
	}

	.status-history-grid :deep(.p-datatable-tbody > tr > td:nth-child(2)),
	.status-history-grid :deep(.p-datatable-tbody > tr > td:only-child),
	.status-history-grid :deep(.p-datatable-tfoot > tr > td:nth-child(2)) {
		grid-column: 1 / -1;
		grid-row: 1;
		font-weight: 500;
	}

	.status-history-grid :deep(.crud-grid-cell-content) {
		display: block;
		min-width: 0;
		padding: 0;
	}

	.status-history-label {
		display: block;
		margin-bottom: 0.125rem;
		color: var(--p-text-muted-color, #64748b);
		font-size: 0.75rem;
	}

	.status-history-grid :deep(.p-paginator) {
		padding: 0.5rem 0.25rem;
	}

	.status-history-grid :deep(.p-paginator-content) {
		gap: 0.25rem;
	}

	.status-history-grid :deep(.p-paginator-pages) {
		flex-wrap: wrap;
		justify-content: center;
	}

	.status-history-grid :deep(.p-paginator-page),
	.status-history-grid :deep(.p-paginator-first),
	.status-history-grid :deep(.p-paginator-prev),
	.status-history-grid :deep(.p-paginator-next),
	.status-history-grid :deep(.p-paginator-last) {
		min-width: 2rem;
		width: 2rem;
		height: 2rem;
	}
}
</style>
