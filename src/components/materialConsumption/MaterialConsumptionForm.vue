<script setup lang="ts">
import { useI18n } from "vue-i18n";

import Textarea from "primevue/textarea";

import {
	CollectionForm,
	FormField,
	ReferenceKeyInput,
	type FormErrorsView,
} from "@katren/vue-collection-lib";

import MaterialConsumptionItemsGrid from "@/components/materialConsumption/MaterialConsumptionItemsGrid.vue";
import DocumentFormActions from "@/components/documents/DocumentFormActions.vue";
import DocumentDateTimePicker from "@/components/documents/DocumentDateTimePicker.vue";
import {
	orderedDocumentItems,
	useDocumentFormModel,
} from "@/composables/useDocumentFormModel";
import {
	createMaterialConsumptionDocumentForm,
	nullableDocumentText,
} from "@/forms/materialDocuments";
import { constructionSiteReference } from "@/references/inventoryReferences";
import type {
	MaterialConsumptionDocumentForm,
	MaterialConsumptionDocumentSave,
} from "@/types/materialDocuments";

type FormMode = "create" | "edit" | "copy";

const props = withDefaults(
	defineProps<{
		model?: Partial<MaterialConsumptionDocumentForm>;
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
	submit: [model: MaterialConsumptionDocumentSave];
	cancel: [];
}>();

const { t } = useI18n();
const { form } = useDocumentFormModel({
	model: () => props.model,
	defaults: createMaterialConsumptionDocumentForm,
});

const submit = (): void => {
	if (!(form.value.date instanceof Date)) {
		return;
	}

	emit("submit", {
		id: form.value.id,
		version: form.value.version,
		date: form.value.date,
		construction_site_id: form.value.construction_site_id,
		comment: nullableDocumentText(form.value.comment),
		items: orderedDocumentItems(form.value.items).map((item) => ({
			id: item.id > 0 ? item.id : undefined,
			material_id: item.material_id,
			measure_unit_id: item.measure_unit_id,
			quant: item.quant,
		})),
	});
};
</script>

<template>
	<div class="space-y-6">
		<CollectionForm
			:errors="props.errors"
			:submitting="props.submitting"
			@submit="submit"
			@cancel="emit('cancel')"
		>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormField
					field="date"
					forId="materialConsumptionDate"
					:label="
						t(
							'MaterialConsumption.fields.date',
						)
					"
					:errors="props.errors"
					v-slot="{ invalid }"
				>
					<DocumentDateTimePicker
						inputId="materialConsumptionDate"
						v-model="form.date"
						:invalid="invalid"
						required
					/>
				</FormField>
				<FormField
					field="construction_site_id"
					forId="materialConsumptionConstructionSite"
					:label="
						t(
							'MaterialConsumption.fields.construction_site_id',
						)
					"
					:errors="props.errors"
					v-slot="{ invalid }"
				>
					<ReferenceKeyInput
						id="materialConsumptionConstructionSite"
						:projectedValue="form.construction_site"
						v-model="
							form.construction_site_id
						"
						:reference="
							constructionSiteReference
						"
						:invalid="invalid"
						required
					/>
				</FormField>
				<FormField
					field="comment"
					forId="materialConsumptionComment"
					:label="
						t(
							'MaterialConsumption.fields.comment',
						)
					"
					:errors="props.errors"
					containerClass="md:col-span-2"
					v-slot="{ invalid }"
				>
					<Textarea
						id="materialConsumptionComment"
						v-model="form.comment"
						:invalid="invalid"
						rows="4"
					/>
				</FormField>
			</div>

			<div class="border-t border-gray-200 pt-5">
				<MaterialConsumptionItemsGrid
					:key="`${form.id}:${form.version}`"
					v-model:items="form.items"
				/>
			</div>

			<template #actions>
				<DocumentFormActions
					:submitting="props.submitting"
					@cancel="emit('cancel')"
				/>
			</template>
		</CollectionForm>
	</div>
</template>
