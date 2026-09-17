<script setup lang="ts">
import { useI18n } from "vue-i18n";

import {
	CollectionEditPage,
	useCollectionEditPage,
} from "@katren/vue-collection-lib";

import { materialApi, type MaterialEditDetail } from "@/api/material";
import ObjectHistoryButton from "@/components/history/ObjectHistoryButton.vue";
import MaterialForm from "@/components/material/MaterialForm.vue";
import { useMaterialSchemas } from "@/composables/schemas/useMaterialSchemas.gen";
import {
	createMaterialFormModel,
	materialFormMutationFields,
	type MaterialFormModel,
} from "@/forms/material.gen";
import type {
	MaterialKey,
	MaterialNew,
	MaterialUpd,
} from "@/types/material.gen";

const { t } = useI18n();
const schemas = useMaterialSchemas();
const edit = useCollectionEditPage<
	MaterialFormModel,
	MaterialKey,
	MaterialNew,
	MaterialUpd,
	MaterialEditDetail
>({
	api: materialApi,
	createRouteName: "materialCreate",
	listRoute: { name: "materials" },
	keyFromRoute: (route) => ({ id: Number(route.params.id ?? 0) }),
	copyKeyFromRoute: (route) =>
		route.query.copy_id
			? { id: Number(route.query.copy_id) }
			: null,
	createModel: createMaterialFormModel,
	copyModel: (detail) => ({
		...detail,
		id: undefined,
		name: `${detail.name} - ${t("Grid.copySuffix")}`,
	}),
	fields: materialFormMutationFields,
	createSchema: schemas.MaterialNewSchema,
	updateSchema: schemas.MaterialUpdSchema,
	success: { mode: "back" },
});

const submit = async (model: MaterialNew): Promise<void> => {
	await edit.submit(model);
};
</script>

<template>
	<CollectionEditPage
		:title="t(`Material.form.${edit.mode.value}`)"
		:loading="edit.loading.value"
		@back="edit.goBack"
	>
		<div
			v-if="edit.mode.value === 'edit'"
			class="mb-4 flex justify-end"
		>
			<ObjectHistoryButton
				object-type="materials"
				:object-id="edit.key.value.id"
			/>
		</div>
		<MaterialForm
			:model="edit.model.value"
			:mode="edit.mode.value"
			:errors="edit.errors"
			:submitting="edit.submitting.value"
			@submit="submit"
			@cancel="edit.goBack"
		/>
	</CollectionEditPage>
</template>
