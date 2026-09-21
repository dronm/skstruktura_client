import api from "@/api/http";
import {
	materialConsumptionDocumentFromDTO,
	materialRequestDocumentFromDTO,
	materialReceiptDocumentFromDTO,
	materialTransferDocumentFromDTO,
} from "@/schemas/materialDocuments";
import { normalizeNullableID } from "@/utils/nullableID";
import type {
	MaterialConsumptionDocument,
	MaterialConsumptionDocumentDTO,
	MaterialConsumptionDocumentSave,
	MaterialDocumentKey,
	MaterialRequestDocument,
	MaterialRequestDocumentDTO,
	MaterialRequestDocumentSave,
	MaterialReceiptDocument,
	MaterialReceiptDocumentDTO,
	MaterialReceiptDocumentSave,
	MaterialTransferDocument,
	MaterialTransferDocumentDTO,
	MaterialTransferDocumentSave,
} from "@/types/materialDocuments";

export interface MaterialDocumentApi<TDocument, TSave> {
	detail: (key: MaterialDocumentKey) => Promise<TDocument>;
	create: (document: TSave) => Promise<TDocument>;
	update: (
		key: MaterialDocumentKey,
		document: TSave,
	) => Promise<TDocument>;
}

export interface MaterialRequestDocumentApi
	extends MaterialDocumentApi<
		MaterialRequestDocument,
		MaterialRequestDocumentSave
	> {
	submit: (
		key: MaterialDocumentKey,
		version: number,
	) => Promise<MaterialRequestDocument>;
}

const documentPath = (basePath: string, key: MaterialDocumentKey): string => {
	return `${basePath}/${encodeURIComponent(String(key.id))}`;
};

const existingItemID = (id: number | undefined): { id: number } | object => {
	return typeof id === "number" && id > 0 ? { id } : {};
};

