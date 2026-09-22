<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import Button from "primevue/button";
import ProgressSpinner from "primevue/progressspinner";

import { errorText } from "@katren/vue-collection-lib";

import {
	loadMaterialDocumentForPrint,
	type LoadedMaterialDocument,
} from "@/api/materialDocumentPrint";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatReference } from "@/utils/reference";
import type { MaterialDocumentPrintKind } from "@/utils/materialDocumentPrint";

interface PrintField {
	label: string;
	value: string;
	wide?: boolean;
}

interface PrintColumn {
	key: string;
	label: string;
	align?: "left" | "center" | "right";
	width?: string;
}

interface PrintRow {
	key: number;
	values: Record<string, string>;
}

interface PrintModel {
	kind: MaterialDocumentPrintKind;
	title: string;
	fields: PrintField[];
	columns: PrintColumn[];
	rows: PrintRow[];
	signatures: string[];
}

const props = defineProps<{
	kind: MaterialDocumentPrintKind;
	documentId: number;
}>();

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const loadError = ref("");
const printModel = ref<PrintModel | null>(null);
const originalDocumentTitle = document.title;
let loadSequence = 0;

const emptyValue = (value: string): string => {
	return value.trim() === "" ? "—" : value;
};

const formatDateTime = (value: Date): string => {
	return value.toLocaleString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const formatDate = (value: Date | null): string => {
	return value instanceof Date ? value.toLocaleDateString("ru-RU") : "—";
};

const formatQuantity = (value: number): string => {
	return value.toLocaleString("ru-RU", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 4,
	});
};

const referenceText = (value: unknown): string => {
	return emptyValue(formatReference(value));
};

const commonFields = (
	id: number,
	date: Date,
	comment: string | null,
): PrintField[] => [
	{
		label: t("DocumentPrint.fields.number"),
		value: String(id),
	},
	{
		label: t("DocumentPrint.fields.date"),
		value: formatDateTime(date),
	},
	{
		label: t("DocumentPrint.fields.comment"),
		value: emptyValue(comment ?? ""),
		wide: true,
	},
];

const basicColumns = (itemKey: string): PrintColumn[] => [
	{
		key: "line",
		label: t(`${itemKey}.fields.line_num`),
		align: "center",
		width: "8%",
	},
	{
		key: "material",
		label: t(`${itemKey}.fields.material_id`),
		width: "56%",
	},
	{
		key: "measureUnit",
		label: t(`${itemKey}.fields.measure_unit_id`),
		align: "center",
		width: "16%",
	},
	{
		key: "quantity",
		label: t(`${itemKey}.fields.quant`),
		align: "right",
		width: "20%",
	},
];

