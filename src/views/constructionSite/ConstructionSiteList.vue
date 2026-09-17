<script setup lang="ts">
import {
	CollectionListPage,
	defineCollection,
} from "@katren/vue-collection-lib";

import { constructionSiteApi } from "@/api/constructionSite.gen";
import type {
	ConstructionSite,
	ConstructionSiteKey,
	ConstructionSiteNew,
	ConstructionSiteUpd,
} from "@/types/constructionSite.gen";

const collection = defineCollection<
	ConstructionSite,
	ConstructionSiteKey,
	ConstructionSiteNew,
	ConstructionSiteUpd
>({
	titleKey: "ConstructionSite.title",
	api: constructionSiteApi,
	columns: [
		{
			field: "id",
			headerKey: "ConstructionSite.fields.id",
			sortable: true,
			dataType: "number",
			align: "right",
			width: "8rem",
		},
		{
			field: "name",
			headerKey: "ConstructionSite.fields.name",
			sortable: true,
			width: "32rem",
		},
		{
			field: "is_active",
			headerKey: "ConstructionSite.fields.is_active",
			sortable: true,
			dataType: "boolean",
			width: "8rem",
		},
	],
	dataKey: "id",
	getKey: (row) => ({ id: row.id }),
	routes: {
		create: () => ({ name: "constructionSiteCreate" }),
		edit: (row) => ({
			name: "constructionSiteEdit",
			params: { id: String(row.id) },
		}),
		copy: (row) => ({
			name: "constructionSiteCreate",
			query: { copy_id: String(row.id) },
		}),
	},
	stateKey: "constructionSite-grid",
	pageSize: 30,
	showCommandShortcuts: false,
});
</script>

<template>
	<CollectionListPage :collection="collection" />
</template>
