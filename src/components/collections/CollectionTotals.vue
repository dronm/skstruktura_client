<script setup lang="ts" generic="TItem extends object">
import { computed } from "vue";

import type { CollectionTotalDefinition } from "@/types/collectionTotals";

const props = withDefaults(
	defineProps<{
		items: readonly TItem[];
		totals: readonly CollectionTotalDefinition<TItem>[];
		label?: string;
		locale?: string;
	}>(),
	{
		label: "Total",
		locale: "ru-RU",
	},
);

const numberValue = (value: unknown): number => {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : 0;
	}

	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	return 0;
};

const calculatedTotals = computed(() => {
	return props.totals.map((definition) => {
		const value = props.items.reduce((sum, item) => {
			return (
				sum +
				numberValue(Reflect.get(item, definition.field))
			);
		}, 0);

		return {
			definition,
			value,
		};
	});
});

const formatValue = (
	value: number,
	definition: CollectionTotalDefinition<TItem>,
): string => {
	const fractionDigits = definition.fractionDigits ?? 2;
	return new Intl.NumberFormat(props.locale, {
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits,
	}).format(value);
};
</script>

<template>
	<div
		class="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 rounded-b-md border border-t-0 border-slate-200 bg-slate-50 px-3 py-2 text-sm"
	>
		<span class="font-semibold text-slate-700">{{
			props.label
		}}</span>
		<span
			v-for="total in calculatedTotals"
			:key="total.definition.field"
			class="inline-flex items-baseline gap-2"
		>
			<span class="text-slate-500"
				>{{ total.definition.label }}:</span
			>
			<span
				class="min-w-24 text-right font-semibold tabular-nums text-slate-900"
			>
				{{ formatValue(total.value, total.definition) }}
			</span>
		</span>
	</div>
</template>
