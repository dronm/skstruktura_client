import type {
	MaterialConsumption,
	MaterialConsumptionDTO,
} from "@/types/materialConsumption.gen";
import type { MaterialConsumptionItem } from "@/types/materialConsumptionItem.gen";
import type {
	MaterialReceipt,
	MaterialReceiptDTO,
} from "@/types/materialReceipt.gen";
import type { MaterialReceiptItem } from "@/types/materialReceiptItem.gen";
import type {
	MaterialTransfer,
	MaterialTransferDTO,
} from "@/types/materialTransfer.gen";
import type { MaterialTransferItem } from "@/types/materialTransferItem.gen";

export type MaterialDocumentReference = Record<string, unknown>;

export interface MaterialDocumentKey {
	id: number;
}

export interface MaterialReceiptDocumentItemDTO {
	id: number;
	line_num: number;
	material_id: number;
	measure_unit_id: number;
	construction_site_id: number | null;
	quant: number;
	price: number;
	amount: number;
	vat_percent: number;
	vat_amount: number;
	material: MaterialDocumentReference;
	measure_unit: MaterialDocumentReference;
	construction_site: MaterialDocumentReference | null;
}

export interface MaterialReceiptDocumentDTO extends MaterialReceiptDTO {
	construction_site: MaterialDocumentReference | null;
	supplier: MaterialDocumentReference;
	items: MaterialReceiptDocumentItemDTO[];
}

export interface MaterialReceiptDocumentItem extends MaterialReceiptItem {
	material: MaterialDocumentReference;
	measure_unit: MaterialDocumentReference;
	construction_site: MaterialDocumentReference | null;
}

export interface MaterialReceiptDocument extends MaterialReceipt {
	construction_site: MaterialDocumentReference | null;
	supplier: MaterialDocumentReference;
	items: MaterialReceiptDocumentItem[];
}

export interface MaterialReceiptDocumentForm {
	construction_site?: MaterialDocumentReference | null;
	supplier?: MaterialDocumentReference | null;

	id: number;
	version: number;
	date: Date | undefined;
	construction_site_id: number | null;
	supplier_id: number;
	number: string;
	comment: string | null;
	items: (MaterialReceiptItem & { material?: MaterialDocumentReference; measure_unit?: MaterialDocumentReference; construction_site?: MaterialDocumentReference | null })[];
}

export interface MaterialReceiptDocumentSaveItem {
	id?: number;
	material_id: number;
	measure_unit_id: number;
	construction_site_id: number | null;
	quant: number;
	price: number;
	amount: number;
	vat_percent: number;
	vat_amount: number;
}

export interface MaterialReceiptDocumentSave {
	id: number;
	version: number;
	date: Date;
	construction_site_id: number | null;
	supplier_id: number;
	number: string;
	comment: string | null;
	items: MaterialReceiptDocumentSaveItem[];
}

export interface MaterialConsumptionDocumentItemDTO {
	id: number;
	line_num: number;
	material_id: number;
	measure_unit_id: number;
	quant: number;
	material: MaterialDocumentReference;
	measure_unit: MaterialDocumentReference;
}

export interface MaterialConsumptionDocumentDTO extends MaterialConsumptionDTO {
	construction_site: MaterialDocumentReference;
	items: MaterialConsumptionDocumentItemDTO[];
}

export interface MaterialConsumptionDocumentItem extends MaterialConsumptionItem {
	material: MaterialDocumentReference;
	measure_unit: MaterialDocumentReference;
}

export interface MaterialConsumptionDocument extends MaterialConsumption {
	construction_site: MaterialDocumentReference;
	items: MaterialConsumptionDocumentItem[];
}

export interface MaterialConsumptionDocumentForm {
	construction_site?: MaterialDocumentReference | null;

	id: number;
	version: number;
	date: Date | undefined;
	construction_site_id: number;
	comment: string | null;
	items: (MaterialConsumptionItem & { material?: MaterialDocumentReference; measure_unit?: MaterialDocumentReference; construction_site?: MaterialDocumentReference | null })[];
}

export interface MaterialConsumptionDocumentSaveItem {
	id?: number;
	material_id: number;
	measure_unit_id: number;
	quant: number;
}

export interface MaterialConsumptionDocumentSave {
	id: number;
	version: number;
	date: Date;
	construction_site_id: number;
	comment: string | null;
	items: MaterialConsumptionDocumentSaveItem[];
}

export interface MaterialTransferDocumentItemDTO {
	id: number;
	line_num: number;
	material_id: number;
	measure_unit_id: number;
	quant: number;
	material: MaterialDocumentReference;
	measure_unit: MaterialDocumentReference;
}

export interface MaterialTransferDocumentDTO extends MaterialTransferDTO {
	source_construction_site: MaterialDocumentReference;
	destination_construction_site: MaterialDocumentReference;
	items: MaterialTransferDocumentItemDTO[];
}

export interface MaterialTransferDocumentItem extends MaterialTransferItem {
	material: MaterialDocumentReference;
	measure_unit: MaterialDocumentReference;
}

export interface MaterialTransferDocument extends MaterialTransfer {
	source_construction_site: MaterialDocumentReference;
	destination_construction_site: MaterialDocumentReference;
	items: MaterialTransferDocumentItem[];
}

export interface MaterialTransferDocumentForm {
	source_construction_site?: MaterialDocumentReference | null;
	destination_construction_site?: MaterialDocumentReference | null;

	id: number;
	version: number;
	date: Date | undefined;
	source_construction_site_id: number;
	destination_construction_site_id: number;
	comment: string | null;
	items: (MaterialTransferItem & { material?: MaterialDocumentReference; measure_unit?: MaterialDocumentReference; construction_site?: MaterialDocumentReference | null })[];
}

export interface MaterialTransferDocumentSaveItem {
	id?: number;
	material_id: number;
	measure_unit_id: number;
	quant: number;
}

export interface MaterialTransferDocumentSave {
	id: number;
	version: number;
	date: Date;
	source_construction_site_id: number;
	destination_construction_site_id: number;
	comment: string | null;
	items: MaterialTransferDocumentSaveItem[];
}
