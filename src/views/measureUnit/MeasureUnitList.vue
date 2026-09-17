<script setup lang="ts">
import {
	CollectionListPage,
	defineCollection,
} from "@katren/vue-collection-lib";

import { measureUnitApi } from "@/api/measureUnit.gen";
import type {
	MeasureUnit,
	MeasureUnitKey,
	MeasureUnitNew,
	MeasureUnitUpd,
} from "@/types/measureUnit.gen";

const collection = defineCollection<
	MeasureUnit,
	MeasureUnitKey,
	MeasureUnitNew,
	MeasureUnitUpd
>({
	titleKey: "MeasureUnit.title",
	api: measureUnitApi,
	columns: [
		{
			field: "id",
			headerKey: "MeasureUnit.fields.id",
			sortable: true,
			dataType: "number",
			align: "right",
			width: "8rem",
		},
		{
			field: "name",
			headerKey: "MeasureUnit.fields.name",
			sortable: true,
			width: "32rem",
		},
		{
			field: "is_active",
			headerKey: "MeasureUnit.fields.is_active",
			sortable: true,
			dataType: "boolean",
			width: "8rem",
		},
	],
	dataKey: "id",
	getKey: (row) => ({ id: row.id }),
	routes: {
		create: () => ({ name: "measureUnitCreate" }),
		edit: (row) => ({
			name: "measureUnitEdit",
			params: { id: String(row.id) },
		}),
		copy: (row) => ({
			name: "measureUnitCreate",
			query: { copy_id: String(row.id) },
		}),
	},
	stateKey: "measureUnit-grid",
	pageSize: 30,
	showCommandShortcuts: false,
});
</script>

<template>
	<CollectionListPage :collection="collection" />
</template>
