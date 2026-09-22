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
import type { MaterialTransferKey } from "@/types/materialTransfer.gen";
import type { MaterialTransferList } from "@/types/materialTransferList.gen";
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
	MaterialTransferList,
	MaterialTransferKey,
	ReadonlyPayload,
	ReadonlyPayload
> = {
	list: async (params: CollectionParams = {}) => {
		return await constructionManagerWorkspaceApi.materialTransfers(
			props.constructionSiteID,
			params,
		);
	},
};

const columns: GridColumn<MaterialTransferList>[] = [
	{
		field: "id",
		headerKey: "MaterialTransfer.fields.id",
		dataType: "number",
		align: "right",
		searchable: false,
		width: "7rem",
	},
	{
		field: "date",
		headerKey: "MaterialTransfer.fields.date",
		dataType: "datetime",
		format: formatDate,
		searchable: false,
		width: "14rem",
	},
	{
		field: "source_construction_site",
		headerKey: "MaterialTransfer.fields.source_construction_site_id",
		format: formatReference,
		searchable: false,
		width: "22rem",
	},
	{
		field: "destination_construction_site",
		headerKey: "MaterialTransfer.fields.destination_construction_site_id",
		format: formatReference,
		searchable: false,
		width: "22rem",
	},
	{
		field: "comment",
		headerKey: "MaterialTransfer.fields.comment",
		searchable: false,
		width: "28rem",
	},
];

const commands: GridCommand<MaterialTransferList, MaterialTransferKey>[] = [
	{
		name: "print",
		labelKey: "Grid.commands.print",
		icon: "pi pi-print",
		enabled: (row) => row !== null,
		handler: ({ row }) => {
			if (row !== null) {
				openMaterialDocumentPrint(
					router,
					"transfer",
					row.id,
				);
			}
		},
	},
	{ name: "refresh" },
];

const getKey = (row: MaterialTransferList): MaterialTransferKey => ({
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
