<script setup lang="ts">
import { useI18n } from "vue-i18n";

import {
	CollectionGrid,
	type GridColumn,
	type GridCommand,
} from "@katren/vue-collection-lib";

import { materialApi } from "@/api/material";
import { materialRequestStatusApi } from "@/api/materialRequestStatus.gen";
import { orderImportanceApi } from "@/api/orderImportance.gen";
import MaterialRequestStatusReferenceSelect from "@/components/references/MaterialRequestStatusReferenceSelect.vue";
import OrderImportanceReferenceSelect from "@/components/references/OrderImportanceReferenceSelect.vue";
import { useLocalDocumentCollection } from "@/composables/useLocalDocumentCollection";
import {
	materialReference,
	materialRequestStatusReference,
	measureUnitReference,
	orderImportanceReference,
	supplierReference,
} from "@/references/inventoryReferences";
import { useAuthStore } from "@/stores/useAuthStore";
import type { MaterialRequestDocumentForm } from "@/types/materialDocuments";
import type { MaterialRequestItemKey } from "@/types/materialRequestItem.gen";
import { normalizeNullableID } from "@/utils/nullableID";

type MaterialRequestItem = MaterialRequestDocumentForm["items"][number];

const DRAFT_STATUS_ID = 1;

const model = defineModel<MaterialRequestItem[]>("items", {
	required: true,
});

const { t } = useI18n();
const authStore = useAuthStore();
const roleID = authStore.user?.role_id;
const canEditRequest =
	roleID === "admin" || roleID === "construction_site_manager";
const canManageFulfillment = roleID === "admin";

const numberValue = (value: unknown): number => {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const positiveQuantity = (value: unknown): number => {
	const number = numberValue(value);
	return Math.round((number + Number.EPSILON) * 10_000) / 10_000;
};

const nullableDate = (value: unknown): Date | null => {
	return value instanceof Date && !Number.isNaN(value.getTime())
		? value
		: null;
};

const formatDate = (value: unknown): string => {
	return value instanceof Date ? value.toLocaleDateString("ru-RU") : "";
};

const updateMaterial = async (row: MaterialRequestItem): Promise<void> => {
	const materialID = row.material_id;
	row.measure_unit_id = 0;
	row.measure_unit = {};

	if (materialID <= 0) {
		return;
	}

	try {
		const material = await materialApi.detail({ id: materialID });
		if (
			row.material_id !== materialID ||
			row.measure_unit_id !== 0
		) {
			return;
		}

		row.measure_unit_id = material.measure_unit_id;
		row.measure_unit = material.measure_unit;
	} catch {
		return;
	}
};

const updateOrderImportance = async (
	row: MaterialRequestItem,
): Promise<void> => {
	const importanceID = row.order_importance_id;
	row.order_importance = {};
	if (importanceID <= 0) {
		return;
	}

	try {
		const importance = await orderImportanceApi.detail({
			id: importanceID,
		});
		if (row.order_importance_id === importanceID) {
			row.order_importance = {
				keys: { id: importance.id },
				descr: importance.name,
				dataType: "orderImportances",
			};
		}
	} catch {
		return;
	}
};

const updateStatus = async (row: MaterialRequestItem): Promise<void> => {
	const statusID = row.status_id;
	row.status = {};
	if (statusID <= 0) {
		return;
	}

	try {
		const status = await materialRequestStatusApi.detail({
			id: statusID,
		});
		if (row.status_id === statusID) {
			row.status = {
				keys: { id: status.id },
				descr: status.name,
				dataType: "materialRequestStatuses",
			};
		}
	} catch {
		return;
	}
};

const columns: GridColumn<MaterialRequestItem>[] = [
	{
		field: "line_num",
		headerKey: "MaterialRequestItem.fields.line_num",
		sortable: true,
		editable: canEditRequest,
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
		headerKey: "MaterialRequestItem.fields.material_id",
		editable: canEditRequest,
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
		headerKey: "MaterialRequestItem.fields.measure_unit_id",
		dataType: "reference",
		normalizeValue: numberValue,
		reference: measureUnitReference,
		width: "11rem",
	},
	{
		field: "quant",
		headerKey: "MaterialRequestItem.fields.quant",
		editable: canEditRequest,
		dataType: "number",
		normalizeValue: positiveQuantity,
		align: "right",
		width: "10rem",
		editorProps: {
			min: 0.0001,
			minFractionDigits: 0,
			maxFractionDigits: 4,
		},
	},
	{
		field: "order_importance_id",
		referenceField: "order_importance",
		headerKey: "MaterialRequestItem.fields.order_importance_id",
		editable: canEditRequest,
		dataType: "reference",
		normalizeValue: numberValue,
		reference: orderImportanceReference,
		width: "14rem",
		editorProps: {
			required: true,
		},
		setValue: updateOrderImportance,
	},
	{
		field: "required_date",
		headerKey: "MaterialRequestItem.fields.required_date",
		editable: canEditRequest,
		dataType: "date",
		normalizeValue: nullableDate,
		format: formatDate,
		width: "13rem",
		editorProps: {
			showClear: true,
			showIcon: true,
		},
	},
	{
		field: "supplier_id",
		referenceField: "supplier",
		headerKey: "MaterialRequestItem.fields.supplier_id",
		editable: canManageFulfillment,
		dataType: "reference",
		normalizeValue: normalizeNullableID,
		reference: supplierReference,
		searchable: false,
		width: "20rem",
		editorProps: {
			showClear: true,
		},
	},
	{
		field: "status_id",
		referenceField: "status",
		headerKey: "MaterialRequestItem.fields.status_id",
		editable: canManageFulfillment,
		dataType: "reference",
		normalizeValue: numberValue,
		reference: materialRequestStatusReference,
		width: "14rem",
		editorProps: {
			required: true,
		},
		setValue: updateStatus,
	},
];

const commands: GridCommand<MaterialRequestItem, MaterialRequestItemKey>[] = [
	...(canEditRequest ? ([{ name: "create" }] as const) : []),
	...(canEditRequest || canManageFulfillment
		? ([{ name: "edit" }] as const)
		: []),
	...(canEditRequest ? ([{ name: "delete" }] as const) : []),
];

const collection = useLocalDocumentCollection<MaterialRequestItem>({
	items: model,
	createDefaults: () => ({
		material_request_id: 0,
		material_id: 0,
		measure_unit_id: 0,
		measure_unit: {},
		quant: 0,
		supplier_id: null,
		supplier: null,
		required_date: null,
		order_importance_id: 0,
		order_importance: {},
		status_id: DRAFT_STATUS_ID,
		status: {
			keys: { id: DRAFT_STATUS_ID },
			descr: "Черновик",
			dataType: "materialRequestStatuses",
		},
	}),
});
</script>

<template>
	<div class="space-y-2">
		<h3 class="text-lg font-semibold">
			{{ t("MaterialRequestItem.title") }}
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
			stateKey="materialRequestDocumentItems"
			:pageSize="100"
			:showCommandShortcuts="false"
		>
			<template
				#editor-order_importance_id="{
					value,
					updateValue,
				}"
			>
				<OrderImportanceReferenceSelect
					:modelValue="numberValue(value)"
					required
					@update:modelValue="updateValue"
				/>
			</template>
			<template #editor-status_id="{ value, updateValue }">
				<MaterialRequestStatusReferenceSelect
					:modelValue="numberValue(value)"
					required
					@update:modelValue="updateValue"
				/>
			</template>
		</CollectionGrid>
	</div>
</template>
