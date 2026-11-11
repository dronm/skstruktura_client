<script setup lang="ts">
import { computed, ref, watch, type VNode } from "vue";
import { useI18n } from "vue-i18n";

import ProgressSpinner from "primevue/progressspinner";

import type {
	MaterialWorkbenchGroup,
	MaterialWorkbenchRow,
} from "@/types/constructionManagerWorkspace";

const props = withDefaults(
	defineProps<{
		rows: MaterialWorkbenchRow[];
		loading?: boolean;
		error?: string;
		emptyText: string;
		extraColumnCount?: number;
		minWidth?: string;
		fitWidth?: boolean;
		collapsibleGroups?: boolean;
	}>(),
	{
		loading: false,
		error: "",
		extraColumnCount: 0,
		minWidth: "38rem",
		fitWidth: false,
		collapsibleGroups: false,
	},
);

defineSlots<{
	"extra-headers": () => VNode[];
	"extra-cells": (props: { row: MaterialWorkbenchRow }) => VNode[];
}>();

const { t } = useI18n();
const collapsedGroupIDs = ref(new Set<number>());

const toggleGroup = (groupID: number): void => {
	if (collapsedGroupIDs.value.has(groupID)) {
		collapsedGroupIDs.value.delete(groupID);
	} else {
		collapsedGroupIDs.value.add(groupID);
	}
};

watch(
	() => props.rows,
	() => {
		collapsedGroupIDs.value.clear();
	},
);

const groups = computed<MaterialWorkbenchGroup[]>(() => {
	const grouped = new Map<number, MaterialWorkbenchGroup>();

	for (const row of props.rows) {
		let group = grouped.get(row.materialTypeID);
		if (group === undefined) {
			group = {
				id: row.materialTypeID,
				name: row.materialTypeName,
				rows: [],
			};
			grouped.set(row.materialTypeID, group);
		}
		group.rows.push(row);
	}

	return Array.from(grouped.values());
});

const numberFormatter = new Intl.NumberFormat("ru-RU", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 4,
});

const formatNumber = (value: number): string => {
	return numberFormatter.format(value);
};
</script>

<template>
	<div
		v-if="props.error"
		class="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
		role="alert"
	>
		{{ props.error }}
	</div>
	<div
		v-else-if="props.loading"
		class="flex min-h-48 items-center justify-center rounded-lg border border-slate-200 bg-white"
		aria-live="polite"
	>
		<ProgressSpinner class="h-10 w-10" strokeWidth="4" />
	</div>
	<div
		v-else
		class="material-workbench-scroll max-h-[62vh] overflow-auto rounded-lg border border-slate-200 bg-white"
		:class="{
			'material-workbench-fit': props.fitWidth,
			'material-workbench-with-importance':
				props.fitWidth && props.extraColumnCount === 2,
			'material-workbench-readonly':
				props.fitWidth && props.extraColumnCount === 0,
		}"
	>
		<table
			class="w-full border-collapse text-sm"
			:style="{
				minWidth: props.fitWidth ? '0' : props.minWidth,
			}"
		>
			<thead class="sticky top-0 z-10 bg-slate-100">
				<tr>
					<th
						class="material-workbench-name px-3 py-2 text-left font-semibold text-slate-700"
						:class="{
							'w-full min-w-72':
								!props.fitWidth,
						}"
					>
						Материал
					</th>
					<th
						class="material-workbench-unit px-2 py-2 text-left font-semibold text-slate-700"
						:class="{
							'w-20': !props.fitWidth,
						}"
					>
						Ед.
					</th>
					<th
						class="material-workbench-balance px-2 py-2 text-right font-semibold text-slate-700"
						:class="{
							'w-32': !props.fitWidth,
						}"
					>
						Остаток
					</th>
					<slot name="extra-headers" />
				</tr>
			</thead>
			<tbody>
				<template
					v-for="group in groups"
					:key="group.id"
				>
					<tr
						class="material-workbench-group bg-sky-100 text-sky-900"
					>
						<td
							:colspan="
								3 +
								props.extraColumnCount
							"
							class="border-t border-sky-200 px-3 py-2.5 text-center text-lg font-bold"
						>
							<button
								v-if="
									props.collapsibleGroups
								"
								type="button"
								class="flex w-full cursor-pointer items-center gap-2 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
								data-report-exclude
								:aria-expanded="
									!collapsedGroupIDs.has(
										group.id,
									)
								"
								:aria-label="
									t(
										collapsedGroupIDs.has(
											group.id,
										)
											? 'MaterialBalance.commands.expandGroup'
											: 'MaterialBalance.commands.collapseGroup',
										{
											group: group.name,
										},
									)
								"
								@click="
									toggleGroup(
										group.id,
									)
								"
							>
								<i
									class="pi shrink-0"
									:class="
										collapsedGroupIDs.has(
											group.id,
										)
											? 'pi-folder'
											: 'pi-folder-open'
									"
									aria-hidden="true"
									data-report-exclude
								/>
								<span>{{
									group.name
								}}</span>
							</button>
							<span
								v-if="
									props.collapsibleGroups
								"
								class="hidden print:inline"
								>{{
									group.name
								}}</span
							>
							<template v-else>{{
								group.name
							}}</template>
						</td>
					</tr>
					<tr
						v-for="row in group.rows"
						:key="row.materialID"
						class="material-workbench-row border-t border-slate-200 align-middle"
						:class="{
							'material-workbench-row-collapsed':
								props.collapsibleGroups &&
								collapsedGroupIDs.has(
									group.id,
								),
						}"
					>
						<td
							class="material-workbench-name px-3 py-2 text-slate-900"
						>
							<span
								class="block"
								:style="{
									paddingInlineStart:
										props.collapsibleGroups
											? '3rem'
											: undefined,
								}"
							>
								{{
									row.materialName
								}}
							</span>
						</td>
						<td
							class="material-workbench-unit px-2 py-2 text-slate-600"
							data-label="Ед."
						>
							{{
								row.measureUnitName
							}}
						</td>
						<td
							class="material-workbench-balance px-2 py-2 text-right tabular-nums text-slate-700"
							data-label="Остаток"
						>
							{{
								formatNumber(
									row.balance,
								)
							}}
						</td>
						<slot
							name="extra-cells"
							:row="row"
						/>
					</tr>
				</template>
				<tr
					v-if="groups.length === 0"
					class="material-workbench-empty"
				>
					<td
						:colspan="
							3 +
							props.extraColumnCount
						"
						class="px-3 py-12 text-center text-slate-500"
					>
						{{ props.emptyText }}
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style scoped>
.material-workbench-fit {
	container: material-workbench / inline-size;
	width: 100%;
	min-width: 0;
	max-width: 100%;
}

