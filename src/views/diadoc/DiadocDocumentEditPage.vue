<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useConfirm } from "primevue/useconfirm";

import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Column from "primevue/column";
import ColumnGroup from "primevue/columngroup";
import ConfirmDialog from "primevue/confirmdialog";
import DataTable from "primevue/datatable";
import DatePicker from "primevue/datepicker";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Row from "primevue/row";
import Tag from "primevue/tag";
import Textarea from "primevue/textarea";
import {
	CollectionEditPage,
	FilterOperatorParam,
	ReferenceKeyInput,
} from "@katren/vue-collection-lib";

import {
	excludeDiadocItem,
	getDiadocDocument,
	ignoreDiadocDocument,
	importDiadocDocument,
	resolveDiadocDocument,
	restoreDiadocDocument,
	restoreDiadocItem,
} from "@/api/diadoc";
import { materialApi } from "@/api/material.gen";
import DiadocCatalogCreateDialogs from "@/components/diadoc/DiadocCatalogCreateDialogs.vue";
import DiadocTotalsCards from "@/components/diadoc/DiadocTotalsCards.vue";
import {
	constructionSiteReference,
	materialReference,
	supplierReference,
} from "@/references/inventoryReferences";
import type {
	DiadocDocumentDetail,
	DiadocDocumentItem,
	DiadocDocumentStatus,
	DiadocReadinessIssue,
	DiadocResolutionRequest,
} from "@/types/diadoc";

const route = useRoute();
const router = useRouter();
const confirm = useConfirm();
const catalogDialogs = ref<InstanceType<
	typeof DiadocCatalogCreateDialogs
> | null>(null);
const document = ref<DiadocDocumentDetail | null>(null);
const loading = ref(true);
const saving = ref(false);
const importing = ref(false);
const itemActionID = ref<number | null>(null);
const error = ref("");
const dirty = ref(false);
const rememberSupplierMatch = ref(true);

const documentID = computed(() => Number(route.params.id ?? 0));

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

const readinessLabels: Record<string, string> = {
	supplier_required: "Не выбран поставщик",
	supplier_inactive: "Выбранный поставщик неактивен",
	construction_site_required: "Не выбран объект строительства",
	construction_site_inactive: "Выбранный объект строительства неактивен",
	receipt_date_required: "Не указана дата поступления",
	receipt_number_required: "Не указан номер поступления",
	included_items_required:
		"Для импорта должна остаться хотя бы одна строка",
	material_required: "Не выбран материал",
	material_inactive: "Выбранный материал неактивен",
	measure_unit_required: "Не определена единица измерения",
	measure_unit_inactive: "Единица измерения неактивна",
	material_measure_unit_mismatch:
		"Единица измерения не соответствует материалу",
	conversion_factor_required: "Не указан коэффициент пересчёта",
	import_quantity_required: "Не рассчитано количество",
	import_price_required: "Не рассчитана цена",
	import_amount_invalid: "Сумма импорта отличается от суммы Диадока",
	import_vat_percent_invalid: "Ставка НДС отличается от Диадока",
	import_vat_amount_invalid: "Сумма НДС отличается от Диадока",
};

const warningLabels: Record<string, string> = {
	possible_duplicate_receipt:
		"В поступлениях уже есть документ с таким поставщиком, номером и датой",
};

const formatDate = (value: Date | null): string => {
	return value?.toLocaleDateString("ru-RU") ?? "—";
};

const numberValue = (value: string | number | null | undefined): number => {
	const result = Number(value);
	return Number.isFinite(result) ? result : 0;
};

const money = (value: string | number | null | undefined): string => {
	return numberValue(value).toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

const price = (value: string | number | null | undefined): string => {
	return numberValue(value).toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 6,
	});
};

const quantity = (value: string | number | null | undefined): string => {
	return numberValue(value).toLocaleString("ru-RU", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 4,
	});
};

const targetQuantity = (item: DiadocDocumentItem): number => {
	if (item.conversion_factor && item.conversion_factor > 0) {
		return numberValue(item.source_quant) * item.conversion_factor;
	}
	return numberValue(item.import_quant);
};

const targetPrice = (item: DiadocDocumentItem): number => {
	const quant = targetQuantity(item);
	return quant > 0 ? numberValue(item.source_amount_with_vat) / quant : 0;
};

const hasImportValuePrerequisites = (
	item: DiadocDocumentItem | undefined,
): item is DiadocDocumentItem => {
	return Boolean(
		item &&
		item.material_id > 0 &&
		item.measure_unit_id > 0 &&
		item.conversion_factor !== null &&
		item.conversion_factor > 0,
	);
};

const hasConstructionSite = (item: DiadocDocumentItem): boolean => {
	return (
		(item.construction_site_id ?? 0) > 0 ||
		(document.value?.construction_site_id ?? 0) > 0
	);
};

