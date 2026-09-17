<script setup lang="ts">
import type { MaterialReceiptDocumentForm } from "@/types/materialDocuments";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
	CollectionGrid,
	type GridColumn,
	type GridCommand,
} from "@katren/vue-collection-lib";

import { materialApi } from "@/api/material.gen";
import CollectionTotals from "@/components/collections/CollectionTotals.vue";
import VatPercentInput from "@/components/inputs/VatPercentInput.vue";
import { useLocalDocumentCollection } from "@/composables/useLocalDocumentCollection";
import {
	materialReference,
	measureUnitReference,
	constructionSiteReference,
} from "@/references/inventoryReferences";
import type {
	MaterialReceiptItemKey,
} from "@/types/materialReceiptItem.gen";
import type { CollectionTotalDefinition } from "@/types/collectionTotals";
import { calculateIncludedVat, normalizeVatPercent } from "@/utils/vat";
import { normalizeNullableID } from "@/utils/nullableID";

type MaterialReceiptItem = MaterialReceiptDocumentForm["items"][number];

const model = defineModel<MaterialReceiptItem[]>("items", {
	required: true,
});

const { t } = useI18n();

const round = (value: number, digits: number): number => {
	const factor = 10 ** digits;
	return Math.round((value + Number.EPSILON) * factor) / factor;
};

const numberValue = (value: unknown): number => {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const updateMaterial = async (row: MaterialReceiptItem): Promise<void> => {
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

const updateVatAmount = (row: MaterialReceiptItem): void => {
	row.vat_amount = calculateIncludedVat(row.amount, row.vat_percent);
};

const updateLineAmount = (row: MaterialReceiptItem): void => {
	row.amount = round(row.quant * row.price, 2);
	updateVatAmount(row);
};

const updateQuant = (row: MaterialReceiptItem): void => {
	updateLineAmount(row);
};

const updatePrice = (row: MaterialReceiptItem): void => {
	updateLineAmount(row);
};

const updateAmount = (row: MaterialReceiptItem): void => {
	row.price = row.quant > 0 ? round(row.amount / row.quant, 6) : 0;
	updateVatAmount(row);
};

const updateVatPercent = (row: MaterialReceiptItem): void => {
	updateVatAmount(row);
};

const columns: GridColumn<MaterialReceiptItem>[] = [
	{
		field: "line_num",
		headerKey: "MaterialReceiptItem.fields.line_num",
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
		headerKey: "MaterialReceiptItem.fields.material_id",
		editable: true,
		dataType: "reference",
		normalizeValue: numberValue,
		reference: materialReference,
		searchable: false,
		width: "24rem",
		editorProps: {
			required: true,
		},
		setValue: updateMaterial,
	},
	{
		field: "measure_unit_id",
		referenceField: "measure_unit",
		headerKey: "MaterialReceiptItem.fields.measure_unit_id",
		editable: true,
		dataType: "reference",
		normalizeValue: numberValue,
		reference: measureUnitReference,
		searchable: false,
		width: "12rem",
		editorProps: {
			required: true,
		},
	},
	{
		field: "construction_site_id",
		referenceField: "construction_site",
		headerKey: "MaterialReceiptItem.fields.construction_site_id",
		editable: true,
		dataType: "reference",
		normalizeValue: normalizeNullableID,
		reference: constructionSiteReference,
		searchable: false,
		width: "18rem",
	},
	{
		field: "quant",
		headerKey: "MaterialReceiptItem.fields.quant",
		editable: true,
		dataType: "number",
		normalizeValue: (value) => round(numberValue(value), 4),
		align: "right",
		width: "10rem",
		editorProps: {
			min: 0,
			minFractionDigits: 0,
			maxFractionDigits: 4,
		},
		setValue: updateQuant,
	},
	{
		field: "price",
		headerKey: "MaterialReceiptItem.fields.price",
		editable: true,
		dataType: "number",
		normalizeValue: (value) => round(numberValue(value), 6),
		align: "right",
		width: "10rem",
		editorProps: {
			min: 0,
			minFractionDigits: 2,
			maxFractionDigits: 6,
		},
		setValue: updatePrice,
	},
	{
		field: "amount",
		headerKey: "MaterialReceiptItem.fields.amount",
		editable: true,
		dataType: "number",
		normalizeValue: (value) => round(numberValue(value), 2),
		align: "right",
		width: "12rem",
		editorProps: {
			min: 0,
			minFractionDigits: 2,
			maxFractionDigits: 2,
		},
		setValue: updateAmount,
	},
	{
		field: "vat_percent",
		headerKey: "MaterialReceiptItem.fields.vat_percent",
		editable: true,
		dataType: "number",
		normalizeValue: normalizeVatPercent,
		align: "right",
		width: "9rem",
		format: (value) => `${numberValue(value)}%`,
		setValue: updateVatPercent,
	},
	{
		field: "vat_amount",
		headerKey: "MaterialReceiptItem.fields.vat_amount",
		editable: true,
		dataType: "number",
		normalizeValue: (value) => round(numberValue(value), 2),
		align: "right",
		width: "12rem",
		editorProps: {
			min: 0,
			minFractionDigits: 2,
			maxFractionDigits: 2,
		},
	},
];

const totalDefinitions = computed<
	CollectionTotalDefinition<MaterialReceiptItem>[]
>(() => [
	{
		field: "amount",
		label: t("MaterialReceiptItem.fields.amount"),
		fractionDigits: 2,
	},
	{
		field: "vat_amount",
		label: t("MaterialReceiptItem.fields.vat_amount"),
		fractionDigits: 2,
	},
]);

const commands: GridCommand<MaterialReceiptItem, MaterialReceiptItemKey>[] = [
	{ name: "create" },
	{ name: "edit" },
	{ name: "delete" },
];

const collection = useLocalDocumentCollection<MaterialReceiptItem>({
	items: model,
	createDefaults: () => ({
		material_receipt_id: 0,
		material_id: 0,
		measure_unit_id: 0,
		construction_site_id: null,
		quant: 0,
		price: 0,
		amount: 0,
		vat_percent: 0,
		vat_amount: 0,
	}),
});
</script>

<template>
	<div class="space-y-2">
		<h3 class="text-lg font-semibold">
			{{ t("MaterialReceiptItem.title") }}
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
			stateKey="materialReceiptDocumentItems"
			:pageSize="100"
			:showCommandShortcuts="false"
		>
			<template #editor-vat_percent="{ value, updateValue }">
				<VatPercentInput
					:modelValue="numberValue(value)"
					@update:modelValue="updateValue"
				/>
			</template>
		</CollectionGrid>
		<CollectionTotals
			:items="model"
			:totals="totalDefinitions"
			:label="t('Grid.totals')"
		/>
	</div>
</template>
