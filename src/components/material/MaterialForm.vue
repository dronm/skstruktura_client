<script setup lang="ts">
import { useI18n } from "vue-i18n";

import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";

import {
	CollectionForm,
	FormField,
	useCollectionFormModel,
	ReferenceKeyInput,
	type FormErrorsView,
} from "@katren/vue-collection-lib";
import {
	createMaterialFormModel,
	type MaterialFormModel,
} from "@/forms/material.gen";
import MaterialTypeReferenceSelect from "@/components/references/MaterialTypeReferenceSelect.vue";
import type { MaterialNew } from "@/types/material.gen";
import type { MaterialList } from "@/types/materialList.gen";

import { measureUnitReference } from "@/references/inventoryReferences";

type FormMode = "create" | "edit" | "copy";
type MaterialFormInput = Partial<MaterialFormModel> & {
	measure_unit?: MaterialList["measure_unit"];
	material_type?: MaterialList["material_type"];
};

const props = withDefaults(
	defineProps<{
		model?: MaterialFormInput;
		mode?: FormMode;
		errors?: FormErrorsView;
		submitting?: boolean;
		showActive?: boolean;
	}>(),
	{
		model: () => ({}),
		mode: "create",
		errors: undefined,
		submitting: false,
		showActive: true,
	},
);

const emit = defineEmits<{
	submit: [model: MaterialNew];
	cancel: [];
}>();

const { t } = useI18n();
const { form } = useCollectionFormModel<MaterialFormModel>({
	model: () => props.model,
	defaults: createMaterialFormModel,
});

const submit = (): void => {
	emit("submit", {
		name: form.value.name?.trim() ?? "",
		name_full: form.value.name_full?.trim() ?? "",
		measure_unit_id: form.value.measure_unit_id ?? 0,
		material_type_id: form.value.material_type_id ?? 0,
		is_active: props.showActive
			? (form.value.is_active ?? false)
			: true,
	});
};
</script>

<template>
	<CollectionForm
		:errors="props.errors"
		:submitting="props.submitting"
		@submit="submit"
		@cancel="emit('cancel')"
	>
		<div class="catalog-form-grid">
			<FormField
				field="name"
				forId="materialName"
				:label="t('Material.fields.name')"
				:errors="props.errors"
				containerClass="min-w-0"
				v-slot="{ invalid }"
			>
				<InputText
					id="materialName"
					v-model="form.name"
					:invalid="invalid"
					class="w-full min-w-0"
					autofocus
					required
				/>
			</FormField>

			<FormField
				field="name_full"
				forId="materialNameFull"
				:label="t('Material.fields.name_full')"
				:errors="props.errors"
				containerClass="min-w-0"
				v-slot="{ invalid }"
			>
				<InputText
					id="materialNameFull"
					v-model="form.name_full"
					:invalid="invalid"
					class="w-full min-w-0"
				/>
			</FormField>

			<FormField
				field="measure_unit_id"
				forId="materialMeasureUnit"
				:label="t('Material.fields.measure_unit_id')"
				:errors="props.errors"
				containerClass="min-w-0 w-full"
				v-slot="{ invalid }"
			>
				<ReferenceKeyInput
					id="materialMeasureUnit"
					:projectedValue="props.model.measure_unit"
					v-model="form.measure_unit_id"
					:reference="measureUnitReference"
					:invalid="invalid"
					class="w-full min-w-0"
					required
				/>
			</FormField>

			<FormField
				field="material_type_id"
				forId="materialType"
				:label="t('Material.fields.material_type_id')"
				:errors="props.errors"
				containerClass="min-w-0 w-full"
				v-slot="{ invalid }"
			>
				<MaterialTypeReferenceSelect
					id="materialType"
					v-model="form.material_type_id"
					:invalid="invalid"
					class="w-full min-w-0"
					required
				/>
			</FormField>

			<div
				v-if="props.showActive"
				class="catalog-form-active"
			>
				<FormField
					field="is_active"
					:errors="props.errors"
					containerClass="pt-7"
				>
					<template #default="{ invalid }">
						<div class="flex items-center gap-2">
							<Checkbox
								v-model="form.is_active"
								inputId="materialIsActive"
								:invalid="invalid"
								binary
							/>
							<label for="materialIsActive">{{
								t(
									"Material.fields.is_active",
								)
							}}</label>
						</div>
					</template>
				</FormField>
			</div>
		</div>
	</CollectionForm>
</template>

<style scoped>
.catalog-form-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1rem;
	width: 100%;
}

.catalog-form-grid > * {
	min-width: 0;
	width: 100%;
}

.catalog-form-active {
	grid-column: 1;
}
</style>
