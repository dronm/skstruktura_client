<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import ConfirmDialog from "primevue/confirmdialog";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import ProgressSpinner from "primevue/progressspinner";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import { useConfirm } from "primevue/useconfirm";

import { errorText, FilterOperatorParam } from "@katren/vue-collection-lib";

import { orderImportanceApi } from "@/api/orderImportance.gen";
import { supplierApi } from "@/api/supplier.gen";
import { supplyManagerWorkspaceApi } from "@/api/supplyManagerWorkspace";
import DocumentDateTimePicker from "@/components/documents/DocumentDateTimePicker.vue";
import DocumentPrintButton from "@/components/documents/DocumentPrintButton.vue";
import { useAuthStore } from "@/stores/useAuthStore";
import type { MaterialBalanceConstructionSite } from "@/types/materialBalance";
import type { OrderImportance } from "@/types/orderImportance.gen";
import type { Supplier } from "@/types/supplier.gen";
import type {
	MaterialRequestSupplierAssignmentCreate,
	SupplyManagerIncomingRequest,
	SupplyManagerIncomingRequestItem,
} from "@/types/supplyManagerWorkspace";

interface RequestLine {
	request: SupplyManagerIncomingRequest;
	item: SupplyManagerIncomingRequestItem;
}

interface SupplierSummaryBreakdown {
	requestID: number;
	siteID: number;
	siteName: string;
	quantity: number;
	lineCount: number;
}

interface SupplierMaterialSummary {
	key: string;
	materialName: string;
	measureUnitName: string;
	quantity: number;
	lineCount: number;
	siteCount: number;
	breakdown: SupplierSummaryBreakdown[];
}

interface SupplierSummaryGroup {
	supplier: Supplier;
	materials: SupplierMaterialSummary[];
	lineCount: number;
}

interface IncomingFilterSnapshot {
	constructionSiteID: number | null;
	dateFrom: Date | null;
	dateTo: Date | null;
	materialSearch: string;
	orderImportanceID: number | null;
}

const PAGE_SIZE = 50;
const REFERENCE_PAGE_SIZE = 500;
const RECENT_SUPPLIER_LIMIT = 5;
const CONFIRM_GROUP = "supply-manager-assignment";

const emit = defineEmits<{
	submitted: [assignmentID: number];
	"draft-change": [active: boolean];
}>();

const constructionSiteID = defineModel<number | null>("constructionSiteID", {
	default: null,
});

const { t } = useI18n();
const confirm = useConfirm();
const authStore = useAuthStore();

const recentSupplierStorageKey = (): string | null => {
	const userID = authStore.user?.id ?? 0;
	return userID > 0 ? `supply-manager-recent-suppliers:${userID}` : null;
};

const readRecentSupplierIDs = (): number[] => {
	const key = recentSupplierStorageKey();
	if (key === null) {
		return [];
	}
	try {
		const value: unknown = JSON.parse(
			localStorage.getItem(key) ?? "[]",
		);
		if (!Array.isArray(value)) {
			return [];
		}
		return value
			.filter(
				(item): item is number =>
					typeof item === "number" &&
					Number.isInteger(item) &&
					item > 0,
			)
			.slice(0, RECENT_SUPPLIER_LIMIT);
	} catch {
		return [];
	}
};

const sites = ref<MaterialBalanceConstructionSite[]>([]);
const suppliers = ref<Supplier[]>([]);
const importances = ref<OrderImportance[]>([]);
const requests = ref<SupplyManagerIncomingRequest[]>([]);
const supplierByItemID = ref<Record<number, number | null>>({});
const selectedItemIDs = ref<number[]>([]);
const activeSupplierID = ref<number | null>(null);
const recentSupplierIDs = ref<number[]>(readRecentSupplierIDs());
const dateFrom = ref<Date | null>(null);
const dateTo = ref<Date | null>(null);
const materialSearch = ref("");
const orderImportanceID = ref<number | null>(null);
const assignmentDate = ref<Date | undefined>(new Date());
const assignmentComment = ref("");
const total = ref(0);
const loading = ref(false);
const loadingMore = ref(false);
const referenceLoading = ref(false);
const submitting = ref(false);
const error = ref("");
const referenceError = ref("");
const filterError = ref("");
const successAssignmentID = ref<number | null>(null);
const loadedOffset = ref(0);
const appliedFilters = ref<IncomingFilterSnapshot>({
	constructionSiteID: null,
	dateFrom: null,
	dateTo: null,
	materialSearch: "",
	orderImportanceID: null,
});
let loadSequence = 0;
let ignoreNextSiteChange = false;

const allLines = computed<RequestLine[]>(() => {
	return requests.value.flatMap((request) =>
		request.items.map((item) => ({ request, item })),
	);
});

const selectedItemIDSet = computed(() => {
	return new Set(selectedItemIDs.value);
});

const supplierMap = computed(() => {
	return new Map(
		suppliers.value.map((supplier) => [supplier.id, supplier]),
	);
});

const supplierOptions = computed<Supplier[]>(() => {
	const recentOrder = new Map(
		recentSupplierIDs.value.map((supplierID, index) => [
			supplierID,
			index,
		]),
	);
	return [...suppliers.value].sort((left, right) => {
		const leftOrder = recentOrder.get(left.id);
		const rightOrder = recentOrder.get(right.id);
		if (leftOrder !== undefined || rightOrder !== undefined) {
			if (leftOrder === undefined) {
				return 1;
			}
			if (rightOrder === undefined) {
				return -1;
			}
			return leftOrder - rightOrder;
		}
		return left.name.localeCompare(right.name, "ru");
	});
});

