<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";

import {
	CollectionForm,
	FormField,
	useCollectionFormModel,
	type FormErrorsView,
} from "@katren/vue-collection-lib";
import {
	createMaterialTypeFormModel,
	type MaterialTypeFormModel,
} from "@/forms/materialType.gen";
import type { MaterialTypeNew } from "@/types/materialType.gen";

type FormMode = "create" | "edit" | "copy";

const props = withDefaults(defineProps<{
	model?: Partial<MaterialTypeFormModel>;
	mode?: FormMode;
	errors?: FormErrorsView;
	submitting?: boolean;
}>(), {
	model: () => ({}),
	mode: "create",
	errors: undefined,
	submitting: false,
});

const emit = defineEmits<{
	submit: [model: MaterialTypeNew];
	cancel: [];
}>();

const { t } = useI18n();
const { form } = useCollectionFormModel<MaterialTypeFormModel>({
	model: () => props.model,
	defaults: createMaterialTypeFormModel,
});

const submit = (): void => {
	const model: MaterialTypeNew = {
		code: form.value.code?.trim() ?? "",
		name: form.value.name?.trim() ?? "",
		is_active: form.value.is_active ?? false,
	};
	emit("submit", model);
};
</script>

<template>
	<CollectionForm
		:errors="props.errors"
		:submitting="props.submitting"
		@submit="submit"
		@cancel="emit('cancel')"
	>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField
				field="code"
				forId="materialTypeCode"
				:label="t('MaterialType.fields.code')"
				:errors="props.errors"
				containerClass=""
				v-slot="{ invalid }"
			>
				<InputText
					id="materialTypeCode"
					v-model="form.code"
					:invalid="invalid"
					:disabled="false"
					required
				/>
			</FormField>
			<FormField
				field="name"
				forId="materialTypeName"
				:label="t('MaterialType.fields.name')"
				:errors="props.errors"
				containerClass=""
				v-slot="{ invalid }"
			>
				<Textarea
					id="materialTypeName"
					v-model="form.name"
					:invalid="invalid"
					:disabled="false"
					rows="4"
					required
				/>
			</FormField>
			<FormField
				field="is_active"
				forId="materialTypeIsActive"
				:label="t('MaterialType.fields.is_active')"
				:errors="props.errors"
				containerClass=" pt-7"
				v-slot="{ invalid }"
			>
				<div class="flex items-center gap-2">
					<Checkbox
						v-model="form.is_active"
						inputId="materialTypeIsActive"
						:invalid="invalid"
						:disabled="false"
						binary
					/>
					<label for="materialTypeIsActive">{{ t("MaterialType.fields.is_active") }}</label>
				</div>
			</FormField>
		</div>
	</CollectionForm>
</template>
