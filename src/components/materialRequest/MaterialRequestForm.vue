<script setup lang="ts">
import { useI18n } from "vue-i18n";

import Button from "primevue/button";
import Textarea from "primevue/textarea";

import {
	CollectionForm,
	FormField,
	ReferenceKeyInput,
	type FormErrorsView,
} from "@katren/vue-collection-lib";

import DocumentDateTimePicker from "@/components/documents/DocumentDateTimePicker.vue";
import MaterialRequestItemsGrid from "@/components/materialRequest/MaterialRequestItemsGrid.vue";
import {
	orderedDocumentItems,
	useDocumentFormModel,
} from "@/composables/useDocumentFormModel";
import {
	createMaterialRequestDocumentForm,
	nullableDocumentText,
} from "@/forms/materialDocuments";
import {
	constructionManagerReference,
	constructionSiteReference,
} from "@/references/inventoryReferences";
import { useAuthStore } from "@/stores/useAuthStore";
import type {
	MaterialRequestDocumentForm,
	MaterialRequestDocumentSave,
} from "@/types/materialDocuments";
import { normalizeNullableID } from "@/utils/nullableID";

type FormMode = "create" | "edit" | "copy";

const props = withDefaults(
	defineProps<{
		model?: Partial<MaterialRequestDocumentForm>;
		mode?: FormMode;
		errors?: FormErrorsView;
		submitting?: boolean;
		canSubmitRequest?: boolean;
		submittingRequest?: boolean;
	}>(),
	{
		model: () => ({}),
		mode: "create",
		errors: undefined,
		submitting: false,
		canSubmitRequest: false,
		submittingRequest: false,
	},
);

const emit = defineEmits<{
	submit: [model: MaterialRequestDocumentSave];
	requestSubmit: [model: MaterialRequestDocumentSave];
	cancel: [];
}>();

const { t } = useI18n();
const authStore = useAuthStore();
const roleID = authStore.user?.role_id;
const canEditHeader =
	roleID === "admin" || roleID === "construction_site_manager";
const canSelectManager = roleID === "admin";

const { form } = useDocumentFormModel({
	model: () => props.model,
	defaults: createMaterialRequestDocumentForm,
});

const buildSaveModel = (): MaterialRequestDocumentSave | null => {
	if (!(form.value.date instanceof Date)) {
		return null;
	}

	return {
		id: form.value.id,
		version: form.value.version,
		date: form.value.date,
		construction_site_id: form.value.construction_site_id,
		construction_manager_id: form.value.construction_manager_id,
		comment: nullableDocumentText(form.value.comment),
		items: orderedDocumentItems(form.value.items).map((item) => ({
			id: item.id > 0 ? item.id : undefined,
			material_id: item.material_id,
			measure_unit_id: item.measure_unit_id,
			quant: item.quant,
			supplier_id: normalizeNullableID(item.supplier_id),
			required_date:
				item.required_date instanceof Date
					? item.required_date
					: null,
			order_importance_id: item.order_importance_id,
			status_id: item.status_id,
		})),
	};
};

const submit = (): void => {
	const model = buildSaveModel();
	if (model !== null) {
		emit("submit", model);
	}
};

const requestSubmit = (): void => {
	const model = buildSaveModel();
	if (model !== null) {
		emit("requestSubmit", model);
	}
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
						forId="materialRequestDate"
						:label="t('MaterialRequest.fields.date')"
						:errors="props.errors"
						v-slot="{ invalid }"
					>
						<DocumentDateTimePicker
							inputId="materialRequestDate"
							v-model="form.date"
							:invalid="invalid"
							:disabled="!canEditHeader"
							required
						/>
					</FormField>
				</div>

				<div class="min-w-0 space-y-4">
					<FormField
						field="construction_site_id"
						forId="materialRequestConstructionSite"
						:label="
							t(
								'MaterialRequest.fields.construction_site_id',
							)
						"
						:errors="props.errors"
						v-slot="{ invalid }"
					>
						<ReferenceKeyInput
							id="materialRequestConstructionSite"
							:projectedValue="form.construction_site"
							v-model="form.construction_site_id"
							:reference="constructionSiteReference"
							:invalid="invalid"
							:disabled="!canEditHeader"
							required
						/>
					</FormField>

					<FormField
						field="construction_manager_id"
						forId="materialRequestConstructionManager"
						:label="
							t(
								'MaterialRequest.fields.construction_manager_id',
							)
						"
						:errors="props.errors"
						v-slot="{ invalid }"
					>
						<ReferenceKeyInput
							id="materialRequestConstructionManager"
							:projectedValue="form.construction_manager"
							v-model="form.construction_manager_id"
							:reference="constructionManagerReference"
							:invalid="invalid"
							:disabled="!canSelectManager"
							required
						/>
					</FormField>
				</div>

				<FormField
					field="comment"
					forId="materialRequestComment"
					:label="t('MaterialRequest.fields.comment')"
					:errors="props.errors"
					containerClass="md:col-span-2"
					v-slot="{ invalid }"
				>
					<Textarea
						id="materialRequestComment"
						v-model="form.comment"
						:invalid="invalid"
						:disabled="!canEditHeader"
						rows="4"
					/>
				</FormField>
			</div>

			<div class="border-t border-gray-200 pt-5">
				<MaterialRequestItemsGrid
					:key="`${form.id}:${form.version}`"
					v-model:items="form.items"
				/>
			</div>

			<template #actions>
				<div class="flex flex-wrap justify-end gap-2">
					<Button
						v-if="props.canSubmitRequest"
						type="button"
						:label="t('MaterialRequest.actions.submit')"
						icon="pi pi-send"
						severity="success"
						:loading="props.submittingRequest"
						:disabled="props.submitting"
						@click="requestSubmit"
					/>
					<Button
						type="button"
						:label="t('Grid.commands.cancel')"
						severity="secondary"
						outlined
						:disabled="
							props.submitting ||
							props.submittingRequest
						"
						@click="emit('cancel')"
					/>
					<Button
						type="submit"
						label="Ok"
						icon="pi pi-check"
						:loading="props.submitting"
						:disabled="props.submittingRequest"
					/>
				</div>
			</template>
		</CollectionForm>
	</div>
</template>