const supplierIDForItem = (itemID: number): number | null => {
	return supplierByItemID.value[itemID] ?? null;
};

const touchedRequests = computed<SupplyManagerIncomingRequest[]>(() => {
	return requests.value.filter((request) =>
		request.items.some(
			(item) => supplierIDForItem(item.id) !== null,
		),
	);
});

const incompleteRequests = computed<SupplyManagerIncomingRequest[]>(() => {
	return touchedRequests.value.filter((request) =>
		request.items.some(
			(item) => supplierIDForItem(item.id) === null,
		),
	);
});

const unassignedLineCount = computed(() => {
	return touchedRequests.value.reduce(
		(count, request) =>
			count +
			request.items.filter(
				(item) => supplierIDForItem(item.id) === null,
			).length,
		0,
	);
});

const assignedLines = computed<RequestLine[]>(() => {
	return touchedRequests.value.flatMap((request) =>
		request.items.flatMap((item) =>
			supplierIDForItem(item.id) === null
				? []
				: [{ request, item }],
		),
	);
});

const summaryGroups = computed<SupplierSummaryGroup[]>(() => {
	const supplierLines = new Map<
		number,
		{ supplier: Supplier; lines: RequestLine[] }
	>();
	for (const line of assignedLines.value) {
		const supplierID = supplierIDForItem(line.item.id);
		if (supplierID === null) {
			continue;
		}
		const supplier = supplierMap.value.get(supplierID);
		if (supplier === undefined) {
			continue;
		}
		let group = supplierLines.get(supplierID);
		if (group === undefined) {
			group = { supplier, lines: [] };
			supplierLines.set(supplierID, group);
		}
		group.lines.push(line);
	}

	return Array.from(supplierLines.values())
		.map((supplierGroup): SupplierSummaryGroup => {
			const materialLines = new Map<string, RequestLine[]>();
			for (const line of supplierGroup.lines) {
				const key = `${line.item.material_id}:${line.item.measure_unit_id}`;
				const lines = materialLines.get(key) ?? [];
				lines.push(line);
				materialLines.set(key, lines);
			}

			const materials = Array.from(materialLines.entries())
				.map(
					([
						key,
						lines,
					]): SupplierMaterialSummary | null => {
						const first = lines[0];
						if (first === undefined) {
							return null;
						}
						const breakdownMap = new Map<
							string,
							SupplierSummaryBreakdown
						>();
						for (const line of lines) {
							const breakdownKey = `${line.request.id}:${line.request.construction_site_id}`;
							let breakdown =
								breakdownMap.get(
									breakdownKey,
								);
							if (
								breakdown ===
								undefined
							) {
								breakdown = {
									requestID: line
										.request
										.id,
									siteID: line
										.request
										.construction_site_id,
									siteName: line
										.request
										.construction_site
										.descr,
									quantity: 0,
									lineCount: 0,
								};
								breakdownMap.set(
									breakdownKey,
									breakdown,
								);
							}
							breakdown.quantity +=
								line.item.quant;
							breakdown.lineCount += 1;
						}

						return {
							key,
							materialName:
								first.item
									.material
									.descr,
							measureUnitName:
								first.item
									.measure_unit
									.descr,
							quantity: lines.reduce(
								(sum, line) =>
									sum +
									line
										.item
										.quant,
								0,
							),
							lineCount: lines.length,
							siteCount: new Set(
								lines.map(
									(
										line,
									) =>
										line
											.request
											.construction_site_id,
								),
							).size,
							breakdown: Array.from(
								breakdownMap.values(),
							),
						};
					},
				)
				.filter(
					(
						material,
					): material is SupplierMaterialSummary =>
						material !== null,
				)
				.sort((left, right) =>
					left.materialName.localeCompare(
						right.materialName,
						"ru",
					),
				);

			return {
				supplier: supplierGroup.supplier,
				materials,
				lineCount: supplierGroup.lines.length,
			};
		})
		.sort((left, right) =>
			left.supplier.name.localeCompare(
				right.supplier.name,
				"ru",
			),
		);
});

const hasDraft = computed(() => touchedRequests.value.length > 0);
const hasMore = computed(() => loadedOffset.value < total.value);
const filtersDirty = computed(() => {
	const applied = appliedFilters.value;
	return (
		constructionSiteID.value !== applied.constructionSiteID ||
		(dateFrom.value?.getTime() ?? null) !==
			(applied.dateFrom?.getTime() ?? null) ||
		(dateTo.value?.getTime() ?? null) !==
			(applied.dateTo?.getTime() ?? null) ||
		materialSearch.value.trim() !== applied.materialSearch ||
		orderImportanceID.value !== applied.orderImportanceID
	);
});
const canSubmit = computed(() => {
	return (
		!submitting.value &&
		!loading.value &&
		!loadingMore.value &&
		assignmentDate.value instanceof Date &&
		!Number.isNaN(assignmentDate.value.getTime()) &&
		touchedRequests.value.length > 0 &&
		incompleteRequests.value.length === 0 &&
		assignedLines.value.every(
			(line) => supplierIDForItem(line.item.id) !== null,
		)
	);
});

const numberFormatter = new Intl.NumberFormat("ru-RU", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 4,
});

