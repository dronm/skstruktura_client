<script setup lang="ts">
import { useI18n } from "vue-i18n";

import {
	CollectionEditPage,
	useCollectionEditPage,
} from "@katren/vue-collection-lib";

import { constructionSiteApi } from "@/api/constructionSite.gen";
import ConstructionSiteForm from "@/components/constructionSite/ConstructionSiteForm.vue";
import ObjectHistoryButton from "@/components/history/ObjectHistoryButton.vue";
import { useConstructionSiteSchemas } from "@/composables/schemas/useConstructionSiteSchemas.gen";
import {
	createConstructionSiteFormModel,
	constructionSiteFormMutationFields,
	type ConstructionSiteFormModel,
} from "@/forms/constructionSite.gen";
import type {
	ConstructionSite,
	ConstructionSiteKey,
	ConstructionSiteNew,
	ConstructionSiteUpd,
} from "@/types/constructionSite.gen";

const { t } = useI18n();
const schemas = useConstructionSiteSchemas();
const edit = useCollectionEditPage<
	ConstructionSiteFormModel,
	ConstructionSiteKey,
	ConstructionSiteNew,
	ConstructionSiteUpd,
	ConstructionSite
>({
	api: constructionSiteApi,
	createRouteName: "constructionSiteCreate",
	listRoute: { name: "constructionSites" },
	keyFromRoute: (route) => ({ id: Number(route.params.id ?? 0) }),
	copyKeyFromRoute: (route) =>
		route.query.copy_id
			? { id: Number(route.query.copy_id) }
			: null,
	createModel: createConstructionSiteFormModel,
	copyModel: (detail) => ({
		...detail,
		id: undefined,
		name: `${detail.name} - ${t("Grid.copySuffix")}`,
	}),
	fields: constructionSiteFormMutationFields,
	createSchema: schemas.ConstructionSiteNewSchema,
	updateSchema: schemas.ConstructionSiteUpdSchema,
	success: { mode: "back" },
});

const submit = async (model: ConstructionSiteNew): Promise<void> => {
	await edit.submit(model);
};
</script>

<template>
	<CollectionEditPage
		:title="t(`ConstructionSite.form.${edit.mode.value}`)"
		:loading="edit.loading.value"
		@back="edit.goBack"
	>
		<div
			v-if="edit.mode.value === 'edit'"
			class="mb-4 flex justify-end"
		>
			<ObjectHistoryButton
				object-type="construction_sites"
				:object-id="edit.key.value.id"
			/>
		</div>
		<ConstructionSiteForm
			:model="edit.model.value"
			:mode="edit.mode.value"
			:errors="edit.errors"
			:submitting="edit.submitting.value"
			@submit="submit"
			@cancel="edit.goBack"
		/>
	</CollectionEditPage>
</template>
