<script setup lang="ts">
import Select from "primevue/select";

const model = defineModel<number | null>({ default: null });
const props = withDefaults(
	defineProps<{
		inputId?: string;
		disabled?: boolean;
		invalid?: boolean;
		required?: boolean;
		showClear?: boolean;
		placeholder?: string;
	}>(),
	{
		disabled: false,
		invalid: false,
		required: false,
		showClear: true,
		placeholder: "",
	},
);
const options = Array.from({ length: 69 }, (_, index) => ({
	value: index - 30,
	label: `${index - 30} °C`,
}));
</script>

<template>
	<Select
		v-model="model"
		:inputId="props.inputId"
		:options="options"
		optionValue="value"
		optionLabel="label"
		:disabled="props.disabled"
		:invalid="props.invalid"
		:required="props.required"
		:showClear="props.showClear"
		:placeholder="props.placeholder"
		class="w-full"
	/>
</template>