const formatNumber = (value: number): string => {
	return numberFormatter.format(value);
};

const formatDateTime = (value: Date): string => {
	return value.toLocaleString("ru-RU");
};

const formatDate = (value: Date | null): string => {
	return value?.toLocaleDateString("ru-RU") ?? "—";
};

const rememberRecentSuppliers = (supplierIDs: number[]): void => {
	const next = Array.from(
		new Set([...supplierIDs, ...recentSupplierIDs.value]),
	).slice(0, RECENT_SUPPLIER_LIMIT);
	recentSupplierIDs.value = next;
	const key = recentSupplierStorageKey();
	if (key === null) {
		return;
	}
	try {
		localStorage.setItem(key, JSON.stringify(next));
	} catch {
		// Recent suggestions are optional and must not block submission.
	}
};

const setSupplier = (itemID: number, supplierID: number | null): void => {
	const normalized =
		typeof supplierID === "number" &&
		supplierMap.value.has(supplierID)
			? supplierID
			: null;
	const current = supplierIDForItem(itemID);
	const apply = (): void => {
		supplierByItemID.value[itemID] = normalized;
		if (normalized !== null) {
			activeSupplierID.value = normalized;
		}
		error.value = "";
		successAssignmentID.value = null;
	};
	if (current !== null && normalized !== null && current !== normalized) {
		confirm.require({
			group: CONFIRM_GROUP,
			header: t(
				"SupplyManagerWorkspace.assignment.overwriteTitle",
			),
			message: t(
				"SupplyManagerWorkspace.assignment.overwriteLine",
			),
			icon: "pi pi-exclamation-triangle",
			acceptLabel: t(
				"SupplyManagerWorkspace.assignment.overwrite",
			),
			rejectLabel: t("Grid.commands.cancel"),
			accept: apply,
		});
		return;
	}
	apply();
};

const isItemSelected = (itemID: number): boolean => {
	return selectedItemIDSet.value.has(itemID);
};

const setItemSelected = (itemID: number, selected: boolean): void => {
	const next = new Set(selectedItemIDs.value);
	if (selected) {
		next.add(itemID);
	} else {
		next.delete(itemID);
	}
	selectedItemIDs.value = Array.from(next);
};

const isRequestSelected = (request: SupplyManagerIncomingRequest): boolean => {
	return (
		request.items.length > 0 &&
		request.items.every((item) => isItemSelected(item.id))
	);
};

const setRequestSelected = (
	request: SupplyManagerIncomingRequest,
	selected: boolean,
): void => {
	const next = new Set(selectedItemIDs.value);
	for (const item of request.items) {
		if (selected) {
			next.add(item.id);
		} else {
			next.delete(item.id);
		}
	}
	selectedItemIDs.value = Array.from(next);
};

const applyActiveSupplier = (
	targets: SupplyManagerIncomingRequestItem[],
	messageKey: string,
): void => {
	const supplierID = activeSupplierID.value;
	if (supplierID === null || !supplierMap.value.has(supplierID)) {
		error.value = t(
			"SupplyManagerWorkspace.assignment.selectSupplier",
		);
		return;
	}
	if (targets.length === 0) {
		error.value = t(
			"SupplyManagerWorkspace.assignment.selectLines",
		);
		return;
	}

	const apply = (): void => {
		for (const item of targets) {
			supplierByItemID.value[item.id] = supplierID;
		}
		error.value = "";
		successAssignmentID.value = null;
	};
	const overwriteCount = targets.filter((item) => {
		const current = supplierIDForItem(item.id);
		return current !== null && current !== supplierID;
	}).length;

	if (overwriteCount === 0) {
		apply();
		return;
	}

	confirm.require({
		group: CONFIRM_GROUP,
		header: t("SupplyManagerWorkspace.assignment.overwriteTitle"),
		message: t(messageKey, { count: overwriteCount }),
		icon: "pi pi-exclamation-triangle",
		acceptLabel: t("SupplyManagerWorkspace.assignment.overwrite"),
		rejectLabel: t("Grid.commands.cancel"),
		accept: apply,
	});
};

const applyToSelected = (): void => {
	applyActiveSupplier(
		allLines.value
			.filter((line) => isItemSelected(line.item.id))
			.map((line) => line.item),
		"SupplyManagerWorkspace.assignment.overwriteSelected",
	);
};

const applyToLine = (item: SupplyManagerIncomingRequestItem): void => {
	applyActiveSupplier(
		[item],
		"SupplyManagerWorkspace.assignment.overwriteLine",
	);
};

const applyToRequest = (request: SupplyManagerIncomingRequest): void => {
	applyActiveSupplier(
		request.items,
		"SupplyManagerWorkspace.assignment.overwriteRequest",
	);
};

const applyToSameMaterial = (item: SupplyManagerIncomingRequestItem): void => {
	applyActiveSupplier(
		allLines.value
			.filter(
				(line) =>
					line.item.material_id ===
					item.material_id,
			)
			.map((line) => line.item),
		"SupplyManagerWorkspace.assignment.overwriteMaterial",
	);
};

const clearDraft = (): void => {
	supplierByItemID.value = {};
	selectedItemIDs.value = [];
	assignmentComment.value = "";
	assignmentDate.value = new Date();
	error.value = "";
	successAssignmentID.value = null;
};

