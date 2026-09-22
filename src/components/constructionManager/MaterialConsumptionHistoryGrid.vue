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
import type { MaterialConsumptionKey } from "@/types/materialConsumption.gen";
import type { MaterialConsumptionList } from "@/types/materialConsumptionList.gen";
import { openMaterialDocumentPrint } from "@/utils/materialDocumentPrint";

const props = defineProps<{
	constructionSiteID: number;
}>();
const router = useRouter();

type ReadonlyPayload = Record<string, never>;

const formatDate = (value: unknown): string => {
	return value instanceof Date ? value.toLocaleString("ru-RU") : "";
};

const api: CollectionGridApi<
	MaterialConsumptionList,
	MaterialConsumptionKey,
	ReadonlyPayload,
	ReadonlyPayload
> = {
	list: async (params: CollectionParams = {}) => {
		return await constructionManagerWorkspaceApi.materialConsumptions(
			props.constructionSiteID,
			params,
		);
	},
};

const columns: GridColumn<MaterialConsumptionList>[] = [
	{
		field: "id",
		headerKey: "MaterialConsumption.fields.id",
		dataType: "number",
		align: "right",
		searchable: false,
		width: "7rem",
	},
	{
		field: "date",
		headerKey: "MaterialConsumption.fields.date",
		dataType: "datetime",
		format: formatDate,
		searchable: false,
		width: "14rem",
	},
	{
		field: "comment",
		headerKey: "MaterialConsumption.fields.comment",
		searchable: false,
		width: "32rem",
	},
];

const commands: GridCommand<MaterialConsumptionList, MaterialConsumptionKey>[] =
	[
		{
			name: "print",
			labelKey: "Grid.commands.print",
			icon: "pi pi-print",
			enabled: (row) => row !== null,
			handler: ({ row }) => {
				if (row !== null) {
					openMaterialDocumentPrint(
						router,
						"consumption",
						row.id,
					);
				}
			},
		},
		{ name: "refresh" },
	];

const getKey = (row: MaterialConsumptionList): MaterialConsumptionKey => ({
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