const normalizeDocument = (loaded: LoadedMaterialDocument): PrintModel => {
	switch (loaded.kind) {
		case "transfer": {
			const document = loaded.document;
			const fields = commonFields(
				document.id,
				document.date,
				document.comment,
			);
			fields.splice(
				2,
				0,
				{
					label: t(
						"MaterialTransfer.fields.source_construction_site_id",
					),
					value: referenceText(
						document.source_construction_site,
					),
				},
				{
					label: t(
						"MaterialTransfer.fields.destination_construction_site_id",
					),
					value: referenceText(
						document.destination_construction_site,
					),
				},
			);

			return {
				kind: loaded.kind,
				title: t("DocumentPrint.titles.transfer", {
					id: document.id,
				}),
				fields,
				columns: basicColumns("MaterialTransferItem"),
				signatures: [
					t(
						"DocumentPrint.signatures.transferred",
					),
					t("DocumentPrint.signatures.received"),
				],
				rows: [...document.items]
					.sort(
						(left, right) =>
							left.line_num -
							right.line_num,
					)
					.map((item) => ({
						key: item.id,
						values: {
							line: String(
								item.line_num,
							),
							material: referenceText(
								item.material,
							),
							measureUnit:
								referenceText(
									item.measure_unit,
								),
							quantity: formatQuantity(
								item.quant,
							),
						},
					})),
			};
		}
		case "consumption": {
			const document = loaded.document;
			const fields = commonFields(
				document.id,
				document.date,
				document.comment,
			);
			fields.splice(2, 0, {
				label: t(
					"MaterialConsumption.fields.construction_site_id",
				),
				value: referenceText(
					document.construction_site,
				),
			});

			return {
				kind: loaded.kind,
				title: t("DocumentPrint.titles.consumption", {
					id: document.id,
				}),
				fields,
				columns: basicColumns(
					"MaterialConsumptionItem",
				),
				signatures: [
					t(
						"DocumentPrint.signatures.writtenOff",
					),
					t("DocumentPrint.signatures.checked"),
				],
				rows: [...document.items]
					.sort(
						(left, right) =>
							left.line_num -
							right.line_num,
					)
					.map((item) => ({
						key: item.id,
						values: {
							line: String(
								item.line_num,
							),
							material: referenceText(
								item.material,
							),
							measureUnit:
								referenceText(
									item.measure_unit,
								),
							quantity: formatQuantity(
								item.quant,
							),
						},
					})),
			};
		}
		case "request": {
			const document = loaded.document;
			const fields = commonFields(
				document.id,
				document.date,
				document.comment,
			);
			fields.splice(
				2,
				0,
				{
					label: t(
						"MaterialRequest.fields.construction_site_id",
					),
					value: referenceText(
						document.construction_site,
					),
				},
				{
					label: t(
						"MaterialRequest.fields.construction_manager_id",
					),
					value: referenceText(
						document.construction_manager,
					),
				},
				{
					label: t(
						"MaterialRequest.fields.status_id",
					),
					value: referenceText(document.status),
				},
			);

			return {
				kind: loaded.kind,
				title: t("DocumentPrint.titles.request", {
					id: document.id,
				}),
				fields,
				columns: [
					{
						key: "line",
						label: t(
							"MaterialRequestItem.fields.line_num",
						),
						align: "center",
						width: "5%",
					},
					{
						key: "material",
						label: t(
							"MaterialRequestItem.fields.material_id",
						),
						width: "27%",
					},
					{
						key: "measureUnit",
						label: t(
							"MaterialRequestItem.fields.measure_unit_id",
						),
						align: "center",
						width: "9%",
					},
					{
						key: "quantity",
						label: t(
							"MaterialRequestItem.fields.quant",
						),
						align: "right",
						width: "9%",
					},
					{
						key: "requiredDate",
						label: t(
							"MaterialRequestItem.fields.required_date",
						),
						align: "center",
						width: "11%",
					},
					{
						key: "importance",
						label: t(
							"MaterialRequestItem.fields.order_importance_id",
						),
						width: "12%",
					},
					{
						key: "supplier",
						label: t(
							"MaterialRequestItem.fields.supplier_id",
						),
						width: "15%",
					},
					{
						key: "status",
						label: t(
							"MaterialRequestItem.fields.status_id",
						),
						width: "12%",
					},
				],
				signatures: [
					t("DocumentPrint.signatures.prepared"),
					t("DocumentPrint.signatures.approved"),
				],
				rows: [...document.items]
					.sort(
						(left, right) =>
							left.line_num -
							right.line_num,
					)
					.map((item) => ({
						key: item.id,
						values: {
							line: String(
								item.line_num,
							),
							material: referenceText(
								item.material,
							),
							measureUnit:
								referenceText(
									item.measure_unit,
								),
							quantity: formatQuantity(
								item.quant,
							),
							requiredDate:
								formatDate(
									item.required_date,
								),
							importance: referenceText(
								item.order_importance,
							),
							supplier: referenceText(
								item.supplier,
							),
							status: referenceText(
								item.status,
							),
						},
					})),
			};
		}
	}
};

const load = async (): Promise<void> => {
	const sequence = ++loadSequence;
	loading.value = true;
	loadError.value = "";
	printModel.value = null;

	try {
		const roleID = authStore.user?.role_id;
		if (roleID === undefined) {
			throw new Error(
				t(
					"DocumentPrint.errors.authenticationRequired",
				),
			);
		}
		const loaded = await loadMaterialDocumentForPrint(
			roleID,
			props.kind,
			props.documentId,
		);
		if (sequence !== loadSequence) {
			return;
		}
		const model = normalizeDocument(loaded);
		printModel.value = model;
		document.title = model.title;
	} catch (caught: unknown) {
		if (sequence === loadSequence) {
			loadError.value = errorText(caught);
		}
	} finally {
		if (sequence === loadSequence) {
			loading.value = false;
		}
	}
};

const print = (): void => {
	if (printModel.value !== null) {
		window.print();
	}
};

const close = async (): Promise<void> => {
	if (window.history.length > 1) {
		await router.back();
		return;
	}
	window.close();
};

const alignmentClass = (column: PrintColumn): string => {
	switch (column.align) {
		case "center":
			return "text-center";
		case "right":
			return "text-right tabular-nums";
		default:
			return "text-left";
	}
};

watch(
	() => [props.kind, props.documentId] as const,
	() => {
		void load();
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	loadSequence += 1;
	document.title = originalDocumentTitle;
});
</script>

