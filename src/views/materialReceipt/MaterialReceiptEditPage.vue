<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { CollectionEditPage } from "@katren/vue-collection-lib";

import { materialReceiptDocumentApi } from "@/api/materialDocuments";
import ObjectHistoryButton from "@/components/history/ObjectHistoryButton.vue";
import MaterialReceiptForm from "@/components/materialReceipt/MaterialReceiptForm.vue";
import { useDocumentEditPage } from "@/composables/useDocumentEditPage";
import {
	copyMaterialReceiptDocument,
	createMaterialReceiptDocumentForm,
	materialReceiptDocumentToForm,
} from "@/forms/materialDocuments";
import type {
	MaterialDocumentKey,
	MaterialReceiptDocument,
	MaterialReceiptDocumentForm,
	MaterialReceiptDocumentSave,
} from "@/types/materialDocuments";

const { t } = useI18n();
const edit = useDocumentEditPage<
	MaterialReceiptDocumentForm,
	MaterialDocumentKey,
	MaterialReceiptDocument,
	MaterialReceiptDocumentSave
>({
	api: materialReceiptDocumentApi,
	createRouteName: "materialReceiptCreate",
	listRoute: { name: "materialReceipts" },
	keyFromRoute: (route) => ({ id: Number(route.params.id ?? 0) }),
	copyKeyFromRoute: (route) =>
		route.query.copy_id
			? { id: Number(route.query.copy_id) }
			: null,
	keyFromDocument: (document) => ({ id: document.id }),
	createModel: createMaterialReceiptDocumentForm,
	fromDocument: materialReceiptDocumentToForm,
	copyModel: copyMaterialReceiptDocument,
});

const submit = async (model: MaterialReceiptDocumentSave): Promise<void> => {
	await edit.submit(model);
};
</script>

<template>
	<CollectionEditPage
		:title="t(`MaterialReceipt.form.${edit.mode.value}`)"
		:loading="edit.loading.value"
		@back="edit.goBack"
	>
		<div
			v-if="edit.mode.value === 'edit'"
			class="mb-4 flex justify-end"
		>
			<ObjectHistoryButton
				object-type="material_receipts"
				:object-id="edit.key.value.id"
			/>
		</div>
		<MaterialReceiptForm
			:model="edit.model.value"
			:mode="edit.mode.value"
			:errors="edit.errors"
			:submitting="edit.submitting.value"
			@submit="submit"
			@cancel="edit.goBack"
		/>
	</CollectionEditPage>
</template>
