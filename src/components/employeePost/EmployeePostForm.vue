<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Checkbox from "primevue/checkbox";
import Textarea from "primevue/textarea";

import {
	CollectionForm,
	FormField,
	useCollectionFormModel,
	type FormErrorsView,
} from "@katren/vue-collection-lib";
import {
	createEmployeePostFormModel,
	type EmployeePostFormModel,
} from "@/forms/employeePost.gen";
import type { EmployeePostNew } from "@/types/employeePost.gen";

type FormMode = "create" | "edit" | "copy";

const props = withDefaults(defineProps<{
	model?: Partial<EmployeePostFormModel>;
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
	submit: [model: EmployeePostNew];
	cancel: [];
}>();

const { t } = useI18n();
const { form } = useCollectionFormModel<EmployeePostFormModel>({
	model: () => props.model,
	defaults: createEmployeePostFormModel,
});

const submit = (): void => {
	const model: EmployeePostNew = {
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
				field="name"
				forId="employeePostName"
				:label="t('EmployeePost.fields.name')"
				:errors="props.errors"
				containerClass=""
				v-slot="{ invalid }"
			>
				<Textarea
					id="employeePostName"
					v-model="form.name"
					:invalid="invalid"
					:disabled="false"
					rows="4"
					required
				/>
			</FormField>
			<FormField
				field="is_active"
				forId="employeePostIsActive"
				:label="t('EmployeePost.fields.is_active')"
				:errors="props.errors"
				containerClass=" pt-7"
				v-slot="{ invalid }"
			>
				<div class="flex items-center gap-2">
					<Checkbox
						v-model="form.is_active"
						inputId="employeePostIsActive"
						:invalid="invalid"
						:disabled="false"
						binary
					/>
					<label for="employeePostIsActive">{{ t("EmployeePost.fields.is_active") }}</label>
				</div>
			</FormField>
		</div>
	</CollectionForm>
</template>
