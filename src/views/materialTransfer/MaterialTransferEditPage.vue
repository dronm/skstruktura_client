<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { CollectionEditPage } from "@katren/vue-collection-lib";

import { materialTransferDocumentApi } from "@/api/materialDocuments";
import ObjectHistoryButton from "@/components/history/ObjectHistoryButton.vue";
import MaterialTransferForm from "@/components/materialTransfer/MaterialTransferForm.vue";
import { useDocumentEditPage } from "@/composables/useDocumentEditPage";
import {
	copyMaterialTransferDocument,
	createMaterialTransferDocumentForm,
	materialTransferDocumentToForm,
} from "@/forms/materialDocuments";
import type {
	MaterialDocumentKey,
	MaterialTransferDocument,
	MaterialTransferDocumentForm,
	MaterialTransferDocumentSave,
} from "@/types/materialDocuments";

const { t } = useI18n();
const edit = useDocumentEditPage<
	MaterialTransferDocumentForm,
	MaterialDocumentKey,
	MaterialTransferDocument,
	MaterialTransferDocumentSave
>({
	api: materialTransferDocumentApi,
	createRouteName: "materialTransferCreate",
	listRoute: { name: "materialTransfers" },
	keyFromRoute: (route) => ({ id: Number(route.params.id ?? 0) }),
	copyKeyFromRoute: (route) =>
		route.query.copy_id
			? { id: Number(route.query.copy_id) }
			: null,
	keyFromDocument: (document) => ({ id: document.id }),
	createModel: createMaterialTransferDocumentForm,
	fromDocument: materialTransferDocumentToForm,
	copyModel: copyMaterialTransferDocument,
});

const submit = async (model: MaterialTransferDocumentSave): Promise<void> => {
	await edit.submit(model);
};
</script>

<template>
	<CollectionEditPage
		:title="t(`MaterialTransfer.form.${edit.mode.value}`)"
		:loading="edit.loading.value"
		@back="edit.goBack"
	>
		<div
			v-if="edit.mode.value === 'edit'"
			class="mb-4 flex justify-end"
		>
			<ObjectHistoryButton
				object-type="material_transfers"
				:object-id="edit.key.value.id"
			/>
		</div>
		<MaterialTransferForm
			:model="edit.model.value"
			:mode="edit.mode.value"
			:errors="edit.errors"
			:submitting="edit.submitting.value"
			@submit="submit"
			@cancel="edit.goBack"
		/>
	</CollectionEditPage>
</template>
