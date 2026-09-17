<script setup lang="ts">
import { ref } from "vue";
import { useConfirm } from "primevue/useconfirm";

import Button from "primevue/button";
import ConfirmDialog from "primevue/confirmdialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Select from "primevue/select";
import {
	CollectionGrid,
	type CollectionGridExpose,
	type GridColumn,
	type GridCommand,
} from "@katren/vue-collection-lib";

import {
	ignoreDiadocDocument,
	listDiadocDocuments,
	restoreDiadocDocument,
	retryDiadocDocument,
	syncDiadoc,
} from "@/api/diadoc";
import DiadocStateDialog from "@/components/diadoc/DiadocStateDialog.vue";
import type {
	DiadocDocumentListRow,
	DiadocDocumentStatus,
} from "@/types/diadoc";

interface DiadocDocumentKey {
	id: number;
}

const confirm = useConfirm();
const grid = ref<CollectionGridExpose | null>(null);
const status = ref("active");
const search = ref("");
const error = ref("");
const syncing = ref(false);
const stateVisible = ref(false);

const statusOptions = [
	{ label: "Активные", value: "active" },
	{ label: "Требуют сопоставления", value: "needs_matching" },
	{ label: "Готовы к импорту", value: "ready" },
	{ label: "С ошибками", value: "failed" },
	{ label: "Исключённые", value: "ignored" },
	{ label: "Импортированные", value: "imported" },
	{ label: "Все", value: "all" },
];

const statusLabels: Record<DiadocDocumentStatus, string> = {
	received: "Получен",
	needs_matching: "Требует сопоставления",
	ready: "Готов к импорту",
	imported: "Импортирован",
	ignored: "Исключён",
	failed: "Ошибка",
	revoked: "Аннулирован",
	superseded: "Заменён",
};

const formatDate = (value: unknown): string => {
	return value instanceof Date ? value.toLocaleDateString("ru-RU") : "";
};

const formatMoney = (value: unknown): string => {
	const number = Number(value);
	return Number.isFinite(number)
		? number.toLocaleString("ru-RU", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})
		: "";
};

const reload = async (): Promise<void> => {
	error.value = "";
	await grid.value?.load();
};

const api = {
	serviceName: "DiadocDocument",
	list: (params = {}) =>
		listDiadocDocuments(
			{
				status: status.value,
				search: search.value,
			},
			params,
		),
};

const columns: GridColumn<DiadocDocumentListRow>[] = [
	{
		field: "status",
		header: "Состояние",
		headerKey: "Diadoc.fields.status",
		width: "13rem",
		format: (value) =>
			statusLabels[value as DiadocDocumentStatus] ??
			String(value),
	},
	{
		field: "document_date",
		header: "Дата Диадока",
		headerKey: "Diadoc.fields.document_date",
		width: "10rem",
		format: formatDate,
	},
	{
		field: "document_number",
		header: "Номер Диадока",
		headerKey: "Diadoc.fields.document_number",
		width: "12rem",
	},
	{
		field: "sender_name",
		header: "Поставщик Диадока",
		headerKey: "Diadoc.fields.sender_name",
		width: "22rem",
	},
	{
		field: "sender_inn",
		header: "ИНН",
		headerKey: "Diadoc.fields.sender_inn",
		width: "10rem",
	},
	{
		field: "receipt_number",
		header: "Номер поступления",
		headerKey: "Diadoc.fields.receipt_number",
		width: "13rem",
	},
	{
		field: "line_count",
		header: "Строк",
		headerKey: "Diadoc.fields.line_count",
		dataType: "number",
		align: "right",
		width: "7rem",
	},
	{
		field: "vat_amount",
		header: "НДС",
		headerKey: "Diadoc.fields.vat_amount",
		align: "right",
		width: "11rem",
		format: formatMoney,
	},
	{
		field: "amount_with_vat",
		header: "Всего",
		headerKey: "Diadoc.fields.amount_with_vat",
		align: "right",
		width: "12rem",
		format: formatMoney,
	},
	{
		field: "missing_count",
		header: "Не заполнено",
		headerKey: "Diadoc.fields.missing_count",
		dataType: "number",
		align: "right",
		width: "9rem",
	},
];

