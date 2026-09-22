<script setup lang="ts">
import { useRouter } from "vue-router";

import {
	CollectionListPage,
	defineCollection,
	type GridCommand,
} from "@katren/vue-collection-lib";

import { materialTransferApi } from "@/api/materialTransfer.gen";
import { materialTransferDocumentApi } from "@/api/materialDocuments";
import type {
	MaterialTransferKey,
	MaterialTransferNew,
	MaterialTransferUpd,
} from "@/types/materialTransfer.gen";
import type { MaterialTransferDocument } from "@/types/materialDocuments";
import type { MaterialTransferList } from "@/types/materialTransferList.gen";
import { openMaterialDocumentPrint } from "@/utils/materialDocumentPrint";
import { formatReference } from "@/utils/reference";

const formatDate = (value: unknown): string =>
	value instanceof Date ? value.toLocaleString("ru-RU") : "";

const router = useRouter();
const commands: GridCommand<MaterialTransferList, MaterialTransferKey>[] = [
	{ name: "create" },
	{ name: "edit" },
	{ name: "copy" },
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
	{ name: "delete" },
	{ name: "search" },
	{ name: "refresh" },
];

const collection = defineCollection<
	MaterialTransferList,
	MaterialTransferKey,
	MaterialTransferNew,
	MaterialTransferUpd,
	MaterialTransferDocument
>({
	titleKey: "MaterialTransfer.title",
	api: {
		serviceName: materialTransferApi.serviceName,
		list: materialTransferApi.list,
		detail: materialTransferDocumentApi.detail,
		delete: materialTransferApi.delete,
	},
	columns: [
		{
			field: "id",
			headerKey: "MaterialTransfer.fields.id",
			sortable: true,
			dataType: "number",
			align: "right",
			width: "8rem",
		},
		{
			field: "date",
			headerKey: "MaterialTransfer.fields.date",
			sortable: true,
			dataType: "date",
			format: formatDate,
			width: "14rem",
		},
		{
			field: "source_construction_site",
			headerKey: "MaterialTransfer.fields.source_construction_site_id",
			sortable: true,
			sortField: "source_construction_site->>'descr'",
			format: formatReference,
			width: "18rem",
		},
		{
			field: "destination_construction_site",
			headerKey: "MaterialTransfer.fields.destination_construction_site_id",
			sortable: true,
			sortField: "destination_construction_site->>'descr'",
			format: formatReference,
			width: "18rem",
		},
	],
	commands,
	dataKey: "id",
	getKey: (row) => ({ id: row.id }),
	routes: {
		create: () => ({ name: "materialTransferCreate" }),
		edit: (row) => ({
			name: "materialTransferEdit",
			params: { id: String(row.id) },
		}),
		copy: (row) => ({
			name: "materialTransferCreate",
			query: { copy_id: String(row.id) },
		}),
	},
	stateKey: "materialTransfer-grid",
	pageSize: 30,
	showCommandShortcuts: false,
});
</script>

<template>
	<CollectionListPage :collection="collection" />
</template>
