<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import Button from "primevue/button";

import {
	openMaterialDocumentPrint,
	type MaterialDocumentPrintKind,
} from "@/utils/materialDocumentPrint";

const props = withDefaults(
	defineProps<{
		kind: MaterialDocumentPrintKind;
		documentId: number | null | undefined;
		disabled?: boolean;
		small?: boolean;
	}>(),
	{
		disabled: false,
		small: false,
	},
);

const { t } = useI18n();
const router = useRouter();
const available = computed(() => {
	return (
		!props.disabled &&
		typeof props.documentId === "number" &&
		Number.isInteger(props.documentId) &&
		props.documentId > 0
	);
});

const openPrintPage = (event: MouseEvent): void => {
	event.stopPropagation();
	const documentID = props.documentId;
	if (!available.value || typeof documentID !== "number") {
		return;
	}

	openMaterialDocumentPrint(router, props.kind, documentID);
};
</script>

<template>
	<Button
		type="button"
		:label="t('Grid.commands.print')"
		icon="pi pi-print"
		severity="secondary"
		outlined
		:size="props.small ? 'small' : undefined"
		:disabled="!available"
		@click="openPrintPage"
	/>
</template>