const dateOnlyValue = (value: Date | null): string | null => {
	if (value === null) {
		return null;
	}

	const year = value.getFullYear();
	const month = String(value.getMonth() + 1).padStart(2, "0");
	const day = String(value.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const materialReceiptCreateBody = (document: MaterialReceiptDocumentSave) => ({
	date: document.date,
	construction_site_id: normalizeNullableID(
		document.construction_site_id,
	),
	supplier_id: document.supplier_id,
	number: document.number,
	comment: document.comment,
	items: document.items.map((item) => ({
		material_id: item.material_id,
		measure_unit_id: item.measure_unit_id,
		construction_site_id: normalizeNullableID(
			item.construction_site_id,
		),
		quant: item.quant,
		price: item.price,
		amount: item.amount,
		vat_percent: item.vat_percent,
		vat_amount: item.vat_amount,
	})),
});

const materialReceiptUpdateBody = (document: MaterialReceiptDocumentSave) => ({
	id: document.id,
	version: document.version,
	...materialReceiptCreateBody(document),
	items: document.items.map((item) => ({
		...existingItemID(item.id),
		material_id: item.material_id,
		measure_unit_id: item.measure_unit_id,
		construction_site_id: normalizeNullableID(
			item.construction_site_id,
		),
		quant: item.quant,
		price: item.price,
		amount: item.amount,
		vat_percent: item.vat_percent,
		vat_amount: item.vat_amount,
	})),
});

const materialConsumptionCreateBody = (
	document: MaterialConsumptionDocumentSave,
) => ({
	date: document.date,
	construction_site_id: document.construction_site_id,
	comment: document.comment,
	items: document.items.map((item) => ({
		material_id: item.material_id,
		measure_unit_id: item.measure_unit_id,
		quant: item.quant,
	})),
});

const materialConsumptionUpdateBody = (
	document: MaterialConsumptionDocumentSave,
) => ({
	id: document.id,
	version: document.version,
	...materialConsumptionCreateBody(document),
	items: document.items.map((item) => ({
		...existingItemID(item.id),
		material_id: item.material_id,
		measure_unit_id: item.measure_unit_id,
		quant: item.quant,
	})),
});

const materialTransferCreateBody = (
	document: MaterialTransferDocumentSave,
) => ({
	date: document.date,
	source_construction_site_id: document.source_construction_site_id,
	destination_construction_site_id:
		document.destination_construction_site_id,
	comment: document.comment,
	items: document.items.map((item) => ({
		material_id: item.material_id,
		measure_unit_id: item.measure_unit_id,
		quant: item.quant,
	})),
});

const materialTransferUpdateBody = (
	document: MaterialTransferDocumentSave,
) => ({
	id: document.id,
	version: document.version,
	...materialTransferCreateBody(document),
	items: document.items.map((item) => ({
		...existingItemID(item.id),
		material_id: item.material_id,
		measure_unit_id: item.measure_unit_id,
		quant: item.quant,
	})),
});

const materialRequestCreateBody = (
	document: MaterialRequestDocumentSave,
) => ({
	date: document.date,
	construction_site_id: document.construction_site_id,
	construction_manager_id: document.construction_manager_id,
	comment: document.comment,
	items: document.items.map((item) => ({
		material_id: item.material_id,
		measure_unit_id: item.measure_unit_id,
		quant: item.quant,
		supplier_id: normalizeNullableID(item.supplier_id),
		required_date: dateOnlyValue(item.required_date),
		order_importance_id: item.order_importance_id,
		status_id: item.status_id,
	})),
});

const materialRequestUpdateBody = (
	document: MaterialRequestDocumentSave,
) => ({
	id: document.id,
	version: document.version,
	...materialRequestCreateBody(document),
	items: document.items.map((item) => ({
		...existingItemID(item.id),
		material_id: item.material_id,
		measure_unit_id: item.measure_unit_id,
		quant: item.quant,
		supplier_id: normalizeNullableID(item.supplier_id),
		required_date: dateOnlyValue(item.required_date),
		order_importance_id: item.order_importance_id,
		status_id: item.status_id,
	})),
});

const materialReceiptBasePath = "/material-receipts";

export const materialReceiptDocumentApi: MaterialDocumentApi<
	MaterialReceiptDocument,
	MaterialReceiptDocumentSave
> = {
	detail: async (key) => {
		const response = await api.get<MaterialReceiptDocumentDTO>(
			documentPath(materialReceiptBasePath, key),
		);
		return materialReceiptDocumentFromDTO(response);
	},
	create: async (document) => {
		const response = await api.post<MaterialReceiptDocumentDTO>(
			materialReceiptBasePath,
			materialReceiptCreateBody(document),
		);
		return materialReceiptDocumentFromDTO(response);
	},
	update: async (key, document) => {
		const response = await api.put<MaterialReceiptDocumentDTO>(
			documentPath(materialReceiptBasePath, key),
			materialReceiptUpdateBody(document),
		);
		return materialReceiptDocumentFromDTO(response);
	},
};

const materialConsumptionBasePath = "/material-consumptions";

export const materialConsumptionDocumentApi: MaterialDocumentApi<
	MaterialConsumptionDocument,
	MaterialConsumptionDocumentSave
> = {
	detail: async (key) => {
		const response = await api.get<MaterialConsumptionDocumentDTO>(
			documentPath(materialConsumptionBasePath, key),
		);
		return materialConsumptionDocumentFromDTO(response);
	},
	create: async (document) => {
		const response = await api.post<MaterialConsumptionDocumentDTO>(
			materialConsumptionBasePath,
			materialConsumptionCreateBody(document),
		);
		return materialConsumptionDocumentFromDTO(response);
	},
	update: async (key, document) => {
		const response = await api.put<MaterialConsumptionDocumentDTO>(
			documentPath(materialConsumptionBasePath, key),
			materialConsumptionUpdateBody(document),
		);
		return materialConsumptionDocumentFromDTO(response);
	},
};

const materialTransferBasePath = "/material-transfers";

export const materialTransferDocumentApi: MaterialDocumentApi<
	MaterialTransferDocument,
	MaterialTransferDocumentSave
> = {
	detail: async (key) => {
		const response = await api.get<MaterialTransferDocumentDTO>(
			documentPath(materialTransferBasePath, key),
		);
		return materialTransferDocumentFromDTO(response);
	},
	create: async (document) => {
		const response = await api.post<MaterialTransferDocumentDTO>(
			materialTransferBasePath,
			materialTransferCreateBody(document),
		);
		return materialTransferDocumentFromDTO(response);
	},
	update: async (key, document) => {
		const response = await api.put<MaterialTransferDocumentDTO>(
			documentPath(materialTransferBasePath, key),
			materialTransferUpdateBody(document),
		);
		return materialTransferDocumentFromDTO(response);
	},
};

const materialRequestBasePath = "/material-requests";

export const materialRequestDocumentApi: MaterialRequestDocumentApi = {
	detail: async (key) => {
		const response = await api.get<MaterialRequestDocumentDTO>(
			documentPath(materialRequestBasePath, key),
		);
		return materialRequestDocumentFromDTO(response);
	},
	create: async (document) => {
		const response = await api.post<MaterialRequestDocumentDTO>(
			materialRequestBasePath,
			materialRequestCreateBody(document),
		);
		return materialRequestDocumentFromDTO(response);
	},
	update: async (key, document) => {
		const response = await api.put<MaterialRequestDocumentDTO>(
			documentPath(materialRequestBasePath, key),
			materialRequestUpdateBody(document),
		);
		return materialRequestDocumentFromDTO(response);
	},
	submit: async (key, version) => {
		const response = await api.post<MaterialRequestDocumentDTO>(
			`${documentPath(materialRequestBasePath, key)}/submit`,
			{ version },
		);
		return materialRequestDocumentFromDTO(response);
	},
};