const issueIsActive = (
	issue: DiadocReadinessIssue,
	item?: DiadocDocumentItem,
): boolean => {
	const currentItem =
		item ??
		(issue.item_id
			? document.value?.items.find(
					(candidate) =>
						candidate.id === issue.item_id,
				)
			: undefined);
	if (currentItem?.is_excluded) {
		return false;
	}

	switch (issue.code) {
		case "supplier_required":
			return (
				!document.value ||
				document.value.supplier_id <= 0
			);
		case "construction_site_required":
			return (
				!document.value ||
				(currentItem
					? !hasConstructionSite(currentItem)
					: document.value.items.some(
							(candidate) =>
								!candidate.is_excluded &&
								!hasConstructionSite(
									candidate,
								),
						))
			);
		case "receipt_number_required":
			return !document.value?.receipt_number.trim();
		case "receipt_date_required":
			return !document.value?.receipt_date;
		case "included_items_required":
			return !document.value?.items.some(
				(candidate) => !candidate.is_excluded,
			);
		case "material_required":
			return !currentItem || currentItem.material_id <= 0;
		case "measure_unit_required":
			return !currentItem || currentItem.measure_unit_id <= 0;
		case "conversion_factor_required":
			return (
				!currentItem ||
				currentItem.conversion_factor === null ||
				currentItem.conversion_factor <= 0
			);
		case "import_quantity_required":
			return !currentItem || targetQuantity(currentItem) <= 0;
		case "import_price_required":
			return !currentItem || targetQuantity(currentItem) <= 0;
		case "import_amount_invalid":
		case "import_vat_percent_invalid":
		case "import_vat_amount_invalid":
			return (
				hasImportValuePrerequisites(currentItem) &&
				!dirty.value
			);
		default:
			return true;
	}
};

const locallyRequiredIssues = (): DiadocReadinessIssue[] => {
	if (!document.value) {
		return [];
	}

	const issues: DiadocReadinessIssue[] = [];
	if (document.value.supplier_id <= 0) {
		issues.push({
			code: "supplier_required",
			field: "supplier_id",
		});
	}
	if (!document.value.receipt_number.trim()) {
		issues.push({
			code: "receipt_number_required",
			field: "receipt_number",
		});
	}
	if (!document.value.receipt_date) {
		issues.push({
			code: "receipt_date_required",
			field: "receipt_date",
		});
	}

	const includedItems = document.value.items.filter(
		(item) => !item.is_excluded,
	);
	if (includedItems.length === 0) {
		issues.push({
			code: "included_items_required",
			field: "items",
		});
	}
	includedItems.forEach((item) => {
		if (!hasConstructionSite(item)) {
			issues.push({
				code: "construction_site_required",
				field: "construction_site_id",
				item_id: item.id,
			});
		}
		if (item.material_id <= 0) {
			issues.push({
				code: "material_required",
				field: "material_id",
				item_id: item.id,
			});
		}
		if (item.measure_unit_id <= 0) {
			issues.push({
				code: "measure_unit_required",
				field: "measure_unit_id",
				item_id: item.id,
			});
		}
		if (
			item.conversion_factor === null ||
			item.conversion_factor <= 0
		) {
			issues.push({
				code: "conversion_factor_required",
				field: "conversion_factor",
				item_id: item.id,
			});
		}
	});

	return issues;
};

const issueKey = (issue: DiadocReadinessIssue): string => {
	return `${issue.code}:${issue.item_id ?? 0}`;
};

const displayedMissing = computed<DiadocReadinessIssue[]>(() => {
	if (!document.value) {
		return [];
	}

	const localIssues = locallyRequiredIssues();
	const localKeys = new Set(localIssues.map(issueKey));
	const serverIssues = document.value.readiness.missing.filter(
		(issue) =>
			issueIsActive(issue) && !localKeys.has(issueKey(issue)),
	);
	return [...localIssues, ...serverIssues];
});

const displayedItemIssues = (item: DiadocDocumentItem): string[] => {
	if (item.is_excluded) {
		return [];
	}

	const issues = item.issues.filter((code) =>
		issueIsActive({ code, field: "", item_id: item.id }, item),
	);
	if (
		!hasConstructionSite(item) &&
		!issues.includes("construction_site_required")
	) {
		issues.push("construction_site_required");
	}
	if (item.material_id <= 0 && !issues.includes("material_required")) {
		issues.push("material_required");
	}
	if (
		item.measure_unit_id <= 0 &&
		!issues.includes("measure_unit_required")
	) {
		issues.push("measure_unit_required");
	}
	if (
		(item.conversion_factor === null ||
			item.conversion_factor <= 0) &&
		!issues.includes("conversion_factor_required")
	) {
		issues.push("conversion_factor_required");
	}
	return issues;
};

const rowClass = (item: DiadocDocumentItem): string => {
	return item.is_excluded ? "diadoc-row-excluded" : "";
};

