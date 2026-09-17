<script setup lang="ts">
import { useI18n } from "vue-i18n";

import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";

import {
	CollectionForm,
	FormField,
	useCollectionFormModel,
	type FormErrorsView,
} from "@katren/vue-collection-lib";
import {
	createSupplierFormModel,
	type SupplierFormModel,
} from "@/forms/supplier.gen";
import type { SupplierNew } from "@/types/supplier.gen";

type FormMode = "create" | "edit" | "copy";

const props = withDefaults(
	defineProps<{
		model?: Partial<SupplierFormModel>;
		mode?: FormMode;
		errors?: FormErrorsView;
		submitting?: boolean;
	}>(),
	{
		model: () => ({}),
		mode: "create",
		errors: undefined,
		submitting: false,
	},
);

const emit = defineEmits<{
	submit: [model: SupplierNew];
	cancel: [];
}>();

const { t } = useI18n();
const { form } = useCollectionFormModel<SupplierFormModel>({
	model: () => props.model,
	defaults: createSupplierFormModel,
});

const fillNameFullFromName = (): void => {
	const name = form.value.name ?? "";
	const nameFull = form.value.name_full ?? "";
	if (name.trim() === "" || nameFull.trim() !== "") {
		return;
	}

	form.value.name_full = name;
};

const submit = (): void => {
	const kpp = form.value.kpp?.trim() ?? "";
	emit("submit", {
		name: form.value.name?.trim() ?? "",
		name_full: form.value.name_full?.trim() ?? "",
		inn: form.value.inn?.trim() ?? "",
		kpp: kpp === "" ? null : kpp,
		is_active: form.value.is_active ?? false,
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
				forId="supplierName"
				:label="t('Supplier.fields.name')"
				:errors="props.errors"
				containerClass="min-w-0"
				v-slot="{ invalid }"
			>
				<InputText
					id="supplierName"
					v-model="form.name"
					:invalid="invalid"
					class="w-full min-w-0"
					autofocus
					required
				/>
			</FormField>
			<FormField
				field="name_full"
				forId="supplierNameFull"
				:label="t('Supplier.fields.name_full')"
				:errors="props.errors"
				containerClass="min-w-0"
				v-slot="{ invalid }"
			>
				<InputText
					id="supplierNameFull"
					v-model="form.name_full"
					:invalid="invalid"
					class="w-full min-w-0"
					required
					@focus="fillNameFullFromName"
				/>
			</FormField>
			<FormField
				field="inn"
				forId="supplierInn"
				:label="t('Supplier.fields.inn')"
				:errors="props.errors"
				containerClass="min-w-0"
				v-slot="{ invalid }"
			>
				<InputText
					id="supplierInn"
					v-model="form.inn"
					:invalid="invalid"
					class="w-full min-w-0"
					maxlength="12"
					required
				/>
			</FormField>
			<FormField
				field="kpp"
				forId="supplierKpp"
				:label="t('Supplier.fields.kpp')"
				:errors="props.errors"
				containerClass="min-w-0"
				v-slot="{ invalid }"
			>
				<InputText
					id="supplierKpp"
					v-model="form.kpp"
					:invalid="invalid"
					class="w-full min-w-0"
				/>
			</FormField>
			<div class="catalog-form-active">
				<FormField
					field="is_active"
					:errors="props.errors"
					containerClass="pt-7"
				>
					<template #default="{ invalid }">
						<div class="flex items-center gap-2">
							<Checkbox
								v-model="form.is_active"
								inputId="supplierIsActive"
								:invalid="invalid"
								binary
							/>
							<label for="supplierIsActive">{{
								t(
									"Supplier.fields.is_active",
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
