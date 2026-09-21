<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

import MultiReferenceGrid from "@/components/reports/MultiReferenceGrid.vue";
import { constructionSiteReference } from "@/references/inventoryReferences";

const constructionSiteIDs = defineModel<number[]>({ required: true });

const { t } = useI18n();
const rootElement = ref<HTMLElement | null>(null);

const hasPendingEdit = (): boolean => {
	return Boolean(
		rootElement.value?.querySelector(
			".p-datatable-row-editor-save",
		),
	);
};

defineExpose({
	hasPendingEdit,
});
</script>

<template>
	<div ref="rootElement">
		<MultiReferenceGrid
			v-model="constructionSiteIDs"
			:title="t('User.constructionSites.title')"
			headerKey="User.constructionSites.fields.construction_site_id"
			:reference="constructionSiteReference"
		/>
	</div>
</template>
