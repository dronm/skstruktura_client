<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import Select from "primevue/select";

import { orderImportanceApi } from "@/api/orderImportance.gen";
import type { OrderImportance } from "@/types/orderImportance.gen";

const props = withDefaults(
	defineProps<{
		modelValue?: number | null;
		id?: string;
		invalid?: boolean;
		disabled?: boolean;
		required?: boolean;
		showClear?: boolean;
	}>(),
	{
		modelValue: null,
		id: "orderImportanceReference",
		invalid: false,
		disabled: false,
		required: false,
		showClear: false,
	},
);

const emit = defineEmits<{
	"update:modelValue": [value: number | null];
}>();

const allOptions = ref<OrderImportance[]>([]);
const loading = ref(false);

const options = computed(() => {
	return allOptions.value.filter((option) => {
		return option.is_active || option.id === props.modelValue;
	});
});

const loadOptions = async (): Promise<void> => {
	loading.value = true;
	try {
		const response = await orderImportanceApi.list({
			from: 0,
			count: 1000,
			sorter: [
				{ f: "sort_order", d: "a" },
				{ f: "name", d: "a" },
			],
		});
		allOptions.value = response?.rows ?? [];
	} finally {
		loading.value = false;
	}
};

const updateValue = (value: number | null): void => {
	emit("update:modelValue", value);
};

onMounted(() => {
	void loadOptions();
});
</script>

<template>
	<Select
		:inputId="props.id"
		:modelValue="props.modelValue"
		:options="options"
		optionLabel="name"
		optionValue="id"
		:loading="loading"
		:invalid="props.invalid"
		:disabled="props.disabled"
		:required="props.required"
		:showClear="props.showClear"
		class="w-full"
		@update:modelValue="updateValue"
	/>
</template>
