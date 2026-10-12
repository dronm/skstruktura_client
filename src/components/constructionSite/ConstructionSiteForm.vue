<script setup lang="ts">
import { useI18n } from "vue-i18n";

import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";

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
		section_cnt: form.value.section_cnt ?? 0, 
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
				field="section_cnt"
				forId="constructionSiteSectionCnt"
				:label="t('ConstructionSite.fields.section_cnt')"
				:errors="props.errors"
				v-slot="{ invalid }"
			>
				<InputNumber
					id="constructionSiteSectionCnt"
					v-model="form.section_cnt"
					:invalid="invalid"
					required
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
