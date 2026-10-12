<script setup lang="ts">
import { type VNode } from "vue";

import Button from "primevue/button";

const props = withDefaults(
	defineProps<{
		title: string;
		count: number;
		actionLabel: string;
		actionIcon?: string;
		busy?: boolean;
		disabled?: boolean;
	}>(),
	{
		actionIcon: "pi pi-send",
		busy: false,
		disabled: false,
	},
);

const emit = defineEmits<{
	action: [];
}>();

defineSlots<{
	default: () => VNode[];
	footer: () => VNode[];
}>();
</script>

<template>
	<aside
		class="min-w-0 wrap-anywhere rounded-lg border border-slate-200 bg-white p-4 xl:sticky xl:top-4 xl:self-start"
	>
		<div
			class="mb-3 flex flex-wrap items-baseline justify-between gap-3"
		>
			<h2
				class="min-w-0 text-base font-semibold text-slate-900"
			>
				{{ props.title }}
			</h2>
			<span class="text-xs text-slate-500">
				{{ props.count }}
			</span>
		</div>

		<div
			class="max-h-[46vh] divide-y divide-slate-200 overflow-y-auto"
		>
			<slot />
		</div>

		<Button
			class="mt-4 w-full"
			:label="props.actionLabel"
			:icon="props.actionIcon"
			severity="success"
			:loading="props.busy"
			:disabled="props.disabled"
			@click="emit('action')"
		/>

		<div class="mt-3">
			<slot name="footer" />
		</div>
	</aside>
</template>
