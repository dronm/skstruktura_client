<script setup lang="ts">
import type { MaterialTransferDocumentForm } from "@/types/materialDocuments";
import { useI18n } from "vue-i18n";

import {
	CollectionGrid,
	type GridColumn,
	type GridCommand,
} from "@katren/vue-collection-lib";

import { materialApi } from "@/api/material.gen";
import { useLocalDocumentCollection } from "@/composables/useLocalDocumentCollection";
import {
	materialReference,
	measureUnitReference,
} from "@/references/inventoryReferences";
import type {
	MaterialTransferItemKey,
} from "@/types/materialTransferItem.gen";

type MaterialTransferItem = MaterialTransferDocumentForm["items"][number];

const model = defineModel<MaterialTransferItem[]>("items", {
	required: true,
});

const { t } = useI18n();

const updateMaterial = async (row: MaterialTransferItem): Promise<void> => {
	const materialId = row.material_id;
	row.measure_unit_id = 0;

	if (materialId <= 0) {
		return;
	}

	try {
		const material = await materialApi.detail({ id: materialId });
		if (
			row.material_id !== materialId ||
			row.measure_unit_id !== 0
		) {
			return;
		}

		row.measure_unit_id = material.measure_unit_id;
	} catch {
		return;
	}
};

const columns: GridColumn<MaterialTransferItem>[] = [
	{
		field: "line_num",
		headerKey: "MaterialTransferItem.fields.line_num",
		sortable: true,
		editable: true,
		dataType: "number",
		align: "right",
		width: "6rem",
		editorProps: {
			min: 1,
			useGrouping: false,
		},
	},
	{
		field: "material_id",
		referenceField: "material",
		headerKey: "MaterialTransferItem.fields.material_id",
		editable: true,
		dataType: "reference",
		reference: materialReference,
		searchable: false,
		width: "28rem",
		editorProps: {
			required: true,
		},
		setValue: updateMaterial,
	},
	{
		field: "measure_unit_id",
		referenceField: "measure_unit",
		headerKey: "MaterialTransferItem.fields.measure_unit_id",
		editable: true,
		dataType: "reference",
		reference: measureUnitReference,
		searchable: false,
		width: "14rem",
		editorProps: {
			required: true,
		},
	},
	{
		field: "quant",
		headerKey: "MaterialTransferItem.fields.quant",
		editable: true,
		dataType: "number",
		align: "right",
		width: "12rem",
		editorProps: {
			min: 0,
			minFractionDigits: 0,
			maxFractionDigits: 4,
		},
	},
];

const commands: GridCommand<MaterialTransferItem, MaterialTransferItemKey>[] = [
	{ name: "create" },
	{ name: "edit" },
	{ name: "delete" },
];

const collection = useLocalDocumentCollection<MaterialTransferItem>({
	items: model,
	createDefaults: () => ({
		material_transfer_id: 0,
		material_id: 0,
		measure_unit_id: 0,
		quant: 0,
	}),
});
</script>

<template>
	<div class="space-y-2">
		<h3 class="text-lg font-semibold">
			{{ t("MaterialTransferItem.title") }}
		</h3>
		<CollectionGrid
			:api="collection.api"
			:columns="columns"
			:commands="commands"
			dataKey="id"
			:getKey="collection.getKey"
			:createRow="collection.createRow"
			:createModel="collection.createModel"
			editMode="inline"
			:defaultSorter="collection.defaultSorter"
			stateKey="materialTransferDocumentItems"
			:pageSize="100"
			:showCommandShortcuts="false"
		/>
	</div>
</template>