const requestClearDraft = (): void => {
	if (!hasDraft.value) {
		clearDraft();
		return;
	}
	confirm.require({
		group: CONFIRM_GROUP,
		header: t("SupplyManagerWorkspace.assignment.clearTitle"),
		message: t("SupplyManagerWorkspace.assignment.clearMessage"),
		icon: "pi pi-trash",
		acceptLabel: t("Grid.commands.clear"),
		rejectLabel: t("Grid.commands.cancel"),
		accept: clearDraft,
	});
};

const filtersAreValid = (): boolean => {
	if (
		[dateFrom.value, dateTo.value].some(
			(value) =>
				value !== null && Number.isNaN(value.getTime()),
		)
	) {
		filterError.value = t(
			"SupplyManagerWorkspace.filters.invalidDate",
		);
		return false;
	}
	if (
		dateFrom.value !== null &&
		dateTo.value !== null &&
		dateFrom.value.getTime() > dateTo.value.getTime()
	) {
		filterError.value = t(
			"SupplyManagerWorkspace.filters.invalidPeriod",
		);
		return false;
	}
	filterError.value = "";
	return true;
};

const currentFilterSnapshot = (): IncomingFilterSnapshot => ({
	constructionSiteID: constructionSiteID.value,
	dateFrom: dateFrom.value === null ? null : new Date(dateFrom.value),
	dateTo: dateTo.value === null ? null : new Date(dateTo.value),
	materialSearch: materialSearch.value.trim(),
	orderImportanceID: orderImportanceID.value,
});

const seedServerSuppliers = (
	loadedRequests: SupplyManagerIncomingRequest[],
	reset: boolean,
): void => {
	const next: Record<number, number | null> = reset
		? {}
		: { ...supplierByItemID.value };
	for (const request of loadedRequests) {
		for (const item of request.items) {
			if (
				!Object.prototype.hasOwnProperty.call(
					next,
					item.id,
				) &&
				item.supplier_id !== null &&
				supplierMap.value.has(item.supplier_id)
			) {
				next[item.id] = item.supplier_id;
			}
		}
	}
	supplierByItemID.value = next;
};

const loadIncoming = async (reset: boolean): Promise<boolean> => {
	if (
		!reset &&
		(loading.value || loadingMore.value || filtersDirty.value)
	) {
		return false;
	}
	if (reset && !filtersAreValid()) {
		return false;
	}
	const filterSnapshot = reset
		? currentFilterSnapshot()
		: appliedFilters.value;
	const sequence = ++loadSequence;
	if (reset) {
		loading.value = true;
		loadingMore.value = false;
		requests.value = [];
		selectedItemIDs.value = [];
		supplierByItemID.value = {};
		loadedOffset.value = 0;
		total.value = 0;
	} else {
		loadingMore.value = true;
	}
	error.value = "";
	try {
		const response =
			await supplyManagerWorkspaceApi.incomingRequests({
				constructionSiteID:
					filterSnapshot.constructionSiteID,
				dateFrom: filterSnapshot.dateFrom,
				dateTo: filterSnapshot.dateTo,
				materialSearch: filterSnapshot.materialSearch,
				orderImportanceID:
					filterSnapshot.orderImportanceID,
				from: reset ? 0 : loadedOffset.value,
				count: PAGE_SIZE,
			});
		if (sequence !== loadSequence) {
			return false;
		}
		if (reset) {
			appliedFilters.value = filterSnapshot;
			requests.value = response.rows;
			loadedOffset.value = response.rows.length;
		} else {
			const existingIDs = new Set(
				requests.value.map((request) => request.id),
			);
			requests.value = [
				...requests.value,
				...response.rows.filter(
					(request) =>
						!existingIDs.has(request.id),
				),
			];
			loadedOffset.value += response.rows.length;
		}
		total.value = response.agg.tot_count;
		seedServerSuppliers(response.rows, reset);
		const visibleIDs = new Set(
			requests.value.flatMap((request) =>
				request.items.map((item) => item.id),
			),
		);
		selectedItemIDs.value = selectedItemIDs.value.filter((id) =>
			visibleIDs.has(id),
		);
		return true;
	} catch (caught: unknown) {
		if (sequence === loadSequence) {
			error.value = errorText(caught);
		}
		return false;
	} finally {
		if (sequence === loadSequence) {
			loading.value = false;
			loadingMore.value = false;
		}
	}
};

const resetFilters = (): void => {
	ignoreNextSiteChange = constructionSiteID.value !== null;
	constructionSiteID.value = null;
	dateFrom.value = null;
	dateTo.value = null;
	materialSearch.value = "";
	orderImportanceID.value = null;
	void loadIncoming(true);
};

const loadAllActiveSuppliers = async (): Promise<Supplier[]> => {
	const rows: Supplier[] = [];
	let total = 0;
	do {
		const response = await supplierApi.list({
			from: rows.length,
			count: REFERENCE_PAGE_SIZE,
			filter: [
				{
					f: {
						is_active: {
							o: FilterOperatorParam.E,
							v: true,
						},
					},
				},
			],
			sorter: [{ f: "name", d: "a" }],
		});
		rows.push(...response.rows);
		total = response.agg.tot_count;
		if (response.rows.length === 0) {
			break;
		}
	} while (rows.length < total);
	return rows;
};

