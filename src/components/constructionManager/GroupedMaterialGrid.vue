<script setup lang="ts">
import { computed, type VNode } from "vue";

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
	}>(),
	{
		loading: false,
		error: "",
		extraColumnCount: 0,
		minWidth: "38rem",
	},
);

defineSlots<{
	"extra-headers": () => VNode[];
	"extra-cells": (props: { row: MaterialWorkbenchRow }) => VNode[];
}>();

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
	>
		<table
			class="w-full border-collapse text-sm"
			:style="{ minWidth: props.minWidth }"
		>
			<thead class="sticky top-0 z-10 bg-slate-100">
				<tr>
					<th
						class="w-full min-w-72 px-3 py-2 text-left font-semibold text-slate-700"
					>
						Материал
					</th>
					<th
						class="w-20 px-2 py-2 text-left font-semibold text-slate-700"
					>
						Ед.
					</th>
					<th
						class="w-32 px-2 py-2 text-right font-semibold text-slate-700"
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
					<tr class="bg-sky-100 text-sky-900">
						<td
							:colspan="
								3 +
								props.extraColumnCount
							"
							class="border-t border-sky-200 px-3 py-2.5 text-center text-lg font-bold"
						>
							{{ group.name }}
						</td>
					</tr>
					<tr
						v-for="row in group.rows"
						:key="row.materialID"
						class="border-t border-slate-200 align-middle"
					>
						<td
							class="px-3 py-2 text-slate-900"
						>
							{{ row.materialName }}
						</td>
						<td
							class="px-2 py-2 text-slate-600"
						>
							{{
								row.measureUnitName
							}}
						</td>
						<td
							class="px-2 py-2 text-right tabular-nums text-slate-700"
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
				<tr v-if="groups.length === 0">
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
@media print {
	.material-workbench-scroll {
		max-height: none !important;
		overflow: visible !important;
	}
}
</style>
