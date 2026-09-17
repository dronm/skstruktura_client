<script setup lang="ts">
import { useI18n } from "vue-i18n";

import {
	CollectionEditPage,
	useCollectionEditPage,
} from "@katren/vue-collection-lib";
import { materialTypeApi } from "@/api/materialType.gen";
import MaterialTypeForm from "@/components/materialType/MaterialTypeForm.vue";
import { useMaterialTypeSchemas } from "@/composables/schemas/useMaterialTypeSchemas.gen";
import {
	createMaterialTypeFormModel,
	materialTypeFormMutationFields,
	type MaterialTypeFormModel,
} from "@/forms/materialType.gen";
import type {
	MaterialType,
	MaterialTypeKey,
	MaterialTypeNew,
	MaterialTypeUpd,
} from "@/types/materialType.gen";

const { t } = useI18n();
const schemas = useMaterialTypeSchemas();
const edit = useCollectionEditPage<
	MaterialTypeFormModel,
	MaterialTypeKey,
	MaterialTypeNew,
	MaterialTypeUpd,
	MaterialType
>({
	api: materialTypeApi,
	createRouteName: "materialTypeCreate",
	listRoute: { name: "materialTypes" },
	keyFromRoute: (route) => ({
		id: Number(route.params.id ?? 0),
	}),
	copyKeyFromRoute: (route) => route.query.copy_id
		? ({
			id: Number(route.query.copy_id ?? 0),
		})
		: null,
	createModel: createMaterialTypeFormModel,
	copyModel: (detail) => ({
		...detail,
		id: undefined,
		name: `${detail.name} - ${t("Grid.copySuffix")}`,
	}),
	fields: materialTypeFormMutationFields,
	createSchema: schemas.MaterialTypeNewSchema,
	updateSchema: schemas.MaterialTypeUpdSchema,
	success: { mode: "back" },
});

const submit = async (model: MaterialTypeNew): Promise<void> => {
	await edit.submit(model);
};
</script>

<template>
	<CollectionEditPage
		:title="t(`MaterialType.form.${edit.mode.value}`)"
		:loading="edit.loading.value"
		@back="edit.goBack"
	>
		<MaterialTypeForm
			:model="edit.model.value"
			:mode="edit.mode.value"
			:errors="edit.errors"
			:submitting="edit.submitting.value"
			@submit="submit"
			@cancel="edit.goBack"
		/>
	</CollectionEditPage>
</template>