const markDirty = (): void => {
	dirty.value = true;
};

const applyDocument = (
	next: DiadocDocumentDetail,
	preserveEdits = false,
): void => {
	if (preserveEdits && document.value) {
		const current = document.value;
		const currentItems = new Map(
			current.items.map((item) => [item.id, item]),
		);
		next.supplier_id = current.supplier_id;
		next.supplier = current.supplier;
		next.construction_site = current.construction_site;
		next.construction_site_id = current.construction_site_id;
		next.receipt_number = current.receipt_number;
		next.receipt_date = current.receipt_date;
		next.receipt_comment = current.receipt_comment;
		next.items = next.items.map((item) => {
			const edited = currentItems.get(item.id);
			return edited
				? {
						...item,
						material_id: edited.material_id,
						material: edited.material,
						measure_unit:
							edited.measure_unit,
						construction_site_id:
							edited.construction_site_id,
						construction_site:
							edited.construction_site,
						measure_unit_id:
							edited.measure_unit_id,
						conversion_factor:
							edited.conversion_factor,
					}
				: item;
		});
	}

	document.value = next;
};

const load = async (): Promise<void> => {
	loading.value = true;
	error.value = "";
	try {
		applyDocument(await getDiadocDocument(documentID.value));
		dirty.value = false;
	} catch (caught: unknown) {
		error.value =
			caught instanceof Error
				? caught.message
				: String(caught);
	} finally {
		loading.value = false;
	}
};

const setSupplier = (value: number | null): void => {
	if (document.value) {
		document.value.supplier_id = value ?? 0;
		markDirty();
	}
};

const setConstructionSite = (value: number | null): void => {
	if (document.value) {
		document.value.construction_site_id = value ?? 0;
		markDirty();
	}
};

const setItemConstructionSite = (
	item: DiadocDocumentItem,
	value: number | null,
): void => {
	item.construction_site_id = value && value > 0 ? value : null;
	markDirty();
};

const openSupplierCreate = (): void => {
	if (document.value) {
		catalogDialogs.value?.openSupplier(document.value);
	}
};

const openMaterialCreate = (item: DiadocDocumentItem): void => {
	void catalogDialogs.value?.openMaterial(item);
};

const supplierCreated = (id: number): void => {
	rememberSupplierMatch.value = true;
	setSupplier(id);
};

const materialCreated = async (itemID: number, id: number): Promise<void> => {
	const item = document.value?.items.find(
		(candidate) => candidate.id === itemID,
	);
	if (item) {
		await setMaterial(item, id);
	}
};

const setReceiptNumber = (value: string | undefined): void => {
	if (document.value) {
		document.value.receipt_number = value ?? "";
		markDirty();
	}
};

const setReceiptDate = (
	value: Date | Date[] | (Date | null)[] | null | undefined,
): void => {
	if (document.value) {
		document.value.receipt_date =
			value instanceof Date ? value : null;
		markDirty();
	}
};

const setReceiptComment = (value: string | undefined): void => {
	if (document.value) {
		document.value.receipt_comment = value ?? "";
		markDirty();
	}
};

const setMaterial = async (
	item: DiadocDocumentItem,
	value: number | null,
): Promise<void> => {
	item.material_id = value ?? 0;
	item.measure_unit_id = 0;
	markDirty();
	if (!value || value <= 0) {
		return;
	}

	try {
		const response = await materialApi.list({
			filter: [
				{
					f: {
						id: {
							o: FilterOperatorParam.E,
							v: value,
						},
					},
				},
			],
			count: 1,
		});
		const material = response.rows[0];
		if (item.material_id === value && material) {
			item.measure_unit_id = material.measure_unit_id;
			const unitReference = material.measure_unit as {
				keys?: { id?: number };
				descr?: string;
			};
			if (typeof unitReference.descr === "string") {
				item.measure_unit = {
					keys: { id: material.measure_unit_id },
					descr: unitReference.descr,
				};
			}
		}
	} catch (caught: unknown) {
		error.value =
			caught instanceof Error
				? caught.message
				: String(caught);
	}
};

const setFactor = (
	item: DiadocDocumentItem,
	value: number | null | undefined,
): void => {
	item.conversion_factor = value ?? null;
	markDirty();
};

