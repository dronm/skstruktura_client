<script setup lang="ts">
import { useRouter } from "vue-router";

import {
	CollectionGrid,
	type CollectionGridApi,
	type CollectionParams,
	type GridColumn,
	type GridCommand,
} from "@katren/vue-collection-lib";

import { constructionManagerWorkspaceApi } from "@/api/constructionManagerWorkspace";
import type { MaterialRequestKey } from "@/types/materialRequest.gen";
import type { MaterialRequestList } from "@/types/materialRequestList.gen";
import { openMaterialDocumentPrint } from "@/utils/materialDocumentPrint";
import { formatReference } from "@/utils/reference";

const props = defineProps<{
	constructionSiteID: number;
}>();
const router = useRouter();

type ReadonlyPayload = Record<string, never>;

const formatDate = (value: unknown): string => {
	return value instanceof Date ? value.toLocaleString("ru-RU") : "";
};

const api: CollectionGridApi<
	MaterialRequestList,
	MaterialRequestKey,
	ReadonlyPayload,
	ReadonlyPayload
> = {
	list: async (params: CollectionParams = {}) => {
		return await constructionManagerWorkspaceApi.materialRequests(
			props.constructionSiteID,
			params,
		);
	},
};

const columns: GridColumn<MaterialRequestList>[] = [
	{
		field: "id",
		headerKey: "MaterialRequest.fields.id",
		dataType: "number",
		align: "right",
		searchable: false,
		width: "7rem",
	},
	{
		field: "date",
		headerKey: "MaterialRequest.fields.date",
		dataType: "datetime",
		format: formatDate,
		searchable: false,
		width: "14rem",
	},
	{
		field: "construction_manager",
		headerKey: "MaterialRequest.fields.construction_manager_id",
		format: formatReference,
		searchable: false,
		width: "20rem",
	},
	{
		field: "comment",
		headerKey: "MaterialRequest.fields.comment",
		searchable: false,
		width: "28rem",
	},
	{
		field: "status",
		headerKey: "MaterialRequest.fields.status_id",
		format: formatReference,
		searchable: false,
		width: "14rem",
	},
];

const commands: GridCommand<MaterialRequestList, MaterialRequestKey>[] = [
	{
		name: "print",
		labelKey: "Grid.commands.print",
		icon: "pi pi-print",
		enabled: (row) => row !== null,
		handler: ({ row }) => {
			if (row !== null) {
				openMaterialDocumentPrint(
					router,
					"request",
					row.id,
				);
			}
		},
	},
	{ name: "refresh" },
];

const getKey = (row: MaterialRequestList): MaterialRequestKey => ({
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
