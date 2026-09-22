<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import ConfirmDialog from "primevue/confirmdialog";
import { useConfirm } from "primevue/useconfirm";

import { CollectionEditPage } from "@katren/vue-collection-lib";

import { materialRequestDocumentApi } from "@/api/materialDocuments";
import DocumentPrintButton from "@/components/documents/DocumentPrintButton.vue";
import ObjectHistoryButton from "@/components/history/ObjectHistoryButton.vue";
import MaterialRequestForm from "@/components/materialRequest/MaterialRequestForm.vue";
import { useDocumentEditPage } from "@/composables/useDocumentEditPage";
import {
	copyMaterialRequestDocument,
	createMaterialRequestDocumentForm,
	materialRequestDocumentToForm,
} from "@/forms/materialDocuments";
import { useAuthStore } from "@/stores/useAuthStore";
import type {
	MaterialDocumentKey,
	MaterialRequestDocument,
	MaterialRequestDocumentForm,
	MaterialRequestDocumentSave,
} from "@/types/materialDocuments";

const DRAFT_STATUS_ID = 1;

const { t } = useI18n();
const confirm = useConfirm();
const authStore = useAuthStore();
const submittingRequest = ref(false);
const currentUser = authStore.user;
const defaultManagerID =
	currentUser?.role_id === "construction_site_manager"
		? currentUser.id
		: 0;

const createModel = (): MaterialRequestDocumentForm => {
	const model = createMaterialRequestDocumentForm(defaultManagerID);
	if (defaultManagerID > 0 && currentUser !== null) {
		model.construction_manager = {
			keys: { id: currentUser.id },
			descr: currentUser.name,
			dataType: "users",
		};
	}
	return model;
};

const copyModel = (
	document: MaterialRequestDocument,
): MaterialRequestDocumentForm => {
	const model = copyMaterialRequestDocument(document);
	if (defaultManagerID > 0 && currentUser !== null) {
		model.construction_manager_id = currentUser.id;
		model.construction_manager = {
			keys: { id: currentUser.id },
			descr: currentUser.name,
			dataType: "users",
		};
	}
	return model;
};

const edit = useDocumentEditPage<
	MaterialRequestDocumentForm,
	MaterialDocumentKey,
	MaterialRequestDocument,
	MaterialRequestDocumentSave
>({
	api: materialRequestDocumentApi,
	createRouteName: "materialRequestCreate",
	listRoute: { name: "materialRequests" },
	keyFromRoute: (route) => ({ id: Number(route.params.id ?? 0) }),
	copyKeyFromRoute: (route) =>
		route.query.copy_id
			? { id: Number(route.query.copy_id) }
			: null,
	keyFromDocument: (document) => ({ id: document.id }),
	createModel,
	fromDocument: materialRequestDocumentToForm,
	copyModel,
});

const canSubmitRequest = computed(() => {
	const roleID = authStore.user?.role_id;
	return (
		edit.mode.value === "edit" &&
		(roleID === "admin" ||
			roleID === "construction_site_manager") &&
		edit.model.value.items.length > 0 &&
		edit.model.value.items.every(
			(item) => item.status_id === DRAFT_STATUS_ID,
		)
	);
});

const submit = async (model: MaterialRequestDocumentSave): Promise<void> => {
	await edit.submit(model);
};

const submitRequest = (model: MaterialRequestDocumentSave): void => {
	confirm.require({
		header: t("MaterialRequest.actions.submitConfirmHeader"),
		message: t("MaterialRequest.actions.submitConfirmMessage"),
		icon: "pi pi-send",
		acceptLabel: t("MaterialRequest.actions.submit"),
		rejectLabel: t("Grid.commands.cancel"),
		accept: async () => {
			submittingRequest.value = true;
			edit.errors.clear();
			try {
				const saved =
					await materialRequestDocumentApi.update(
						edit.key.value,
						model,
					);
				edit.model.value =
					materialRequestDocumentToForm(saved);
				const submitted =
					await materialRequestDocumentApi.submit(
						edit.key.value,
						saved.version,
					);
				edit.model.value =
					materialRequestDocumentToForm(
						submitted,
					);
			} catch (caught: unknown) {
				edit.errors.setFromError(caught);
			} finally {
				submittingRequest.value = false;
			}
		},
	});
};
</script>

<template>
	<CollectionEditPage
		:title="t(`MaterialRequest.form.${edit.mode.value}`)"
		:loading="edit.loading.value"
		@back="edit.goBack"
	>
		<ConfirmDialog />

		<div
			v-if="edit.mode.value === 'edit'"
			class="mb-4 flex flex-wrap justify-end gap-2"
		>
			<DocumentPrintButton
				kind="request"
				:documentId="edit.key.value.id"
				:disabled="edit.loading.value"
			/>
			<ObjectHistoryButton
				object-type="material_requests"
				:object-id="edit.key.value.id"
			/>
		</div>

		<MaterialRequestForm
			:model="edit.model.value"
			:mode="edit.mode.value"
			:errors="edit.errors"
			:submitting="edit.submitting.value"
			:canSubmitRequest="canSubmitRequest"
			:submittingRequest="submittingRequest"
			@submit="submit"
			@requestSubmit="submitRequest"
			@cancel="edit.goBack"
		/>
	</CollectionEditPage>
</template>
