<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import {
	CollectionGrid,
	type CollectionGridApi,
	type CrudReferenceDefinition,
	type GridColumn,
	type GridCommand,
} from "@katren/vue-collection-lib";

import { useLocalDocumentCollection } from "@/composables/useLocalDocumentCollection";

interface MultiReferenceRow {
	id: number;
	line_num: number;
	value_id: number;
}

interface MultiReferenceRowKey {
	id: number;
}

const props = defineProps<{
	title: string;
	headerKey: string;
	reference: CrudReferenceDefinition<any, any, number>;
}>();

const selectedValues = defineModel<number[]>({ required: true });
const { t } = useI18n();
const rows = ref<MultiReferenceRow[]>([]);

const normalizeValues = (values: number[]): number[] => {
	return Array.from(
		new Set(
			values.filter(
				(value) => Number.isInteger(value) && value > 0,
			),
		),
	);
};

const sameValues = (left: number[], right: number[]): boolean => {
	return (
		left.length === right.length &&
		left.every((value, index) => value === right[index])
	);
};

watch(
	selectedValues,
	(values) => {
		const normalized = normalizeValues(values);
		const current = rows.value.map((row) => row.value_id);
		if (sameValues(current, normalized)) {
			return;
		}

		rows.value = normalized.map((value, index) => ({
			id: -(index + 1),
			line_num: index + 1,
			value_id: value,
		}));
	},
	{ immediate: true, deep: true },
);

watch(
	rows,
	(value) => {
		const normalized = normalizeValues(
			value.map((row) => row.value_id),
		);
		if (!sameValues(selectedValues.value, normalized)) {
			selectedValues.value = normalized;
		}
	},
	{ deep: true },
);

const collection = useLocalDocumentCollection<MultiReferenceRow>({
	items: rows,
	createDefaults: () => ({
		value_id: 0,
	}),
});

const validateUniqueValue = (valueID: number, rowID?: number): void => {
	if (!Number.isInteger(valueID) || valueID <= 0) {
		throw new Error(t("Report.filters.referenceRequired"));
	}
	if (
		rows.value.some(
			(row) => row.id !== rowID && row.value_id === valueID,
		)
	) {
		throw new Error(t("Report.filters.referenceDuplicate"));
	}
};

const api: CollectionGridApi<
	MultiReferenceRow,
	MultiReferenceRowKey,
	MultiReferenceRow,
	Partial<MultiReferenceRow>
> = {
	...collection.api,
	create: async (model) => {
		validateUniqueValue(model.value_id);
		return collection.api.create!(model);
	},
	update: async (key, model) => {
		const current = rows.value.find((row) => row.id === key.id);
		const valueID = Number(
			model.value_id ?? current?.value_id ?? 0,
		);
		validateUniqueValue(valueID, key.id);
		return collection.api.update!(key, model);
	},
};

const columns = computed<GridColumn<MultiReferenceRow>[]>(() => [
	{
		field: "value_id",
		headerKey: props.headerKey,
		editable: true,
		dataType: "reference",
		reference: props.reference,
		searchable: false,
		editorProps: {
			required: true,
		},
	},
]);

const commands: GridCommand<MultiReferenceRow, MultiReferenceRowKey>[] = [
	{ name: "create" },
	{ name: "edit" },
	{ name: "delete" },
];
</script>

<template>
	<div class="space-y-1">
		<h3 class="text-sm font-medium text-gray-700">
			{{ props.title }}
		</h3>
		<CollectionGrid
			class="compact-reference-grid"
			:api="api"
			:columns="columns"
			:commands="commands"
			dataKey="id"
			:getKey="collection.getKey"
			:createRow="collection.createRow"
			:createModel="collection.createModel"
			editMode="inline"
			:defaultSorter="collection.defaultSorter"
			:pageSize="1000"
			:rowsPerPageOptions="[1000]"
			:showCommandShortcuts="false"
			:showContextMenu="false"
			:confirmDelete="false"
		/>
	</div>
</template>

<style scoped>
:deep(.compact-reference-grid .crud-grid-command-panel) {
	gap: 0.25rem;
	margin-bottom: 0;
	padding: 0.25rem;
}

:deep(.compact-reference-grid .crud-grid-command-panel .p-button) {
	height: 2rem;
	padding: 0 0.55rem;
}

:deep(.compact-reference-grid .p-datatable-thead),
:deep(.compact-reference-grid .p-datatable-empty-message),
:deep(.compact-reference-grid .p-paginator) {
	display: none;
}

:deep(.compact-reference-grid .p-datatable-table) {
	min-width: 0 !important;
}

:deep(.compact-reference-grid .p-datatable-tbody > tr > td) {
	padding-block: 0;
}
</style>
