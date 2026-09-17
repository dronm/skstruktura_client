<script setup lang="ts">
import { useI18n } from "vue-i18n";

import {
	CollectionEditPage,
	useCollectionEditPage,
} from "@katren/vue-collection-lib";
import { notificationTemplateApi } from "@/api/notificationTemplate.gen";
import NotificationTemplateForm from "@/components/notificationTemplate/NotificationTemplateForm.vue";
import { useNotificationTemplateSchemas } from "@/composables/schemas/useNotificationTemplateSchemas.gen";
import {
	createNotificationTemplateFormModel,
	notificationTemplateFormMutationFields,
	type NotificationTemplateFormModel,
} from "@/forms/notificationTemplate.gen";
import type {
	NotificationTemplate,
	NotificationTemplateKey,
	NotificationTemplateNew,
	NotificationTemplateUpd,
} from "@/types/notificationTemplate.gen";

const { t } = useI18n();
const schemas = useNotificationTemplateSchemas();
const edit = useCollectionEditPage<
	NotificationTemplateFormModel,
	NotificationTemplateKey,
	NotificationTemplateNew,
	NotificationTemplateUpd,
	NotificationTemplate
>({
	api: notificationTemplateApi,
	createRouteName: "notificationTemplateCreate",
	listRoute: { name: "notificationTemplates" },
	keyFromRoute: (route) => ({
		id: Number(route.params.id ?? 0),
	}),
	copyKeyFromRoute: (route) => route.query.copy_id
		? ({
			id: Number(route.query.copy_id ?? 0),
		})
		: null,
	createModel: createNotificationTemplateFormModel,
	copyModel: (detail) => ({
		...detail,
		id: undefined,
	}),
	fields: notificationTemplateFormMutationFields,
	createSchema: schemas.NotificationTemplateNewSchema,
	updateSchema: schemas.NotificationTemplateUpdSchema,
	success: { mode: "back" },
});

const submit = async (model: NotificationTemplateNew): Promise<void> => {
	await edit.submit(model);
};
</script>

<template>
	<CollectionEditPage
		:title="t(`NotificationTemplate.form.${edit.mode.value}`)"
		:loading="edit.loading.value"
		@back="edit.goBack"
	>
		<NotificationTemplateForm
			:model="edit.model.value"
			:mode="edit.mode.value"
			:errors="edit.errors"
			:submitting="edit.submitting.value"
			@submit="submit"
			@cancel="edit.goBack"
		/>
	</CollectionEditPage>
</template>
