<script setup lang="ts">
import { computed } from "vue";

import Select from "primevue/select";

import {
	VAT_PERCENT_VALUES,
	normalizeVatPercent,
	type VatPercent,
} from "@/utils/vat";

interface VatPercentOption {
	label: string;
	value: VatPercent;
}

const props = withDefaults(
	defineProps<{
		modelValue?: number | null;
		id?: string;
		invalid?: boolean;
		disabled?: boolean;
	}>(),
	{
		modelValue: 0,
		id: undefined,
		invalid: false,
		disabled: false,
	},
);

const emit = defineEmits<{
	"update:modelValue": [value: VatPercent];
}>();

const options: VatPercentOption[] = VAT_PERCENT_VALUES.map((value) => ({
	label: `${value}%`,
	value,
}));

const selectedValue = computed({
	get: (): number => {
		return typeof props.modelValue === "number" &&
			Number.isFinite(props.modelValue)
			? props.modelValue
			: 0;
	},
	set: (value: VatPercent): void => {
		emit("update:modelValue", normalizeVatPercent(value));
	},
});
</script>

<template>
	<Select
		:id="props.id"
		v-model="selectedValue"
		:options="options"
		optionLabel="label"
		optionValue="value"
		:invalid="props.invalid"
		:disabled="props.disabled"
		class="w-full"
	/>
</template>
