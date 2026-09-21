<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";

import Button from "primevue/button";

import { exportReportTablesToExcel } from "@/utils/reportOutput";

const props = withDefaults(
	defineProps<{
		title: string;
		sheetName?: string;
		fileName?: string;
		hasContent?: boolean;
	}>(),
	{
		sheetName: "Report",
		fileName: "report.xls",
		hasContent: false,
	},
);

const { t } = useI18n();
const content = ref<HTMLElement | null>(null);
let printCleanupTimer: number | undefined;

const exportExcel = (): void => {
	if (content.value === null || !props.hasContent) {
		return;
	}

	exportReportTablesToExcel(
		content.value,
		props.sheetName,
		props.fileName,
	);
};

const clearPrintMode = (): void => {
	document.body.classList.remove("report-printing");
	window.removeEventListener("afterprint", clearPrintMode);
	if (printCleanupTimer !== undefined) {
		window.clearTimeout(printCleanupTimer);
		printCleanupTimer = undefined;
	}
};

const printReport = (): void => {
	if (content.value === null || !props.hasContent) {
		return;
	}

	document.body.classList.add("report-printing");
	window.addEventListener("afterprint", clearPrintMode);
	printCleanupTimer = window.setTimeout(clearPrintMode, 60_000);
	window.print();
};

onBeforeUnmount(clearPrintMode);
</script>

<template>
	<section
		class="overflow-hidden rounded-lg border border-gray-200 bg-white"
	>
		<div
			class="report-action-panel flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3"
		>
			<Button
				:label="t('Report.commands.exportExcel')"
				icon="pi pi-file-excel"
				severity="success"
				outlined
				:disabled="!props.hasContent"
				@click="exportExcel"
			/>
			<Button
				:label="t('Report.commands.print')"
				icon="pi pi-print"
				severity="secondary"
				outlined
				:disabled="!props.hasContent"
				@click="printReport"
			/>
			<slot name="actions" />
		</div>

		<div ref="content" class="report-print-root p-4">
			<h1 class="mb-4 text-xl font-semibold">
				{{ props.title }}
			</h1>
			<slot />
		</div>
	</section>
</template>

<style>
@media print {
	body.report-printing * {
		visibility: hidden !important;
	}

	body.report-printing .report-print-root,
	body.report-printing .report-print-root * {
		visibility: visible !important;
	}

	body.report-printing .report-print-root {
		position: absolute;
		inset: 0 auto auto 0;
		width: 100%;
		padding: 0 !important;
	}

	body.report-printing [data-report-exclude] {
		display: none !important;
	}
}
</style>
