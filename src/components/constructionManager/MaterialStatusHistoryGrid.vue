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
		width: "14rem",
	},
	{
		field: "material_name",
		headerKey: "ConstructionManagerWorkspace.status.columns.material",
		searchable: false,
		width: "32rem",
	},
	{
		field: "status",
		headerKey: "ConstructionManagerWorkspace.status.columns.status",
		format: formatStatus,
		searchable: false,
		width: "14rem",
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
		:api="api"
		:columns="columns"
		:commands="commands"
		dataKey="id"
		:getKey="getKey"
		:pageSize="30"
		:showCommandShortcuts="false"
		:showContextMenu="false"
	/>
</template>
