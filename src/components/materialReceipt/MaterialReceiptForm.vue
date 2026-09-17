<script setup lang="ts">
import { useI18n } from "vue-i18n";

import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";

import {
	CollectionForm,
	FormField,
	ReferenceKeyInput,
	type FormErrorsView,
} from "@katren/vue-collection-lib";

import MaterialReceiptItemsGrid from "@/components/materialReceipt/MaterialReceiptItemsGrid.vue";
import DocumentFormActions from "@/components/documents/DocumentFormActions.vue";
import DocumentDateTimePicker from "@/components/documents/DocumentDateTimePicker.vue";
import {
	orderedDocumentItems,
	useDocumentFormModel,
} from "@/composables/useDocumentFormModel";
import {
	createMaterialReceiptDocumentForm,
	nullableDocumentText,
} from "@/forms/materialDocuments";
import {
	constructionSiteReference,
	supplierReference,
} from "@/references/inventoryReferences";
import type {
	MaterialReceiptDocumentForm,
	MaterialReceiptDocumentSave,
} from "@/types/materialDocuments";
import { normalizeNullableID } from "@/utils/nullableID";

type FormMode = "create" | "edit" | "copy";

const props = withDefaults(
	defineProps<{
		model?: Partial<MaterialReceiptDocumentForm>;
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
	submit: [model: MaterialReceiptDocumentSave];
	cancel: [];
}>();

const { t } = useI18n();
const { form } = useDocumentFormModel({
	model: () => props.model,
	defaults: createMaterialReceiptDocumentForm,
});

const submit = (): void => {
	if (!(form.value.date instanceof Date)) {
		return;
	}

	emit("submit", {
		id: form.value.id,
		version: form.value.version,
		date: form.value.date,
		construction_site_id: normalizeNullableID(
			form.value.construction_site_id,
		),
		supplier_id: form.value.supplier_id,
		number: form.value.number.trim(),
		comment: nullableDocumentText(form.value.comment),
		items: orderedDocumentItems(form.value.items).map((item) => ({
			id: item.id > 0 ? item.id : undefined,
			material_id: item.material_id,
			measure_unit_id: item.measure_unit_id,
			construction_site_id: normalizeNullableID(
				item.construction_site_id,
			),
			quant: item.quant,
			price: item.price,
			amount: item.amount,
			vat_percent: item.vat_percent,
			vat_amount: item.vat_amount,
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
				<div class="min-w-0 space-y-4">
					<FormField
						field="date"
						forId="materialReceiptDate"
						:label="
							t('MaterialReceipt.fields.date')
						"
						:errors="props.errors"
						v-slot="{ invalid }"
					>
						<DocumentDateTimePicker
							inputId="materialReceiptDate"
							v-model="form.date"
							:invalid="invalid"
							required
						/>
					</FormField>
					<FormField
						field="number"
						forId="materialReceiptNumber"
						:label="
							t(
								'MaterialReceipt.fields.number',
							)
						"
						:errors="props.errors"
						v-slot="{ invalid }"
					>
						<InputText
							id="materialReceiptNumber"
							v-model="form.number"
							:invalid="invalid"
							required
						/>
					</FormField>
				</div>
				<div class="min-w-0 space-y-4">
					<FormField
						field="construction_site_id"
						forId="materialReceiptConstructionSite"
						:label="
							t(
								'MaterialReceipt.fields.construction_site_id',
							)
						"
						:errors="props.errors"
						v-slot="{ invalid }"
					>
						<ReferenceKeyInput
							id="materialReceiptConstructionSite"
							:projectedValue="form.construction_site"
							v-model="
								form.construction_site_id
							"
							:reference="
								constructionSiteReference
							"
							:invalid="invalid"
						/>
					</FormField>
					<FormField
						field="supplier_id"
						forId="materialReceiptSupplier"
						:label="
							t(
								'MaterialReceipt.fields.supplier_id',
							)
						"
						:errors="props.errors"
						v-slot="{ invalid }"
					>
						<ReferenceKeyInput
							id="materialReceiptSupplier"
							:projectedValue="form.supplier"
							v-model="form.supplier_id"
							:reference="supplierReference"
							:invalid="invalid"
							required
						/>
					</FormField>
				</div>
				<FormField
					field="comment"
					forId="materialReceiptComment"
					:label="
						t(
							'MaterialReceipt.fields.comment',
						)
					"
					:errors="props.errors"
					containerClass="md:col-span-2"
					v-slot="{ invalid }"
				>
					<Textarea
						id="materialReceiptComment"
						v-model="form.comment"
						:invalid="invalid"
						rows="4"
					/>
				</FormField>
			</div>

			<div class="border-t border-gray-200 pt-5">
				<MaterialReceiptItemsGrid
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
