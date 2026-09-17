<script setup lang="ts">
import { useI18n } from "vue-i18n";

import {
	CollectionEditPage,
	useCollectionEditPage,
} from "@katren/vue-collection-lib";
import { employeePostApi } from "@/api/employeePost.gen";
import EmployeePostForm from "@/components/employeePost/EmployeePostForm.vue";
import { useEmployeePostSchemas } from "@/composables/schemas/useEmployeePostSchemas.gen";
import {
	createEmployeePostFormModel,
	employeePostFormMutationFields,
	type EmployeePostFormModel,
} from "@/forms/employeePost.gen";
import type {
	EmployeePost,
	EmployeePostKey,
	EmployeePostNew,
	EmployeePostUpd,
} from "@/types/employeePost.gen";

const { t } = useI18n();
const schemas = useEmployeePostSchemas();
const edit = useCollectionEditPage<
	EmployeePostFormModel,
	EmployeePostKey,
	EmployeePostNew,
	EmployeePostUpd,
	EmployeePost
>({
	api: employeePostApi,
	createRouteName: "employeePostCreate",
	listRoute: { name: "employeePosts" },
	keyFromRoute: (route) => ({
		id: Number(route.params.id ?? 0),
	}),
	copyKeyFromRoute: (route) => route.query.copy_id
		? ({
			id: Number(route.query.copy_id ?? 0),
		})
		: null,
	createModel: createEmployeePostFormModel,
	copyModel: (detail) => ({
		...detail,
		id: undefined,
		name: `${detail.name} - ${t("Grid.copySuffix")}`,
	}),
	fields: employeePostFormMutationFields,
	createSchema: schemas.EmployeePostNewSchema,
	updateSchema: schemas.EmployeePostUpdSchema,
	success: { mode: "back" },
});

const submit = async (model: EmployeePostNew): Promise<void> => {
	await edit.submit(model);
};
</script>

<template>
	<CollectionEditPage
		:title="t(`EmployeePost.form.${edit.mode.value}`)"
		:loading="edit.loading.value"
		@back="edit.goBack"
	>
		<EmployeePostForm
			:model="edit.model.value"
			:mode="edit.mode.value"
			:errors="edit.errors"
			:submitting="edit.submitting.value"
			@submit="submit"
			@cancel="edit.goBack"
		/>
	</CollectionEditPage>
</template>