.material-workbench-fit table {
	table-layout: fixed;
}

.material-workbench-fit :deep(th),
.material-workbench-fit :deep(td) {
	min-width: 0;
	overflow-wrap: anywhere;
}

.material-workbench-fit .material-workbench-unit {
	width: 2.5rem;
}

.material-workbench-fit .material-workbench-balance {
	width: 5rem;
}

.material-workbench-fit :deep(.material-workbench-quantity) {
	width: 4.5rem;
}

.material-workbench-fit :deep(.material-workbench-importance) {
	width: 8rem;
}

.material-workbench-fit :deep(.p-inputnumber),
.material-workbench-fit :deep(.p-inputnumber-input),
.material-workbench-fit :deep(.p-select) {
	width: 100%;
	min-width: 0;
	max-width: 100%;
}

.material-workbench-fit :deep(.p-inputnumber-input) {
	padding-inline: 0.3rem !important;
}

.material-workbench-fit :deep(.p-inputnumber-stacked) {
	--p-inputnumber-button-width: 1.25rem;
}

.material-workbench-fit :deep(.p-inputnumber-stacked .p-inputnumber-input) {
	padding-inline-end: 1.55rem !important;
}

.material-workbench-fit
	:deep(.material-workbench-importance .p-select-dropdown) {
	width: 1.25rem;
}

.material-workbench-fit
	:deep(.material-workbench-importance .p-select-clear-icon) {
	width: 0.625rem;
	height: 0.625rem;
	margin-top: -0.3125rem;
	inset-inline-end: 1.4rem;
}

.material-workbench-fit :deep(.material-workbench-importance .p-select-label) {
	padding-inline: 0.2rem !important;
}

.material-workbench-fit
	:deep(
		.material-workbench-importance
			.p-select:has(.p-select-clear-icon)
			.p-select-label
	) {
	padding-inline-end: 1rem !important;
}

.material-workbench-fit :deep(.p-select-label) {
	min-width: 0;
}

/* Use the available grid width, including when a summary occupies a sidebar. */
@media screen {
	.material-workbench-row-collapsed {
		display: none !important;
	}

	@container material-workbench (max-width: 40rem) {
		.material-workbench-fit table,
		.material-workbench-fit tbody {
			display: block;
			width: 100%;
		}

		.material-workbench-fit thead {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}

		.material-workbench-fit .material-workbench-group,
		.material-workbench-fit .material-workbench-empty {
			display: block;
		}

		.material-workbench-fit .material-workbench-group td,
		.material-workbench-fit .material-workbench-empty td {
			display: block;
			width: 100%;
		}

		.material-workbench-fit .material-workbench-row {
			display: grid;
			grid-template-columns: 2.5rem minmax(0, 1fr) 4.5rem;
			align-items: end;
			gap: 0.25rem;
			padding: 0.5rem;
		}

		.material-workbench-with-importance .material-workbench-row {
			grid-template-columns:
				2rem minmax(0, 0.8fr)
				4.5rem minmax(0, 1.2fr);
		}

		.material-workbench-readonly .material-workbench-row {
			grid-template-columns: 2.5rem minmax(0, 1fr);
		}

		.material-workbench-fit .material-workbench-row :deep(td) {
			display: block;
			width: auto;
			padding: 0 !important;
		}

		.material-workbench-fit .material-workbench-name {
			grid-column: 1 / -1;
			padding-bottom: 0.25rem !important;
			font-weight: 500;
		}

		.material-workbench-fit .material-workbench-unit {
			grid-column: 1;
		}

		.material-workbench-fit .material-workbench-balance {
			grid-column: 2;
			text-align: left;
		}

		.material-workbench-fit :deep(.material-workbench-quantity) {
			grid-column: 3;
		}

		.material-workbench-with-importance
			:deep(.material-workbench-importance) {
			grid-column: 4;
		}

		.material-workbench-fit
			.material-workbench-row
			:deep(td[data-label]::before) {
			content: attr(data-label);
			display: block;
			margin-bottom: 0.2rem;
			color: rgb(100 116 139);
			font-size: 0.6875rem;
			line-height: 1rem;
		}
	}
}

@media print {
	.material-workbench-scroll {
		max-height: none !important;
		overflow: visible !important;
	}
}
</style>