<template>
	<section
		class="material-document-print-page min-h-screen bg-white text-black"
	>
		<div
			class="material-document-print-toolbar sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 shadow-sm"
		>
			<Button
				:label="t('Grid.commands.print')"
				icon="pi pi-print"
				:disabled="printModel === null"
				@click="print"
			/>
			<Button
				:label="t('DocumentPrint.actions.close')"
				icon="pi pi-times"
				severity="secondary"
				outlined
				@click="close"
			/>
		</div>

		<div
			v-if="loading"
			class="flex min-h-72 items-center justify-center"
			role="status"
			:aria-label="t('Grid.loading')"
		>
			<ProgressSpinner class="h-10 w-10" strokeWidth="4" />
		</div>

		<div
			v-else-if="loadError"
			class="mx-auto mt-8 max-w-3xl rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700"
			role="alert"
		>
			<p>{{ loadError }}</p>
			<Button
				class="mt-3"
				:label="t('DocumentPrint.actions.retry')"
				icon="pi pi-refresh"
				severity="secondary"
				outlined
				size="small"
				@click="load"
			/>
		</div>

		<article
			v-else-if="printModel !== null"
			class="material-document-print-sheet mx-auto bg-white"
			:class="
				printModel.kind === 'request'
					? 'material-document-print-sheet--request'
					: 'material-document-print-sheet--standard'
			"
		>
			<h1 class="mb-6 text-center text-xl font-semibold">
				{{ printModel.title }}
			</h1>

			<dl
				class="material-document-print-fields mb-6 grid grid-cols-2 gap-x-8 gap-y-2"
			>
				<div
					v-for="field in printModel.fields"
					:key="field.label"
					class="grid min-w-0 grid-cols-[10rem_minmax(0,1fr)] gap-2"
					:class="field.wide ? 'col-span-2' : ''"
				>
					<dt class="font-semibold">
						{{ field.label }}:
					</dt>
					<dd
						class="min-w-0 whitespace-pre-wrap break-words"
					>
						{{ field.value }}
					</dd>
				</div>
			</dl>

			<div
				class="material-document-print-table-wrap overflow-x-auto"
			>
				<table
					class="material-document-print-table w-full table-fixed border-collapse"
				>
					<colgroup>
						<col
							v-for="column in printModel.columns"
							:key="column.key"
							:style="{
								width: column.width,
							}"
						/>
					</colgroup>
					<thead>
						<tr>
							<th
								v-for="column in printModel.columns"
								:key="
									column.key
								"
								:class="
									alignmentClass(
										column,
									)
								"
							>
								{{
									column.label
								}}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in printModel.rows"
							:key="row.key"
						>
							<td
								v-for="column in printModel.columns"
								:key="
									column.key
								"
								:class="
									alignmentClass(
										column,
									)
								"
							>
								{{
									row
										.values[
										column
											.key
									]
								}}
							</td>
						</tr>
						<tr
							v-if="
								printModel.rows
									.length ===
								0
							"
						>
							<td
								:colspan="
									printModel
										.columns
										.length
								"
								class="py-6 text-center text-slate-500"
							>
								{{
									t(
										"DocumentPrint.empty",
									)
								}}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<p
				class="material-document-print-line-count mt-2 text-right text-sm"
			>
				{{
					t("DocumentPrint.lineCount", {
						count: printModel.rows.length,
					})
				}}
			</p>

			<div
				class="material-document-print-signatures mt-12 grid grid-cols-2 gap-16"
			>
				<div
					v-for="signature in printModel.signatures"
					:key="signature"
					class="flex items-end gap-3"
				>
					<span class="shrink-0 font-semibold">
						{{ signature }}:
					</span>
					<span
						class="h-5 min-w-0 flex-1 border-b border-black"
					></span>
				</div>
			</div>
		</article>
	</section>
</template>

<style>
@page material-document-standard {
	size: A4 portrait;
	margin: 12mm;
}

@page material-document-request {
	size: A4 landscape;
	margin: 10mm;
}

.material-document-print-sheet {
	box-sizing: border-box;
	font-family: Arial, sans-serif;
	font-size: 10pt;
	line-height: 1.35;
	padding: 12mm;
}

.material-document-print-sheet--standard {
	page: material-document-standard;
	width: 210mm;
}

.material-document-print-sheet--request {
	page: material-document-request;
	width: 297mm;
}

.material-document-print-sheet--request .material-document-print-table {
	min-width: 270mm;
}

.material-document-print-table th,
.material-document-print-table td {
	border: 1px solid rgb(15 23 42) !important;
	font-size: 9pt !important;
	line-height: 1.25 !important;
	overflow-wrap: anywhere;
	padding: 1.8mm 2mm !important;
	vertical-align: top;
}

.material-document-print-table th {
	background: rgb(241 245 249) !important;
	font-weight: 600;
}

@media screen and (max-width: 80rem) {
	.material-document-print-sheet {
		max-width: 100%;
		width: 100%;
	}
}

@media print {
	html,
	body,
	#app {
		background: white !important;
		min-height: 0 !important;
	}

	.material-document-print-toolbar {
		display: none !important;
	}

	.material-document-print-sheet {
		margin: 0 !important;
		max-width: none !important;
		padding: 0 !important;
		width: 100% !important;
	}

	.material-document-print-table thead {
		display: table-header-group;
	}

	.material-document-print-table tr,
	.material-document-print-fields > div,
	.material-document-print-signatures {
		break-inside: avoid;
		page-break-inside: avoid;
	}

	.material-document-print-table-wrap {
		overflow: visible !important;
	}

	.material-document-print-table th {
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
}
</style>
