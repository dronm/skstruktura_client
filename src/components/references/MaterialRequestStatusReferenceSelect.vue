<script setup lang="ts">
import { onMounted, ref } from "vue";

import Select from "primevue/select";

import { materialRequestStatusApi } from "@/api/materialRequestStatus.gen";
import type { MaterialRequestStatus } from "@/types/materialRequestStatus.gen";

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
		id: "materialRequestStatusReference",
		invalid: false,
		disabled: false,
		required: false,
		showClear: false,
	},
);

const emit = defineEmits<{
	"update:modelValue": [value: number | null];
}>();

const options = ref<MaterialRequestStatus[]>([]);
const loading = ref(false);

const loadOptions = async (): Promise<void> => {
	loading.value = true;
	try {
		const response = await materialRequestStatusApi.list({
			from: 0,
			count: 1000,
			sorter: [{ f: "id", d: "a" }],
		});
		options.value = response?.rows ?? [];
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
