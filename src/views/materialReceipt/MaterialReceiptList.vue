<script setup lang="ts">
import {
	CollectionListPage,
	defineCollection,
} from "@katren/vue-collection-lib";

import { materialReceiptApi } from "@/api/materialReceipt.gen";
import { materialReceiptDocumentApi } from "@/api/materialDocuments";
import type {
	MaterialReceiptKey,
	MaterialReceiptNew,
	MaterialReceiptUpd,
} from "@/types/materialReceipt.gen";
import type { MaterialReceiptDocument } from "@/types/materialDocuments";
import type { MaterialReceiptList } from "@/types/materialReceiptList.gen";
import { formatReference } from "@/utils/reference";

const formatDate = (value: unknown): string =>
	value instanceof Date ? value.toLocaleString("ru-RU") : "";

const collection = defineCollection<
	MaterialReceiptList,
	MaterialReceiptKey,
	MaterialReceiptNew,
	MaterialReceiptUpd,
	MaterialReceiptDocument
>({
	titleKey: "MaterialReceipt.title",
	api: {
		serviceName: materialReceiptApi.serviceName,
		list: materialReceiptApi.list,
		detail: materialReceiptDocumentApi.detail,
		delete: materialReceiptApi.delete,
	},
	columns: [
		{
			field: "id",
			headerKey: "MaterialReceipt.fields.id",
			sortable: true,
			dataType: "number",
			align: "right",
			width: "8rem",
		},
		{
			field: "date",
			headerKey: "MaterialReceipt.fields.date",
			sortable: true,
			dataType: "date",
			format: formatDate,
			width: "14rem",
		},
		{
			field: "number",
			headerKey: "MaterialReceipt.fields.number",
			sortable: true,
			width: "12rem",
		},
		{
			field: "construction_site",
			headerKey: "MaterialReceipt.fields.construction_site_id",
			sortable: true,
			sortField: "construction_site->>'descr'",
			format: formatReference,
			width: "18rem",
		},
		{
			field: "supplier",
			headerKey: "MaterialReceipt.fields.supplier_id",
			sortable: true,
			sortField: "supplier->>'descr'",
			format: formatReference,
			width: "18rem",
		},
	],
	dataKey: "id",
	getKey: (row) => ({ id: row.id }),
	routes: {
		create: () => ({ name: "materialReceiptCreate" }),
		edit: (row) => ({
			name: "materialReceiptEdit",
			params: { id: String(row.id) },
		}),
		copy: (row) => ({
			name: "materialReceiptCreate",
			query: { copy_id: String(row.id) },
		}),
	},
	stateKey: "materialReceipt-grid",
	pageSize: 30,
	showCommandShortcuts: false,
});
</script>

<template>
	<CollectionListPage :collection="collection" />
</template>
