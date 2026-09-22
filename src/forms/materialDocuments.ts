import type { MaterialConsumptionItem } from "@/types/materialConsumptionItem.gen";
import type {
	MaterialConsumptionDocument,
	MaterialConsumptionDocumentForm,
	MaterialRequestDocument,
	MaterialRequestDocumentForm,
	MaterialReceiptDocument,
	MaterialReceiptDocumentForm,
	MaterialTransferDocument,
	MaterialTransferDocumentForm,
} from "@/types/materialDocuments";
import type { MaterialReceiptItem } from "@/types/materialReceiptItem.gen";
import type { MaterialTransferItem } from "@/types/materialTransferItem.gen";
import { normalizeNullableID } from "@/utils/nullableID";

export const nullableDocumentText = (
	value: string | null | undefined,
): string | null => {
	const normalized = value?.trim() ?? "";
	return normalized || null;
};

export const currentDocumentDateTime = (): Date => {
	const value = new Date();
	value.setMilliseconds(0);
	return value;
};

export const createMaterialReceiptDocumentForm =
	(): MaterialReceiptDocumentForm => ({
		id: 0,
		version: 0,
		date: currentDocumentDateTime(),
		construction_site_id: null,
		supplier_id: 0,
		number: "",
		comment: null,
		items: [],
	});

export const materialReceiptDocumentToForm = (
	document: MaterialReceiptDocument,
): MaterialReceiptDocumentForm => ({
	...document,
	construction_site_id: normalizeNullableID(
		document.construction_site_id,
	),
	date: new Date(document.date),
	items: document.items.map((item) => ({
		...item,
		construction_site_id: normalizeNullableID(
			item.construction_site_id,
		),
	})),
});

export const copyMaterialReceiptDocument = (
	document: MaterialReceiptDocument,
): MaterialReceiptDocumentForm => ({
	...materialReceiptDocumentToForm(document),
	id: 0,
	version: 0,
	items: document.items.map(
		(item, index): MaterialReceiptItem => ({
			...item,
			construction_site_id: normalizeNullableID(
				item.construction_site_id,
			),
			id: -(index + 1),
			line_num: index + 1,
			material_receipt_id: 0,
		}),
	),
});

export const createMaterialConsumptionDocumentForm =
	(): MaterialConsumptionDocumentForm => ({
		id: 0,
		version: 0,
		date: currentDocumentDateTime(),
		construction_site_id: 0,
		comment: null,
		items: [],
	});

export const materialConsumptionDocumentToForm = (
	document: MaterialConsumptionDocument,
): MaterialConsumptionDocumentForm => ({
	...document,
	date: new Date(document.date),
	items: document.items.map((item) => ({
		...item,
	})),
});

export const copyMaterialConsumptionDocument = (
	document: MaterialConsumptionDocument,
): MaterialConsumptionDocumentForm => ({
	...materialConsumptionDocumentToForm(document),
	id: 0,
	version: 0,
	items: document.items.map(
		(item, index): MaterialConsumptionItem => ({
			...item,
			id: -(index + 1),
			line_num: index + 1,
			material_consumption_id: 0,
		}),
	),
});

export const createMaterialTransferDocumentForm =
	(): MaterialTransferDocumentForm => ({
		id: 0,
		version: 0,
		date: currentDocumentDateTime(),
		source_construction_site_id: 0,
		destination_construction_site_id: 0,
		comment: null,
		items: [],
	});

export const materialTransferDocumentToForm = (
	document: MaterialTransferDocument,
): MaterialTransferDocumentForm => ({
	...document,
	date: new Date(document.date),
	items: document.items.map((item) => ({
		...item,
	})),
});

export const copyMaterialTransferDocument = (
	document: MaterialTransferDocument,
): MaterialTransferDocumentForm => ({
	...materialTransferDocumentToForm(document),
	id: 0,
	version: 0,
	items: document.items.map(
		(item, index): MaterialTransferItem => ({
			...item,
			id: -(index + 1),
			line_num: index + 1,
			material_transfer_id: 0,
		}),
	),
});

export const createMaterialRequestDocumentForm = (
	constructionManagerID = 0,
): MaterialRequestDocumentForm => ({
	id: 0,
	version: 0,
	date: currentDocumentDateTime(),
	construction_site_id: 0,
	construction_manager_id: constructionManagerID,
	comment: null,
	status_id: 1,
	status: {
		keys: { id: 1 },
		descr: "Черновик",
		dataType: "materialRequestStatuses",
	},
	items: [],
});

export const materialRequestDocumentToForm = (
	document: MaterialRequestDocument,
): MaterialRequestDocumentForm => ({
	...document,
	date: new Date(document.date),
	items: document.items.map((item) => ({
		...item,
		required_date:
			item.required_date === null
				? null
				: new Date(item.required_date),
		supplier_id: normalizeNullableID(item.supplier_id),
	})),
});

export const copyMaterialRequestDocument = (
	document: MaterialRequestDocument,
): MaterialRequestDocumentForm => ({
	...materialRequestDocumentToForm(document),
	id: 0,
	version: 0,
	status_id: 1,
	status: {
		keys: { id: 1 },
		descr: "Черновик",
		dataType: "materialRequestStatuses",
	},
	items: document.items.map(
		(
			item,
			index,
		): MaterialRequestDocumentForm["items"][number] => ({
			...item,
			id: -(index + 1),
			line_num: index + 1,
			material_request_id: 0,
			supplier_id: null,
			supplier: null,
			status_id: 1,
			status: {
				keys: { id: 1 },
				descr: "Черновик",
				dataType: "materialRequestStatuses",
			},
			required_date:
				item.required_date === null
					? null
					: new Date(item.required_date),
		}),
	),
});
