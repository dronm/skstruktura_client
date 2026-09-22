<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { CollectionEditPage } from "@katren/vue-collection-lib";

import { materialConsumptionDocumentApi } from "@/api/materialDocuments";
import DocumentPrintButton from "@/components/documents/DocumentPrintButton.vue";
import ObjectHistoryButton from "@/components/history/ObjectHistoryButton.vue";
import MaterialConsumptionForm from "@/components/materialConsumption/MaterialConsumptionForm.vue";
import { useDocumentEditPage } from "@/composables/useDocumentEditPage";
import {
	copyMaterialConsumptionDocument,
	createMaterialConsumptionDocumentForm,
	materialConsumptionDocumentToForm,
} from "@/forms/materialDocuments";
import type {
	MaterialConsumptionDocument,
	MaterialConsumptionDocumentForm,
	MaterialConsumptionDocumentSave,
	MaterialDocumentKey,
} from "@/types/materialDocuments";

const { t } = useI18n();
const edit = useDocumentEditPage<
	MaterialConsumptionDocumentForm,
	MaterialDocumentKey,
	MaterialConsumptionDocument,
	MaterialConsumptionDocumentSave
>({
	api: materialConsumptionDocumentApi,
	createRouteName: "materialConsumptionCreate",
	listRoute: { name: "materialConsumptions" },
	keyFromRoute: (route) => ({ id: Number(route.params.id ?? 0) }),
	copyKeyFromRoute: (route) =>
		route.query.copy_id
			? { id: Number(route.query.copy_id) }
			: null,
	keyFromDocument: (document) => ({ id: document.id }),
	createModel: createMaterialConsumptionDocumentForm,
	fromDocument: materialConsumptionDocumentToForm,
	copyModel: copyMaterialConsumptionDocument,
});

const submit = async (
	model: MaterialConsumptionDocumentSave,
): Promise<void> => {
	await edit.submit(model);
};
</script>

<template>
	<CollectionEditPage
		:title="t(`MaterialConsumption.form.${edit.mode.value}`)"
		:loading="edit.loading.value"
		@back="edit.goBack"
	>
		<div
			v-if="edit.mode.value === 'edit'"
			class="mb-4 flex flex-wrap justify-end gap-2"
		>
			<DocumentPrintButton
				kind="consumption"
				:documentId="edit.key.value.id"
				:disabled="edit.loading.value"
			/>
			<ObjectHistoryButton
				object-type="material_consumptions"
				:object-id="edit.key.value.id"
			/>
		</div>
		<MaterialConsumptionForm
			:model="edit.model.value"
			:mode="edit.mode.value"
			:errors="edit.errors"
			:submitting="edit.submitting.value"
			@submit="submit"
			@cancel="edit.goBack"
		/>
	</CollectionEditPage>
</template>
