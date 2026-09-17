<script setup lang="ts">
import { useI18n } from "vue-i18n";

import Textarea from "primevue/textarea";

import {
	CollectionForm,
	FormField,
	ReferenceKeyInput,
	type FormErrorsView,
} from "@katren/vue-collection-lib";

import MaterialTransferItemsGrid from "@/components/materialTransfer/MaterialTransferItemsGrid.vue";
import DocumentFormActions from "@/components/documents/DocumentFormActions.vue";
import DocumentDateTimePicker from "@/components/documents/DocumentDateTimePicker.vue";
import {
	orderedDocumentItems,
	useDocumentFormModel,
} from "@/composables/useDocumentFormModel";
import {
	createMaterialTransferDocumentForm,
	nullableDocumentText,
} from "@/forms/materialDocuments";
import { constructionSiteReference } from "@/references/inventoryReferences";
import type {
	MaterialTransferDocumentForm,
	MaterialTransferDocumentSave,
} from "@/types/materialDocuments";

type FormMode = "create" | "edit" | "copy";

const props = withDefaults(
	defineProps<{
		model?: Partial<MaterialTransferDocumentForm>;
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
	submit: [model: MaterialTransferDocumentSave];
	cancel: [];
}>();

const { t } = useI18n();
const { form } = useDocumentFormModel({
	model: () => props.model,
	defaults: createMaterialTransferDocumentForm,
});

const submit = (): void => {
	if (!(form.value.date instanceof Date)) {
		return;
	}

	emit("submit", {
		id: form.value.id,
		version: form.value.version,
		date: form.value.date,
		source_construction_site_id:
			form.value.source_construction_site_id,
		destination_construction_site_id:
			form.value.destination_construction_site_id,
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
				<div class="min-w-0">
					<FormField
						field="date"
						forId="materialTransferDate"
						:label="
							t(
								'MaterialTransfer.fields.date',
							)
						"
						:errors="props.errors"
						v-slot="{ invalid }"
					>
						<DocumentDateTimePicker
							inputId="materialTransferDate"
							v-model="form.date"
							:invalid="invalid"
							required
						/>
					</FormField>
				</div>
				<div class="min-w-0 space-y-4">
					<FormField
						field="source_construction_site_id"
						forId="materialTransferSourceConstructionSite"
						:label="
							t(
								'MaterialTransfer.fields.source_construction_site_id',
							)
						"
						:errors="props.errors"
						v-slot="{ invalid }"
					>
						<ReferenceKeyInput
							id="materialTransferSourceConstructionSite"
							:projectedValue="form.source_construction_site"
							v-model="
								form.source_construction_site_id
							"
							:reference="
								constructionSiteReference
							"
							:invalid="invalid"
							required
						/>
					</FormField>
					<FormField
						field="destination_construction_site_id"
						forId="materialTransferDestinationConstructionSite"
						:label="
							t(
								'MaterialTransfer.fields.destination_construction_site_id',
							)
						"
						:errors="props.errors"
						v-slot="{ invalid }"
					>
						<ReferenceKeyInput
							id="materialTransferDestinationConstructionSite"
							:projectedValue="form.destination_construction_site"
							v-model="
								form.destination_construction_site_id
							"
							:reference="
								constructionSiteReference
							"
							:invalid="invalid"
							required
						/>
					</FormField>
				</div>
				<FormField
					field="comment"
					forId="materialTransferComment"
					:label="
						t(
							'MaterialTransfer.fields.comment',
						)
					"
					:errors="props.errors"
					containerClass="md:col-span-2"
					v-slot="{ invalid }"
				>
					<Textarea
						id="materialTransferComment"
						v-model="form.comment"
						:invalid="invalid"
						rows="4"
					/>
				</FormField>
			</div>

			<div class="border-t border-gray-200 pt-5">
				<MaterialTransferItemsGrid
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
