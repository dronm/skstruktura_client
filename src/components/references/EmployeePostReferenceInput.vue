<script setup lang="ts">
import {
	ref,
	watch,
} from "vue";
import { useI18n } from "vue-i18n";

import {
	ReferenceInput,
	referenceAutocompleteEq,
	type ReferenceKeys,
	type ReferenceValue,
} from "@katren/vue-collection-lib";

import { employeePostApi } from "@/api/employeePost.gen";
import type {
	EmployeePost,
	EmployeePostKey,
} from "@/types/employeePost.gen";

type EmployeePostReferenceValue = ReferenceValue<ReferenceKeys>;

const props = withDefaults(defineProps<{
	modelValue?: number | null;
	id?: string;
	label?: string;
	invalid?: boolean;
	error?: string;
	disabled?: boolean;
	forceSelection?: boolean;
}>(), {
	modelValue: null,
	id: "employeePostReference",
	label: "",
	invalid: false,
	error: "",
	disabled: false,
	forceSelection: true,
});

const emit = defineEmits<{
	"update:modelValue": [value: number | null];
}>();

const { t } = useI18n();
const referenceValue = ref<EmployeePostReferenceValue | null>(null);
const loadingReference = ref(false);

const autocomplete = referenceAutocompleteEq<
	EmployeePost,
	ReferenceKeys
>({
	searchField: "name",
	keyFields: ["id"],
	descrFields: ["name"],
	list: employeePostApi.list,
	minLength: 0,
	count: 20,
});

const makeReference = (
	model: EmployeePost,
): EmployeePostReferenceValue => {
	return {
		keys: {
			id: model.id,
		},
		descr: model.name,
	};
};

const loadReference = async (
	id: number | null | undefined,
): Promise<void> => {
	if (!id) {
		referenceValue.value = null;
		return;
	}

	loadingReference.value = true;
	try {
		const detail = await employeePostApi.detail({
			id,
		} satisfies EmployeePostKey);
		referenceValue.value = makeReference(detail);
	} catch {
		referenceValue.value = {
			keys: {
				id,
			},
			descr: String(id),
		};
	} finally {
		loadingReference.value = false;
	}
};

watch(
	() => props.modelValue,
	async (id) => {
		if (referenceValue.value?.keys?.id === id) {
			return;
		}

		await loadReference(id);
	},
	{
		immediate: true,
	},
);

watch(
	referenceValue,
	(value) => {
		const id = value?.keys?.id;
		emit(
			"update:modelValue",
			typeof id === "number" ? id : null,
		);
	},
);
</script>

<template>
	<ReferenceInput
		:id="props.id"
		v-model="referenceValue"
		:label="props.label || t('EmployeePost.title')"
		:autocomplete="autocomplete"
		:invalid="props.invalid"
		:error="props.error"
		:disabled="props.disabled || loadingReference"
		:openAction="{
			route: (value) => ({
				name: 'employeePostEdit',
				params: {
					id: String(value.keys?.id ?? ''),
				},
			}),
			target: '_blank',
		}"
		:selectAction="{
			route: () => ({
				name: 'employeePosts',
			}),
			target: '_blank',
		}"
		:openTitle="t('Grid.commands.edit')"
		:selectTitle="t('Grid.commands.search')"
		:clearTitle="t('Grid.commands.clear')"
		:forceSelection="props.forceSelection"
	/>
</template>