const loadAllActiveImportances = async (): Promise<OrderImportance[]> => {
	const rows: OrderImportance[] = [];
	let total = 0;
	do {
		const response = await orderImportanceApi.list({
			from: rows.length,
			count: REFERENCE_PAGE_SIZE,
			filter: [
				{
					f: {
						is_active: {
							o: FilterOperatorParam.E,
							v: true,
						},
					},
				},
			],
			sorter: [
				{ f: "sort_order", d: "a" },
				{ f: "name", d: "a" },
			],
		});
		rows.push(...response.rows);
		total = response.agg.tot_count;
		if (response.rows.length === 0) {
			break;
		}
	} while (rows.length < total);
	return rows;
};

const loadReferences = async (): Promise<void> => {
	referenceLoading.value = true;
	referenceError.value = "";
	try {
		const [loadedSites, loadedSuppliers, loadedImportances] =
			await Promise.all([
				supplyManagerWorkspaceApi.constructionSites(),
				loadAllActiveSuppliers(),
				loadAllActiveImportances(),
			]);
		sites.value = loadedSites;
		suppliers.value = loadedSuppliers;
		importances.value = loadedImportances;
	} catch (caught: unknown) {
		referenceError.value = errorText(caught);
	} finally {
		referenceLoading.value = false;
	}
};

const createAssignmentModel =
	(): MaterialRequestSupplierAssignmentCreate | null => {
		const date = assignmentDate.value;
		if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
			return null;
		}

		return {
			date,
			comment: assignmentComment.value.trim() || null,
			requests: touchedRequests.value.map((request) => ({
				id: request.id,
				version: request.version,
			})),
			items: touchedRequests.value.flatMap((request) =>
				request.items.map((item) => ({
					material_request_item_id: item.id,
					supplier_id:
						supplierIDForItem(item.id) ?? 0,
				})),
			),
		};
	};

const submitAssignment = async (): Promise<void> => {
	if (!canSubmit.value) {
		return;
	}
	const model = createAssignmentModel();
	if (model === null) {
		error.value = t(
			"SupplyManagerWorkspace.assignment.dateRequired",
		);
		return;
	}

	submitting.value = true;
	error.value = "";
	successAssignmentID.value = null;
	try {
		const created =
			await supplyManagerWorkspaceApi.createAssignment(model);
		const submittedRequestIDs = new Set(
			model.requests.map((request) => request.id),
		);
		const previousCount = requests.value.length;
		requests.value = requests.value.filter(
			(request) => !submittedRequestIDs.has(request.id),
		);
		const removedCount = previousCount - requests.value.length;
		loadedOffset.value = Math.max(
			0,
			loadedOffset.value - removedCount,
		);
		total.value = Math.max(0, total.value - removedCount);
		rememberRecentSuppliers(
			model.items.map((item) => item.supplier_id),
		);
		successAssignmentID.value = created.id;
		emit("submitted", created.id);
		clearDraft();
		successAssignmentID.value = created.id;
		await loadIncoming(true);
	} catch (caught: unknown) {
		error.value = errorText(caught);
	} finally {
		submitting.value = false;
	}
};

const requestSubmit = (): void => {
	if (!canSubmit.value) {
		return;
	}
	confirm.require({
		group: CONFIRM_GROUP,
		header: t("SupplyManagerWorkspace.assignment.submitTitle"),
		message: t("SupplyManagerWorkspace.assignment.submitMessage", {
			requests: touchedRequests.value.length,
			lines: assignedLines.value.length,
		}),
		icon: "pi pi-send",
		acceptLabel: t("SupplyManagerWorkspace.assignment.submit"),
		rejectLabel: t("Grid.commands.cancel"),
		accept: () => {
			void submitAssignment();
		},
	});
};

onMounted(async () => {
	await loadReferences();
	await loadIncoming(true);
});

watch(hasDraft, (active) => {
	emit("draft-change", active);
});

watch(constructionSiteID, (value, previousValue) => {
	if (ignoreNextSiteChange) {
		ignoreNextSiteChange = false;
		return;
	}
	if (value !== previousValue && !hasDraft.value) {
		void loadIncoming(true);
	}
});
</script>

