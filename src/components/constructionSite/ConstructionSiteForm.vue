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
	createConstructionSiteFormModel,
	type ConstructionSiteFormModel,
} from "@/forms/constructionSite.gen";
import type { ConstructionSiteNew } from "@/types/constructionSite.gen";

type FormMode = "create" | "edit" | "copy";

const props = withDefaults(
	defineProps<{
		model?: Partial<ConstructionSiteFormModel>;
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
	submit: [model: ConstructionSiteNew];
	cancel: [];
}>();

const { t } = useI18n();
const { form } = useCollectionFormModel<ConstructionSiteFormModel>({
	model: () => props.model,
	defaults: createConstructionSiteFormModel,
});

const submit = (): void => {
	emit("submit", {
		name: form.value.name?.trim() ?? "",
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
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField
				field="name"
				forId="constructionSiteName"
				:label="t('ConstructionSite.fields.name')"
				:errors="props.errors"
				v-slot="{ invalid }"
			>
				<InputText
					id="constructionSiteName"
					v-model="form.name"
					:invalid="invalid"
					autofocus
					required
				/>
			</FormField>

			<FormField
				field="is_active"
				:errors="props.errors"
				containerClass="pt-7"
			>
				<template #default="{ invalid }">
					<div class="flex items-center gap-2">
						<Checkbox
							v-model="form.is_active"
							inputId="constructionSiteIsActive"
							:invalid="invalid"
							binary
						/>
						<label
							for="constructionSiteIsActive"
						>
							{{
								t(
									"ConstructionSite.fields.is_active",
								)
							}}
						</label>
					</div>
				</template>
			</FormField>
		</div>
	</CollectionForm>
</template>
