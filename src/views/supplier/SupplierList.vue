<script setup lang="ts">
import {
	CollectionListPage,
	defineCollection,
} from "@katren/vue-collection-lib";

import { supplierApi } from "@/api/supplier.gen";
import type {
	Supplier,
	SupplierKey,
	SupplierNew,
	SupplierUpd,
} from "@/types/supplier.gen";

const collection = defineCollection<
	Supplier,
	SupplierKey,
	SupplierNew,
	SupplierUpd
>({
	titleKey: "Supplier.title",
	api: supplierApi,
	columns: [
		{
			field: "id",
			headerKey: "Supplier.fields.id",
			sortable: true,
			dataType: "number",
			align: "right",
			width: "8rem",
		},
		{
			field: "name",
			headerKey: "Supplier.fields.name",
			sortable: true,
			width: "32rem",
		},
		{
			field: "inn",
			headerKey: "Supplier.fields.inn",
			sortable: true,
			width: "8rem",
		},
		{
			field: "is_active",
			headerKey: "Supplier.fields.is_active",
			sortable: true,
			dataType: "boolean",
			width: "8rem",
		},
	],
	dataKey: "id",
	getKey: (row) => ({ id: row.id }),
	routes: {
		create: () => ({ name: "supplierCreate" }),
		edit: (row) => ({
			name: "supplierEdit",
			params: { id: String(row.id) },
		}),
		copy: (row) => ({
			name: "supplierCreate",
			query: { copy_id: String(row.id) },
		}),
	},
	stateKey: "supplier-grid",
	pageSize: 30,
	showCommandShortcuts: false,
});
</script>

<template>
	<CollectionListPage :collection="collection" />
</template>