const save = async (): Promise<void> => {
	if (!document.value) {
		return;
	}
	if (
		document.value.supplier_id <= 0 ||
		document.value.items.some(
			(item) =>
				!item.is_excluded && !hasConstructionSite(item),
		) ||
		!document.value.receipt_date ||
		document.value.receipt_number.trim() === ""
	) {
		error.value =
			"Заполните поставщика, номер и дату поступления. Выберите объект в шапке или для каждой включённой позиции.";
		return;
	}

	const request: DiadocResolutionRequest = {
		version: document.value.version,
		supplier_id: document.value.supplier_id,
		construction_site_id:
			document.value.construction_site_id || null,
		receipt_number: document.value.receipt_number.trim(),
		receipt_date: document.value.receipt_date,
		receipt_comment: document.value.receipt_comment.trim(),
		remember_supplier_match: rememberSupplierMatch.value,
		items: document.value.items.map((item) => ({
			id: item.id,
			material_id: item.material_id,
			construction_site_id: item.construction_site_id || null,
			conversion_factor: String(item.conversion_factor),
			remember_material_match: true,
		})),
	};

	saving.value = true;
	error.value = "";
	try {
		applyDocument(
			await resolveDiadocDocument(document.value.id, request),
		);
		dirty.value = false;
	} catch (caught: unknown) {
		error.value =
			caught instanceof Error
				? caught.message
				: String(caught);
	} finally {
		saving.value = false;
	}
};

const toggleItem = async (item: DiadocDocumentItem): Promise<void> => {
	if (!document.value) {
		return;
	}

	itemActionID.value = item.id;
	error.value = "";
	try {
		const response = item.is_excluded
			? await restoreDiadocItem(
					document.value.id,
					item.id,
					document.value.version,
				)
			: await excludeDiadocItem(
					document.value.id,
					item.id,
					document.value.version,
				);
		applyDocument(response, dirty.value);
	} catch (caught: unknown) {
		error.value =
			caught instanceof Error
				? caught.message
				: String(caught);
	} finally {
		itemActionID.value = null;
	}
};

const executeImport = async (): Promise<void> => {
	if (!document.value) {
		return;
	}

	importing.value = true;
	error.value = "";
	try {
		const response = await importDiadocDocument(
			document.value.id,
			document.value.version,
		);
		await router.push({
			name: "materialReceiptEdit",
			params: { id: String(response.material_receipt_id) },
		});
	} catch (caught: unknown) {
		error.value =
			caught instanceof Error
				? caught.message
				: String(caught);
	} finally {
		importing.value = false;
	}
};

const requestImport = (): void => {
	confirm.require({
		header: "Импорт документа",
		message: "Будет создано поступление материалов и проведено по регистру. Продолжить?",
		icon: "pi pi-check-circle",
		acceptLabel: "Импортировать",
		rejectLabel: "Отмена",
		accept: () => {
			void executeImport();
		},
	});
};

const ignoreDocument = (): void => {
	if (!document.value) {
		return;
	}
	confirm.require({
		header: "Исключить документ",
		message: "Документ исчезнет из активного буфера, но останется доступен через фильтр.",
		icon: "pi pi-exclamation-triangle",
		acceptLabel: "Исключить",
		rejectLabel: "Отмена",
		acceptClass: "p-button-danger",
		accept: async () => {
			if (!document.value) {
				return;
			}
			try {
				await ignoreDiadocDocument(
					document.value.id,
					document.value.version,
				);
				await router.push({ name: "diadocDocuments" });
			} catch (caught: unknown) {
				error.value =
					caught instanceof Error
						? caught.message
						: String(caught);
			}
		},
	});
};

const restoreDocument = async (): Promise<void> => {
	if (!document.value) {
		return;
	}
	try {
		applyDocument(
			await restoreDiadocDocument(
				document.value.id,
				document.value.version,
			),
		);
	} catch (caught: unknown) {
		error.value =
			caught instanceof Error
				? caught.message
				: String(caught);
	}
};

const goBack = async (): Promise<void> => {
	await router.push({ name: "diadocDocuments" });
};

onMounted(load);
</script>

