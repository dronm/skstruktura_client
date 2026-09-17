<script setup lang="ts">
import {
	CollectionListPage,
	defineCollection,
	type GridColumn,
} from "@katren/vue-collection-lib";

import { materialCollection as generatedMaterialCollection } from "@/collections/material.gen";
import { materialTypeReference } from "@/references/inventoryReferences";
import type { MaterialList } from "@/types/materialList.gen";

const materialTypeColumn: GridColumn<MaterialList> = {
	field: "material_type_id",
	headerKey: "Material.fields.material_type_id",
	sortable: true,
	sortField: "material_type->>'descr'",
	dataType: "reference",
	referenceField: "material_type",
	reference: materialTypeReference,
	width: "18rem",
};

const columns = generatedMaterialCollection.columns.flatMap((column) => {
	if (column.field === "material_type_id") {
		return [];
	}

	return column.field === "name"
		? [column, materialTypeColumn]
		: [column];
});

const materialCollection = defineCollection({
	...generatedMaterialCollection,
	columns,
});
</script>

<template>
	<CollectionListPage :collection="materialCollection" />
</template>
