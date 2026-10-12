<script setup lang="ts">
import Select from "primevue/select";

import { CONCRETE_STRENGTH_CLASSES } from "@/constants/concreteStrengthClasses";

const model = defineModel<string | null>({ default: null });
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
const options = [...CONCRETE_STRENGTH_CLASSES];
</script>

<template>
	<Select
		v-model="model"
		:inputId="props.inputId"
		:options="options"
		:disabled="props.disabled"
		:invalid="props.invalid"
		:required="props.required"
		:showClear="props.showClear"
		:placeholder="props.placeholder"
		class="w-full"
	/>
</template>