<template>
	<CollectionEditPage
		title="Импорт документа Диадока"
		:loading="loading"
		@back="goBack"
	>
		<ConfirmDialog />
		<DiadocCatalogCreateDialogs
			ref="catalogDialogs"
			@supplier-created="supplierCreated"
			@material-created="materialCreated"
		/>
		<div v-if="document" class="space-y-5">
			<div
				class="flex flex-wrap items-center justify-between gap-3"
			>
				<div class="flex flex-wrap items-center gap-2">
					<Tag
						:value="
							statusLabels[
								document.status
							]
						"
						:severity="
							document.status ===
							'ready'
								? 'success'
								: document.status ===
									  'failed'
									? 'danger'
									: 'warn'
						"
					/>
					<Tag
						v-if="dirty"
						value="Есть несохранённые изменения"
						severity="info"
					/>
					<Button
						v-if="
							document.material_receipt_id
						"
						label="Открыть поступление"
						icon="pi pi-external-link"
						severity="secondary"
						@click="
							router.push({
								name: 'materialReceiptEdit',
								params: {
									id: String(
										document.material_receipt_id,
									),
								},
							})
						"
					/>
				</div>
				<div class="flex flex-wrap gap-2">
					<Button
						v-if="
							document.status ===
							'ignored'
						"
						label="Вернуть в буфер"
						icon="pi pi-undo"
						severity="secondary"
						@click="restoreDocument"
					/>
					<Button
						v-else-if="
							document.status !==
							'imported'
						"
						label="Исключить документ"
						icon="pi pi-eye-slash"
						severity="danger"
						outlined
						@click="ignoreDocument"
					/>
					<Button
						label="Сохранить сопоставления"
						icon="pi pi-save"
						:loading="saving"
						:disabled="
							document.status ===
								'imported' ||
							document.status ===
								'ignored'
						"
						@click="save"
					/>
					<Button
						label="Импортировать"
						icon="pi pi-check"
						severity="success"
						:loading="importing"
						:disabled="
							!document.readiness
								.ready || dirty
						"
						@click="requestImport"
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

			<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<section
					class="rounded-xl border border-sky-200 bg-sky-50/60 p-4"
				>
					<h2
						class="text-lg font-semibold text-sky-950"
					>
						Данные Диадока
					</h2>
					<dl
						class="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2"
					>
						<div class="sm:col-span-2">
							<dt
								class="text-xs uppercase tracking-wide text-sky-700"
							>
								Поставщик
							</dt>
							<dd
								class="mt-1 font-semibold"
							>
								{{
									document.sender_name ||
									"—"
								}}
							</dd>
						</div>
						<div>
							<dt
								class="text-xs uppercase tracking-wide text-sky-700"
							>
								ИНН / КПП
							</dt>
							<dd class="mt-1">
								{{
									document.sender_inn ||
									"—"
								}}
								/
								{{
									document.sender_kpp ||
									"—"
								}}
							</dd>
						</div>
						<div>
							<dt
								class="text-xs uppercase tracking-wide text-sky-700"
							>
								Номер и дата
							</dt>
							<dd class="mt-1">
								№{{
									document.document_number ||
									"—"
								}}
								от
								{{
									formatDate(
										document.document_date,
									)
								}}
							</dd>
						</div>
						<div>
							<dt
								class="text-xs uppercase tracking-wide text-sky-700"
							>
								Функция
								документа
							</dt>
							<dd class="mt-1">
								{{
									document.document_function ||
									"—"
								}}
							</dd>
						</div>
						<div>
							<dt
								class="text-xs uppercase tracking-wide text-sky-700"
							>
								Message / Entity
							</dt>
							<dd
								class="mt-1 truncate font-mono text-xs"
								:title="`${document.message_id} / ${document.entity_id}`"
							>
								{{
									document.message_id
								}}
								/
								{{
									document.entity_id
								}}
							</dd>
						</div>
					</dl>
				</section>

				<section
					class="rounded-xl border border-amber-200 bg-amber-50/60 p-4"
				>
					<h2
						class="text-lg font-semibold text-amber-950"
					>
						Поступление материалов
					</h2>
					<div
						class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
					>
						<label
							class="space-y-1 md:col-span-2"
						>
							<span
								class="text-sm font-medium"
								>Поставщик</span
							>
							<div
								class="flex items-start gap-2"
							>
								<ReferenceKeyInput
									:modelValue="
										document.supplier_id
									"
									:projectedValue="
										document.supplier
									"
									:reference="
										supplierReference
									"
									:disabled="
										document.status ===
										'imported'
									"
									class="min-w-0 flex-1"
									required
									@update:modelValue="
										setSupplier
									"
								/>
								<Button
									v-if="
										document.supplier_id <=
										0
									"
									icon="pi pi-plus"
									severity="secondary"
									outlined
									:disabled="
										document.status ===
											'imported' ||
										document.status ===
											'ignored'
									"
									title="Создать поставщика из данных Диадока"
									aria-label="Создать поставщика из данных Диадока"
									@click="
										openSupplierCreate
									"
								/>
							</div>
							<label
								class="flex items-center gap-2 text-xs text-slate-600"
							>
								<Checkbox
									v-model="
										rememberSupplierMatch
									"
									binary
									@change="
										markDirty
									"
								/>
								Запомнить
								сопоставление
								поставщика
							</label>
						</label>
						<label
							class="space-y-1 md:col-span-2"
						>
							<span
								class="text-sm font-medium"
								>Объект
								строительства</span
							>
							<ReferenceKeyInput
								:modelValue="
									document.construction_site_id
								"
								:projectedValue="
									document.construction_site
								"
								:reference="
									constructionSiteReference
								"
								:disabled="
									document.status ===
									'imported'
								"
								@update:modelValue="
									setConstructionSite
								"
							/>
						</label>
						<label class="space-y-1">
							<span
								class="text-sm font-medium"
								>Номер</span
							>
							<InputText
								:modelValue="
									document.receipt_number
								"
								:disabled="
									document.status ===
									'imported'
								"
								fluid
								@update:modelValue="
									setReceiptNumber
								"
							/>
						</label>
						<label class="space-y-1">
							<span
								class="text-sm font-medium"
								>Дата</span
							>
							<DatePicker
								:modelValue="
									document.receipt_date
								"
								:disabled="
									document.status ===
									'imported'
								"
								showTime
								showSeconds
								fluid
								@update:modelValue="
									setReceiptDate
								"
							/>
						</label>
						<label
							class="space-y-1 md:col-span-2"
						>
							<span
								class="text-sm font-medium"
								>Комментарий</span
							>
							<Textarea
								:modelValue="
									document.receipt_comment
								"
								:disabled="
									document.status ===
									'imported'
								"
								rows="2"
								fluid
								@update:modelValue="
									setReceiptComment
								"
							/>
						</label>
					</div>
				</section>
			</div>

			<div
				v-if="
					displayedMissing.length ||
					document.readiness.warnings.length
				"
				class="space-y-3"
			>
				<Message
					v-if="displayedMissing.length"
					severity="warn"
					:closable="false"
				>
					<div class="font-semibold">
						Для импорта необходимо:
					</div>
					<ul class="mt-1 list-disc pl-5 text-sm">
						<li
							v-for="(
								issue, index
							) in displayedMissing"
							:key="`${issue.code}:${issue.item_id ?? index}`"
						>
							{{
								readinessLabels[
									issue
										.code
								] ?? issue.code
							}}<span
								v-if="
									issue.item_id
								"
							>
								(строка
								{{
									document.items.find(
										(
											item,
										) =>
											item.id ===
											issue.item_id,
									)
										?.line_num ??
									issue.item_id
								}})</span
							>
						</li>
					</ul>
				</Message>
				<Message
					v-if="
						document.readiness.warnings
							.length
					"
					severity="info"
					:closable="false"
				>
					<ul class="list-disc pl-5 text-sm">
						<li
							v-for="warning in document
								.readiness
								.warnings"
							:key="warning"
						>
							{{
								warningLabels[
									warning
								] ?? warning
							}}
						</li>
					</ul>
				</Message>
			</div>

			<section class="space-y-3">
				<div
					class="flex flex-wrap items-end justify-between gap-3"
				>
					<div>
						<h2
							class="text-lg font-semibold"
						>
							Материалы
						</h2>
						<p
							class="text-sm text-slate-500"
						>
							Количество
							пересчитывается по
							коэффициенту. Цена
							меняется соответственно,
							суммы и НДС остаются
							исходными. Сопоставления
							материалов сохраняются
							автоматически.
						</p>
					</div>
					<div class="flex gap-3 text-xs">
						<span
							class="rounded-md bg-sky-100 px-2 py-1 text-sky-900"
							>Данные Диадока</span
						>
						<span
							class="rounded-md bg-amber-100 px-2 py-1 text-amber-900"
							>Данные
							поступления</span
						>
					</div>
				</div>

				<DataTable
					:value="document.items"
					dataKey="id"
					:rowClass="rowClass"
					scrollable
					scrollHeight="58vh"
					showGridlines
					stripedRows
					size="small"
					class="diadoc-items-table"
				>
					<ColumnGroup type="header">
						<Row>
							<Column
								header="Импорт"
								:rowspan="2"
								frozen
							/>
							<Column
								header="Данные Диадока"
								:colspan="8"
								headerClass="diadoc-source-header"
							/>
							<Column
								header="Поступление материалов"
								:colspan="10"
								headerClass="diadoc-target-header"
							/>
						</Row>
						<Row>
							<Column
								header="№"
								headerClass="diadoc-source-header"
							/>
							<Column
								header="Материал / код / ед."
								headerClass="diadoc-source-header"
							/>
							<Column
								header="Кол-во"
								headerClass="diadoc-source-header"
							/>
							<Column
								header="Цена"
								headerClass="diadoc-source-header"
							/>
							<Column
								header="Без НДС"
								headerClass="diadoc-source-header"
							/>
							<Column
								header="НДС %"
								headerClass="diadoc-source-header"
							/>
							<Column
								header="НДС"
								headerClass="diadoc-source-header"
							/>
							<Column
								header="Всего"
								headerClass="diadoc-source-header"
							/>
							<Column
								header="Объект"
								headerClass="diadoc-target-header"
							/>
							<Column
								header="Материал"
								headerClass="diadoc-target-header"
							/>
							<Column
								header="Ед."
								headerClass="diadoc-target-header"
							/>
							<Column
								header="Коэфф."
								headerClass="diadoc-target-header"
							/>
							<Column
								header="Кол-во"
								headerClass="diadoc-target-header"
							/>
							<Column
								header="Цена"
								headerClass="diadoc-target-header"
							/>
							<Column
								header="Без НДС"
								headerClass="diadoc-target-header"
							/>
							<Column
								header="НДС %"
								headerClass="diadoc-target-header"
							/>
							<Column
								header="НДС"
								headerClass="diadoc-target-header"
							/>
							<Column
								header="Всего"
								headerClass="diadoc-target-header"
							/>
						</Row>
					</ColumnGroup>

					<Column
						frozen
						bodyClass="diadoc-command-column"
						style="
							width: 4.5rem;
							min-width: 4.5rem;
						"
					>
						<template
							#body="{ data: item }"
						>
							<Button
								:icon="
									item.is_excluded
										? 'pi pi-undo'
										: 'pi pi-ban'
								"
								:severity="
									item.is_excluded
										? 'secondary'
										: 'danger'
								"
								text
								rounded
								:loading="
									itemActionID ===
									item.id
								"
								:disabled="
									document.status ===
										'imported' ||
									document.status ===
										'ignored'
								"
								:title="
									item.is_excluded
										? 'Вернуть строку в импорт'
										: 'Исключить строку из импорта'
								"
								@click="
									toggleItem(
										item,
									)
								"
							/>
						</template>
					</Column>
					<Column
						field="line_num"
						bodyClass="diadoc-source-column"
						style="width: 4rem"
					/>
					<Column
						bodyClass="diadoc-source-column"
						style="
							width: 14rem;
							min-width: 14rem;
						"
					>
						<template
							#body="{ data: item }"
						>
							<div
								class="font-medium"
							>
								{{
									item.source_name
								}}
							</div>
							<div
								class="mt-1 text-xs text-slate-600"
							>
								Код:
								{{
									item.source_product_code ||
									item.source_article ||
									item.source_gtin ||
									"—"
								}}
							</div>
							<div
								class="text-xs text-slate-600"
							>
								Ед.:
								{{
									item.source_unit_name ||
									item.source_okei_code ||
									"—"
								}}
								<span
									v-if="
										item.source_okei_code
									"
								>
									(ОКЕИ
									{{
										item.source_okei_code
									}})
								</span>
							</div>
						</template>
					</Column>
					<Column
						bodyClass="diadoc-source-column diadoc-number-column"
						style="
							width: 3.75rem;
							min-width: 3.75rem;
						"
						><template
							#body="{ data: item }"
							>{{
								quantity(
									item.source_quant,
								)
							}}</template
						></Column
					>
					<Column
						bodyClass="diadoc-source-column diadoc-number-column"
						style="
							width: 5.25rem;
							min-width: 5.25rem;
						"
						><template
							#body="{ data: item }"
							>{{
								price(
									item.source_price,
								)
							}}</template
						></Column
					>
					<Column
						bodyClass="diadoc-source-column diadoc-number-column"
						style="
							width: 6.5rem;
							min-width: 6.5rem;
						"
						><template
							#body="{ data: item }"
							>{{
								money(
									item.source_amount_without_vat,
								)
							}}</template
						></Column
					>
					<Column
						bodyClass="diadoc-source-column diadoc-number-column"
						style="
							width: 3.25rem;
							min-width: 3.25rem;
						"
						><template
							#body="{ data: item }"
							>{{
								numberValue(
									item.source_vat_percent,
								)
							}}%</template
						></Column
					>
					<Column
						bodyClass="diadoc-source-column diadoc-number-column"
						style="
							width: 6.5rem;
							min-width: 6.5rem;
						"
						><template
							#body="{ data: item }"
							>{{
								money(
									item.source_vat_amount,
								)
							}}</template
						></Column
					>
					<Column
						bodyClass="diadoc-source-column diadoc-number-column"
						style="
							width: 6.5rem;
							min-width: 6.5rem;
						"
						><template
							#body="{ data: item }"
							>{{
								money(
									item.source_amount_with_vat,
								)
							}}</template
						></Column
					>

					<Column
						bodyClass="diadoc-target-column"
						style="
							width: 14rem;
							min-width: 14rem;
						"
					>
						<template
							#body="{ data: item }"
						>
							<ReferenceKeyInput
								:modelValue="
									item.construction_site_id ??
									null
								"
								:projectedValue="
									item.construction_site
								"
								:reference="
									constructionSiteReference
								"
								:required="
									!item.is_excluded &&
									document.construction_site_id <=
										0
								"
								:disabled="
									item.is_excluded ||
									[
										'imported',
										'ignored',
										'revoked',
										'superseded',
									].includes(
										document.status,
									)
								"
								aria-label="Объект"
								@update:modelValue="
									(
										value,
									) =>
										setItemConstructionSite(
											item,
											value,
										)
								"
							/>
						</template>
					</Column>
					<Column
						bodyClass="diadoc-target-column"
						style="
							width: 16rem;
							min-width: 16rem;
						"
					>
						<template
							#body="{ data: item }"
						>
							<div
								class="flex items-start gap-1"
							>
								<ReferenceKeyInput
									:modelValue="
										item.material_id
									"
									:projectedValue="
										item.material
									"
									:reference="
										materialReference
									"
									:disabled="
										item.is_excluded ||
										document.status ===
											'imported'
									"
									class="min-w-0 flex-1"
									@update:modelValue="
										(
											value,
										) =>
											setMaterial(
												item,
												value,
											)
									"
								/>
								<Button
									v-if="
										item.material_id <=
										0
									"
									icon="pi pi-plus"
									severity="secondary"
									text
									rounded
									:disabled="
										item.is_excluded ||
										document.status ===
											'imported' ||
										document.status ===
											'ignored'
									"
									title="Создать материал из данных Диадока"
									aria-label="Создать материал из данных Диадока"
									@click="
										openMaterialCreate(
											item,
										)
									"
								/>
							</div>
							<div
								v-if="
									displayedItemIssues(
										item,
									).length
								"
								class="mt-1 text-xs text-red-600"
							>
								{{
									displayedItemIssues(
										item,
									)
										.map(
											(
												issue: string,
											) =>
												readinessLabels[
													issue
												] ??
												issue,
										)
										.join(
											"; ",
										)
								}}
							</div>
						</template>
					</Column>
					<Column
						bodyClass="diadoc-target-column"
						style="
							width: 3.25rem;
							min-width: 3.25rem;
						"
					>
						<template
							#body="{ data: item }"
						>
							<span>{{
								item
									.measure_unit
									?.descr ||
								"—"
							}}</span>
						</template>
					</Column>
					<Column
						bodyClass="diadoc-target-column"
						style="
							width: 4rem;
							min-width: 4rem;
						"
					>
						<template
							#body="{ data: item }"
						>
							<InputNumber
								:modelValue="
									item.conversion_factor
								"
								:min="0"
								:minFractionDigits="
									0
								"
								:maxFractionDigits="
									8
								"
								:useGrouping="
									false
								"
								:disabled="
									item.is_excluded ||
									document.status ===
										'imported'
								"
								fluid
								@update:modelValue="
									(
										value,
									) =>
										setFactor(
											item,
											value,
										)
								"
							/>
						</template>
					</Column>
					<Column
						bodyClass="diadoc-target-column diadoc-number-column"
						style="
							width: 3.75rem;
							min-width: 3.75rem;
						"
						><template
							#body="{ data: item }"
							>{{
								quantity(
									targetQuantity(
										item,
									),
								)
							}}</template
						></Column
					>
					<Column
						bodyClass="diadoc-target-column diadoc-number-column"
						style="
							width: 5.25rem;
							min-width: 5.25rem;
						"
						><template
							#body="{ data: item }"
							>{{
								price(
									targetPrice(
										item,
									),
								)
							}}</template
						></Column
					>
					<Column
						bodyClass="diadoc-target-column diadoc-number-column"
						style="
							width: 6.5rem;
							min-width: 6.5rem;
						"
						><template
							#body="{ data: item }"
							>{{
								money(
									item.source_amount_without_vat,
								)
							}}</template
						></Column
					>
					<Column
						bodyClass="diadoc-target-column diadoc-number-column"
						style="
							width: 4rem;
							min-width: 4rem;
						"
						><template
							#body="{ data: item }"
							>{{
								numberValue(
									item.source_vat_percent,
								)
							}}%</template
						></Column
					>
					<Column
						bodyClass="diadoc-target-column diadoc-number-column"
						style="
							width: 6.5rem;
							min-width: 6.5rem;
						"
						><template
							#body="{ data: item }"
							>{{
								money(
									item.source_vat_amount,
								)
							}}</template
						></Column
					>
					<Column
						bodyClass="diadoc-target-column diadoc-number-column"
						style="
							width: 6.5rem;
							min-width: 6.5rem;
						"
						><template
							#body="{ data: item }"
							>{{
								money(
									item.source_amount_with_vat,
								)
							}}</template
						></Column
					>
				</DataTable>
			</section>

			<DiadocTotalsCards :totals="document.totals" />
		</div>
		<Message v-else-if="error" severity="error" :closable="false">
			{{ error }}
		</Message>
	</CollectionEditPage>
</template>

<style scoped>
:deep(.diadoc-source-header) {
	background: rgb(224 242 254) !important;
	color: rgb(12 74 110) !important;
}

:deep(.diadoc-target-header) {
	background: rgb(254 243 199) !important;
	color: rgb(120 53 15) !important;
}

:deep(.diadoc-source-column) {
	background: rgb(240 249 255 / 0.7);
}

:deep(.diadoc-target-column) {
	background: rgb(255 251 235 / 0.75);
}

:deep(.diadoc-number-column) {
	text-align: right;
	font-variant-numeric: tabular-nums;
}

:deep(.diadoc-row-excluded > td) {
	background: rgb(241 245 249) !important;
	color: rgb(100 116 139) !important;
	text-decoration: line-through;
	opacity: 0.72;
}

:deep(.diadoc-row-excluded input),
:deep(.diadoc-row-excluded button) {
	text-decoration: none;
}

:deep(.diadoc-command-column) {
	text-align: center;
}
</style>
