<script setup lang="ts">
import {
	CollectionListPage,
	defineCollection,
} from "@katren/vue-collection-lib";

import { materialConsumptionApi } from "@/api/materialConsumption.gen";
import { materialConsumptionDocumentApi } from "@/api/materialDocuments";
import type {
	MaterialConsumptionKey,
	MaterialConsumptionNew,
	MaterialConsumptionUpd,
} from "@/types/materialConsumption.gen";
import type { MaterialConsumptionDocument } from "@/types/materialDocuments";
import type { MaterialConsumptionList } from "@/types/materialConsumptionList.gen";
import { formatReference } from "@/utils/reference";

const formatDate = (value: unknown): string =>
	value instanceof Date ? value.toLocaleString("ru-RU") : "";

const collection = defineCollection<
	MaterialConsumptionList,
	MaterialConsumptionKey,
	MaterialConsumptionNew,
	MaterialConsumptionUpd,
	MaterialConsumptionDocument
>({
	titleKey: "MaterialConsumption.title",
	api: {
		serviceName: materialConsumptionApi.serviceName,
		list: materialConsumptionApi.list,
		detail: materialConsumptionDocumentApi.detail,
		delete: materialConsumptionApi.delete,
	},
	columns: [
		{
			field: "id",
			headerKey: "MaterialConsumption.fields.id",
			sortable: true,
			dataType: "number",
			align: "right",
			width: "8rem",
		},
		{
			field: "date",
			headerKey: "MaterialConsumption.fields.date",
			sortable: true,
			dataType: "date",
			format: formatDate,
			width: "14rem",
		},
		{
			field: "construction_site",
			headerKey: "MaterialConsumption.fields.construction_site_id",
			sortable: true,
			sortField: "construction_site->>'descr'",
			format: formatReference,
			width: "18rem",
		},
	],
	dataKey: "id",
	getKey: (row) => ({ id: row.id }),
	routes: {
		create: () => ({ name: "materialConsumptionCreate" }),
		edit: (row) => ({
			name: "materialConsumptionEdit",
			params: { id: String(row.id) },
		}),
		copy: (row) => ({
			name: "materialConsumptionCreate",
			query: { copy_id: String(row.id) },
		}),
	},
	stateKey: "materialConsumption-grid",
	pageSize: 30,
	showCommandShortcuts: false,
});
</script>

<template>
	<CollectionListPage :collection="collection" />
</template>
