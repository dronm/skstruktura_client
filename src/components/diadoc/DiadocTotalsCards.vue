<script setup lang="ts">
import type { DiadocDocumentTotals, DiadocTotals } from "@/types/diadoc";

const props = defineProps<{
	totals: DiadocDocumentTotals;
}>();

const groups: Array<{
	key: keyof DiadocDocumentTotals;
	label: string;
	classes: string;
}> = [
	{
		key: "document",
		label: "Документ Диадока строк",
		classes: "border-sky-200 bg-sky-50/70",
	},
	{
		key: "import",
		label: "Будет импортировано строк",
		classes: "border-emerald-200 bg-emerald-50/70",
	},
	{
		key: "excluded",
		label: "Исключено строк",
		classes: "border-slate-200 bg-slate-50",
	},
];

const money = (value: string): string => {
	const parsed = Number(value);
	return Number.isFinite(parsed)
		? parsed.toLocaleString("ru-RU", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})
		: value;
};

const groupTotals = (key: keyof DiadocDocumentTotals): DiadocTotals => {
	return props.totals[key];
};
</script>

<template>
	<div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
		<div
			v-for="group in groups"
			:key="group.key"
			class="rounded-xl border p-4"
			:class="group.classes"
		>
			<div class="flex items-center justify-between gap-3">
				<h3 class="font-semibold text-slate-900">
					{{ group.label }}
				</h3>
				<span
					class="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600"
				>
					{{
						groupTotals(group.key)
							.line_count
					}}
				</span>
			</div>
			<dl class="mt-3 grid grid-cols-3 gap-3 text-sm">
				<div>
					<dt class="text-xs text-slate-500">
						Без НДС
					</dt>
					<dd
						class="mt-1 font-semibold tabular-nums"
					>
						{{
							money(
								groupTotals(
									group.key,
								)
									.amount_without_vat,
							)
						}}
					</dd>
				</div>
				<div>
					<dt class="text-xs text-slate-500">
						НДС
					</dt>
					<dd
						class="mt-1 font-semibold tabular-nums"
					>
						{{
							money(
								groupTotals(
									group.key,
								).vat_amount,
							)
						}}
					</dd>
				</div>
				<div>
					<dt class="text-xs text-slate-500">
						Всего
					</dt>
					<dd
						class="mt-1 font-semibold tabular-nums"
					>
						{{
							money(
								groupTotals(
									group.key,
								)
									.amount_with_vat,
							)
						}}
					</dd>
				</div>
			</dl>
		</div>
	</div>
</template>