const handleError = (caught: unknown): void => {
	error.value = caught instanceof Error ? caught.message : String(caught);
};

const ignoreDocument = (row: DiadocDocumentListRow): void => {
	confirm.require({
		header: "Исключить документ",
		message: `Исключить документ №${row.document_number} из активного буфера?`,
		icon: "pi pi-exclamation-triangle",
		acceptLabel: "Исключить",
		rejectLabel: "Отмена",
		acceptClass: "p-button-danger",
		accept: async () => {
			try {
				await ignoreDiadocDocument(row.id, row.version);
				await reload();
			} catch (caught: unknown) {
				handleError(caught);
			}
		},
	});
};

const commands: GridCommand<DiadocDocumentListRow, DiadocDocumentKey>[] = [
	{ name: "edit" },
	{
		name: "ignore",
		label: "Исключить",
		icon: "pi pi-eye-slash",
		severity: "danger",
		visible: (row) =>
			Boolean(
				row &&
				row.status !== "ignored" &&
				row.status !== "imported",
			),
		handler: ({ row }) => {
			if (row) {
				ignoreDocument(row);
			}
		},
	},
	{
		name: "restore",
		label: "Вернуть",
		icon: "pi pi-undo",
		visible: (row) => row?.status === "ignored",
		handler: async ({ row, reload: reloadGrid }) => {
			if (!row) {
				return;
			}
			try {
				await restoreDiadocDocument(
					row.id,
					row.version,
				);
				await reloadGrid();
			} catch (caught: unknown) {
				handleError(caught);
			}
		},
	},
	{
		name: "retry",
		label: "Повторить",
		icon: "pi pi-replay",
		visible: (row) => row?.status === "failed",
		handler: async ({ row, reload: reloadGrid }) => {
			if (!row) {
				return;
			}
			try {
				await retryDiadocDocument(row.id, row.version);
				await reloadGrid();
			} catch (caught: unknown) {
				handleError(caught);
			}
		},
	},
	{ name: "refresh" },
];

const synchronize = async (): Promise<void> => {
	syncing.value = true;
	error.value = "";
	try {
		await syncDiadoc();
		await reload();
	} catch (caught: unknown) {
		handleError(caught);
	} finally {
		syncing.value = false;
	}
};
</script>

<template>
	<section class="space-y-4 py-4">
		<ConfirmDialog />
		<DiadocStateDialog
			v-model:visible="stateVisible"
			@changed="reload"
		/>

		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h1 class="text-2xl font-semibold">
					Документы Диадока
				</h1>
				<p class="mt-1 text-sm text-slate-500">
					Проверка, сопоставление и импорт
					поступлений материалов
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<Button
					label="Синхронизировать"
					icon="pi pi-refresh"
					:loading="syncing"
					@click="synchronize"
				/>
				<Button
					label="Настройки"
					icon="pi pi-cog"
					severity="secondary"
					@click="stateVisible = true"
				/>
			</div>
		</div>

		<Message
			v-if="error"
			severity="error"
			closable
			@close="error = ''"
		>
			{{ error }}
		</Message>

		<div
			class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 md:flex-row"
		>
			<Select
				v-model="status"
				:options="statusOptions"
				optionLabel="label"
				optionValue="value"
				class="w-full md:w-64"
				@change="reload"
			/>
			<div class="flex min-w-0 flex-1 gap-2">
				<InputText
					v-model="search"
					class="min-w-0 flex-1"
					placeholder="Номер, поставщик или ИНН"
					@keyup.enter="reload"
				/>
				<Button
					label="Найти"
					icon="pi pi-search"
					severity="secondary"
					@click="reload"
				/>
			</div>
		</div>

		<CollectionGrid
			ref="grid"
			:api="api"
			:columns="columns"
			:commands="commands"
			dataKey="id"
			:getKey="(row) => ({ id: row.id })"
			:routes="{
				edit: (row) => ({
					name: 'diadocDocumentEdit',
					params: { id: String(row.id) },
				}),
			}"
			editMode="page"
			stateKey="diadoc-document-grid"
			:pageSize="30"
			:showCommandShortcuts="false"
		/>
	</section>
</template>