<template>
	<div class="space-y-4">
		<ConfirmDialog :group="CONFIRM_GROUP" />

		<div
			v-if="referenceError"
			class="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
			role="alert"
		>
			{{ referenceError }}
		</div>
		<div
			v-if="error"
			class="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
			role="alert"
		>
			{{ error }}
		</div>
		<div
			v-if="successAssignmentID !== null"
			class="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
			role="status"
		>
			{{
				t(
					"SupplyManagerWorkspace.assignment.submitted",
					{
						id: successAssignmentID,
					},
				)
			}}
		</div>

		<section
			class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
		>
			<div class="grid grid-cols-1 gap-3 lg:grid-cols-5">
				<label class="space-y-1">
					<span
						class="text-xs font-medium text-slate-600"
					>
						{{
							t(
								"SupplyManagerWorkspace.filters.site",
							)
						}}
					</span>
					<Select
						v-model="constructionSiteID"
						:options="sites"
						optionLabel="name"
						optionValue="id"
						:placeholder="
							t(
								'SupplyManagerWorkspace.filters.allSites',
							)
						"
						:disabled="
							hasDraft ||
							referenceLoading
						"
						showClear
						filter
						class="w-full"
					/>
				</label>
				<label class="space-y-1">
					<span
						class="text-xs font-medium text-slate-600"
					>
						{{
							t(
								"SupplyManagerWorkspace.filters.dateFrom",
							)
						}}
					</span>
					<DatePicker
						v-model="dateFrom"
						:disabled="hasDraft"
						dateFormat="dd.mm.yy"
						showIcon
						showClear
						fluid
					/>
				</label>
				<label class="space-y-1">
					<span
						class="text-xs font-medium text-slate-600"
					>
						{{
							t(
								"SupplyManagerWorkspace.filters.dateTo",
							)
						}}
					</span>
					<DatePicker
						v-model="dateTo"
						:disabled="hasDraft"
						dateFormat="dd.mm.yy"
						showIcon
						showClear
						fluid
					/>
				</label>
				<label class="space-y-1">
					<span
						class="text-xs font-medium text-slate-600"
					>
						{{
							t(
								"SupplyManagerWorkspace.filters.material",
							)
						}}
					</span>
					<InputText
						v-model="materialSearch"
						:disabled="hasDraft"
						class="w-full"
					/>
				</label>
				<label class="space-y-1">
					<span
						class="text-xs font-medium text-slate-600"
					>
						{{
							t(
								"SupplyManagerWorkspace.filters.importance",
							)
						}}
					</span>
					<Select
						v-model="orderImportanceID"
						:options="importances"
						optionLabel="name"
						optionValue="id"
						:placeholder="
							t(
								'SupplyManagerWorkspace.filters.allImportances',
							)
						"
						:disabled="
							hasDraft ||
							referenceLoading
						"
						showClear
						class="w-full"
					/>
				</label>
			</div>
			<div
				v-if="filterError"
				class="mt-2 text-sm text-red-600"
			>
				{{ filterError }}
			</div>
			<div class="mt-3 flex flex-wrap items-center gap-2">
				<Button
					:label="
						t(
							'SupplyManagerWorkspace.filters.apply',
						)
					"
					icon="pi pi-search"
					:disabled="
						hasDraft ||
						loading ||
						loadingMore
					"
					:loading="loading"
					@click="loadIncoming(true)"
				/>
				<Button
					:label="
						t(
							'SupplyManagerWorkspace.filters.clear',
						)
					"
					icon="pi pi-filter-slash"
					severity="secondary"
					outlined
					:disabled="
						hasDraft ||
						loading ||
						loadingMore
					"
					@click="resetFilters"
				/>
				<span
					v-if="hasDraft"
					class="text-xs text-amber-700"
				>
					{{
						t(
							"SupplyManagerWorkspace.filters.locked",
						)
					}}
				</span>
			</div>
		</section>

		<section
			class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
		>
			<div
				class="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)_auto]"
			>
				<label class="space-y-1">
					<span
						class="text-sm font-medium text-slate-700"
					>
						{{
							t(
								"SupplyManagerWorkspace.assignment.date",
							)
						}}
					</span>
					<DocumentDateTimePicker
						v-model="assignmentDate"
						inputId="supplyManagerAssignmentDate"
						required
						:disabled="submitting"
						class="w-full"
					/>
				</label>
				<label class="space-y-1">
					<span
						class="text-sm font-medium text-slate-700"
					>
						{{
							t(
								"SupplyManagerWorkspace.assignment.comment",
							)
						}}
					</span>
					<Textarea
						v-model="assignmentComment"
						rows="2"
						:disabled="submitting"
						class="w-full"
					/>
				</label>
				<div class="flex items-end">
					<Button
						:label="
							t(
								'SupplyManagerWorkspace.assignment.clearDraft',
							)
						"
						icon="pi pi-trash"
						severity="secondary"
						outlined
						:disabled="
							submitting ||
							(!hasDraft &&
								!assignmentComment)
						"
						@click="requestClearDraft"
					/>
				</div>
			</div>
		</section>

		<div
			class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]"
		>
			<div class="min-w-0 space-y-3">
				<section
					class="rounded-xl border border-cyan-200 bg-cyan-50/70 p-3 shadow-sm"
				>
					<div
						class="flex flex-wrap items-end gap-2"
					>
						<label
							class="min-w-64 flex-1 space-y-1"
						>
							<span
								class="text-sm font-semibold text-cyan-950"
							>
								{{
									t(
										"SupplyManagerWorkspace.assignment.activeSupplier",
									)
								}}
							</span>
							<Select
								v-model="
									activeSupplierID
								"
								:options="
									supplierOptions
								"
								optionLabel="name"
								optionValue="id"
								:placeholder="
									t(
										'SupplyManagerWorkspace.assignment.supplierPlaceholder',
									)
								"
								:disabled="
									referenceLoading ||
									submitting
								"
								filter
								class="w-full"
							/>
						</label>
						<Button
							:label="
								t(
									'SupplyManagerWorkspace.assignment.applySelected',
								)
							"
							icon="pi pi-check-square"
							:disabled="
								activeSupplierID ===
									null ||
								selectedItemIDs.length ===
									0 ||
								submitting
							"
							@click="applyToSelected"
						/>
						<span
							class="pb-2 text-xs text-cyan-800"
						>
							{{
								t(
									"SupplyManagerWorkspace.assignment.selectedCount",
									{
										count: selectedItemIDs.length,
									},
								)
							}}
						</span>
					</div>
				</section>

				<div
					v-if="loading"
					class="flex min-h-64 items-center justify-center rounded-xl border border-slate-200 bg-white"
				>
					<ProgressSpinner
						class="h-10 w-10"
						strokeWidth="4"
					/>
				</div>
				<div
					v-else-if="requests.length === 0"
					class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center text-slate-500"
				>
					{{
						t(
							"SupplyManagerWorkspace.incoming.empty",
						)
					}}
				</div>

				<article
					v-for="request in requests"
					:key="request.id"
					class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
				>
					<header
						class="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3"
					>
						<Checkbox
							:modelValue="
								isRequestSelected(
									request,
								)
							"
							binary
							:disabled="submitting"
							:aria-label="
								t(
									'SupplyManagerWorkspace.assignment.selectRequest',
									{
										id: request.id,
									},
								)
							"
							@update:modelValue="
								setRequestSelected(
									request,
									Boolean(
										$event,
									),
								)
							"
						/>
						<div class="min-w-0 flex-1">
							<div
								class="flex flex-wrap items-baseline gap-x-3 gap-y-1"
							>
								<h2
									class="font-semibold text-slate-900"
								>
									{{
										t(
											"SupplyManagerWorkspace.incoming.request",
											{
												id: request.id,
											},
										)
									}}
								</h2>
								<span
									class="text-sm text-slate-600"
								>
									{{
										formatDateTime(
											request.date,
										)
									}}
								</span>
								<span
									class="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800"
								>
									{{
										request
											.construction_site
											.descr
									}}
								</span>
							</div>
							<div
								class="mt-1 text-xs text-slate-500"
							>
								{{
									request
										.construction_manager
										.descr
								}}
								<span
									v-if="
										request.comment
									"
								>
									·
									{{
										request.comment
									}}</span
								>
							</div>
						</div>
						<div
							class="ml-auto flex flex-wrap items-center justify-end gap-2"
						>
							<DocumentPrintButton
								kind="request"
								:documentId="
									request.id
								"
								small
							/>
							<Button
								:label="
									t(
										'SupplyManagerWorkspace.assignment.applyRequest',
									)
								"
								icon="pi pi-copy"
								severity="secondary"
								outlined
								size="small"
								:disabled="
									activeSupplierID ===
										null ||
									submitting
								"
								@click="
									applyToRequest(
										request,
									)
								"
							/>
						</div>
					</header>

					<div class="overflow-x-auto">
						<table
							class="w-full min-w-[68rem] border-collapse text-sm"
						>
							<thead
								class="bg-white text-xs text-slate-600"
							>
								<tr>
									<th
										class="w-10 px-2 py-2"
									></th>
									<th
										class="min-w-72 px-3 py-2 text-left font-semibold"
									>
										{{
											t(
												"SupplyManagerWorkspace.columns.material",
											)
										}}
									</th>
									<th
										class="w-28 px-2 py-2 text-right font-semibold"
									>
										{{
											t(
												"SupplyManagerWorkspace.columns.quantity",
											)
										}}
									</th>
									<th
										class="w-32 px-2 py-2 text-left font-semibold"
									>
										{{
											t(
												"SupplyManagerWorkspace.columns.requiredDate",
											)
										}}
									</th>
									<th
										class="w-40 px-2 py-2 text-left font-semibold"
									>
										{{
											t(
												"SupplyManagerWorkspace.columns.importance",
											)
										}}
									</th>
									<th
										class="w-72 px-2 py-2 text-left font-semibold"
									>
										{{
											t(
												"SupplyManagerWorkspace.columns.supplier",
											)
										}}
									</th>
									<th
										class="w-24 px-2 py-2"
									></th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="item in request.items"
									:key="
										item.id
									"
									class="border-t border-slate-200 align-middle"
								>
									<td
										class="px-2 py-2 text-center"
									>
										<Checkbox
											:modelValue="
												isItemSelected(
													item.id,
												)
											"
											binary
											:disabled="
												submitting
											"
											:aria-label="
												t(
													'SupplyManagerWorkspace.assignment.selectLine',
													{
														line: item.line_num,
														request: request.id,
													},
												)
											"
											@update:modelValue="
												setItemSelected(
													item.id,
													Boolean(
														$event,
													),
												)
											"
										/>
									</td>
									<td
										class="px-3 py-2 font-medium text-slate-900"
									>
										{{
											item
												.material
												.descr
										}}
									</td>
									<td
										class="px-2 py-2 text-right tabular-nums text-slate-800"
									>
										{{
											formatNumber(
												item.quant,
											)
										}}
										{{
											item
												.measure_unit
												.descr
										}}
									</td>
									<td
										class="px-2 py-2 text-slate-600"
									>
										{{
											formatDate(
												item.required_date,
											)
										}}
									</td>
									<td
										class="px-2 py-2"
									>
										<span
											class="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900"
										>
											{{
												item
													.order_importance
													.descr
											}}
										</span>
									</td>
									<td
										class="px-2 py-1.5"
									>
										<Select
											:modelValue="
												supplierIDForItem(
													item.id,
												)
											"
											:options="
												supplierOptions
											"
											optionLabel="name"
											optionValue="id"
											:placeholder="
												t(
													'SupplyManagerWorkspace.assignment.supplierPlaceholder',
												)
											"
											:disabled="
												referenceLoading ||
												submitting
											"
											filter
											showClear
											class="w-full"
											@update:modelValue="
												setSupplier(
													item.id,
													$event,
												)
											"
										/>
									</td>
									<td
										class="px-2 py-1.5 text-center"
									>
										<div
											class="flex items-center justify-center gap-0.5"
										>
											<Button
												icon="pi pi-check"
												severity="secondary"
												text
												rounded
												:disabled="
													activeSupplierID ===
														null ||
													submitting
												"
												:title="
													t(
														'SupplyManagerWorkspace.assignment.applyLine',
													)
												"
												:aria-label="
													t(
														'SupplyManagerWorkspace.assignment.applyLineAria',
														{
															material: item
																.material
																.descr,
														},
													)
												"
												@click="
													applyToLine(
														item,
													)
												"
											/>
											<Button
												icon="pi pi-clone"
												severity="secondary"
												text
												rounded
												:disabled="
													activeSupplierID ===
														null ||
													submitting
												"
												:title="
													t(
														'SupplyManagerWorkspace.assignment.applySameMaterial',
													)
												"
												:aria-label="
													t(
														'SupplyManagerWorkspace.assignment.applySameMaterialAria',
														{
															material: item
																.material
																.descr,
														},
													)
												"
												@click="
													applyToSameMaterial(
														item,
													)
												"
											/>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</article>

				<div
					v-if="hasMore"
					class="flex justify-center pt-1"
				>
					<Button
						:label="
							t(
								'SupplyManagerWorkspace.incoming.loadMore',
							)
						"
						icon="pi pi-angle-down"
						severity="secondary"
						outlined
						:loading="loadingMore"
						:disabled="
							submitting ||
							loading ||
							loadingMore ||
							filtersDirty
						"
						@click="loadIncoming(false)"
					/>
				</div>
			</div>

			<aside
				class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:self-start"
			>
				<div
					class="mb-3 flex items-baseline justify-between gap-3"
				>
					<h2
						class="font-semibold text-slate-900"
					>
						{{
							t(
								"SupplyManagerWorkspace.summary.title",
							)
						}}
					</h2>
					<span class="text-xs text-slate-500">
						{{
							t(
								"SupplyManagerWorkspace.summary.count",
								{
									requests: touchedRequests.length,
									lines: assignedLines.length,
								},
							)
						}}
					</span>
				</div>

				<div
					v-if="summaryGroups.length === 0"
					class="py-10 text-center text-sm text-slate-500"
				>
					{{
						t(
							"SupplyManagerWorkspace.summary.empty",
						)
					}}
				</div>
				<div
					v-else
					class="max-h-[52vh] space-y-4 overflow-y-auto pr-1"
				>
					<section
						v-for="group in summaryGroups"
						:key="group.supplier.id"
						class="overflow-hidden rounded-lg border border-slate-200"
					>
						<header
							class="flex items-center justify-between gap-2 bg-slate-100 px-3 py-2"
						>
							<span
								class="font-semibold text-slate-800"
							>
								{{
									group
										.supplier
										.name
								}}
							</span>
							<span
								class="text-xs text-slate-500"
							>
								{{
									group.lineCount
								}}
							</span>
						</header>
						<div
							class="divide-y divide-slate-200"
						>
							<div
								v-for="material in group.materials"
								:key="
									material.key
								"
								class="px-3 py-2 text-sm"
							>
								<div
									class="flex justify-between gap-3"
								>
									<span
										class="min-w-0 font-medium text-slate-800"
									>
										{{
											material.materialName
										}}
									</span>
									<span
										class="shrink-0 tabular-nums text-slate-800"
									>
										{{
											formatNumber(
												material.quantity,
											)
										}}
										{{
											material.measureUnitName
										}}
									</span>
								</div>
								<div
									class="mt-0.5 text-xs text-slate-500"
								>
									{{
										t(
											"SupplyManagerWorkspace.summary.materialStats",
											{
												lines: material.lineCount,
												sites: material.siteCount,
											},
										)
									}}
								</div>
								<details
									class="mt-1 text-xs text-slate-600"
								>
									<summary
										class="cursor-pointer font-medium text-cyan-800"
									>
										{{
											t(
												"SupplyManagerWorkspace.summary.breakdown",
											)
										}}
									</summary>
									<div
										class="mt-1 space-y-1 border-l-2 border-slate-200 pl-2"
									>
										<div
											v-for="breakdown in material.breakdown"
											:key="`${breakdown.requestID}:${breakdown.siteID}`"
											class="flex justify-between gap-2"
										>
											<span>
												{{
													t(
														"SupplyManagerWorkspace.incoming.request",
														{
															id: breakdown.requestID,
														},
													)
												}}
												·
												{{
													breakdown.siteName
												}}
											</span>
											<span
												class="shrink-0 tabular-nums"
											>
												{{
													formatNumber(
														breakdown.quantity,
													)
												}}
												{{
													material.measureUnitName
												}}
												<span
													v-if="
														breakdown.lineCount >
														1
													"
												>
													({{
														breakdown.lineCount
													}})
												</span>
											</span>
										</div>
									</div>
								</details>
							</div>
						</div>
					</section>
				</div>

				<div
					v-if="incompleteRequests.length > 0"
					class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
				>
					{{
						t(
							"SupplyManagerWorkspace.summary.incomplete",
							{
								count: incompleteRequests.length,
								lines: unassignedLineCount,
							},
						)
					}}
				</div>
				<Button
					class="mt-4 w-full"
					:label="
						t(
							'SupplyManagerWorkspace.assignment.submit',
						)
					"
					icon="pi pi-send"
					severity="success"
					:loading="submitting"
					:disabled="!canSubmit"
					@click="requestSubmit"
				/>
				<p class="mt-2 text-xs text-slate-500">
					{{
						t(
							"SupplyManagerWorkspace.summary.atomicHint",
						)
					}}
				</p>
			</aside>
		</div>
	</div>
</template>
