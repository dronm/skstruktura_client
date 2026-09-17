import * as v from "valibot";

import {
	AttrsSchema,
	DateStringSchema,
	IdSchema,
	IntSchema,
	NumberSchema,
	RequiredTextSchema,
	TextSchema,
} from "@/schemas/common";
import type {
	MaterialConsumptionDocument,
	MaterialConsumptionDocumentDTO,
	MaterialReceiptDocument,
	MaterialReceiptDocumentDTO,
	MaterialTransferDocument,
	MaterialTransferDocumentDTO,
} from "@/types/materialDocuments";

const VersionSchema = v.pipe(IntSchema, v.minValue(1));
const VatPercentSchema = v.pipe(NumberSchema, v.minValue(0), v.maxValue(100));
const VatAmountSchema = v.pipe(NumberSchema, v.minValue(0));

const MaterialReceiptDocumentItemDTOSchema = v.object({
	id: IdSchema,
	line_num: IdSchema,
	material_id: IdSchema,
	measure_unit_id: IdSchema,
	construction_site_id: v.nullable(IdSchema),
	quant: NumberSchema,
	price: NumberSchema,
	amount: NumberSchema,
	vat_percent: VatPercentSchema,
	vat_amount: VatAmountSchema,
	material: AttrsSchema,
	measure_unit: AttrsSchema,
	construction_site: v.nullable(AttrsSchema),
});

const MaterialReceiptDocumentDTOSchema = v.object({
	id: IdSchema,
	version: VersionSchema,
	date: DateStringSchema,
	construction_site_id: v.nullable(IdSchema),
	supplier_id: IdSchema,
	number: RequiredTextSchema,
	comment: v.nullable(TextSchema),
	construction_site: v.nullable(AttrsSchema),
	supplier: AttrsSchema,
	items: v.array(MaterialReceiptDocumentItemDTOSchema),
});

const MaterialConsumptionDocumentItemDTOSchema = v.object({
	id: IdSchema,
	line_num: IdSchema,
	material_id: IdSchema,
	measure_unit_id: IdSchema,
	quant: NumberSchema,
	material: AttrsSchema,
	measure_unit: AttrsSchema,
});

const MaterialConsumptionDocumentDTOSchema = v.object({
	id: IdSchema,
	version: VersionSchema,
	date: DateStringSchema,
	construction_site_id: IdSchema,
	comment: v.nullable(TextSchema),
	construction_site: AttrsSchema,
	items: v.array(MaterialConsumptionDocumentItemDTOSchema),
});

const MaterialTransferDocumentItemDTOSchema = v.object({
	id: IdSchema,
	line_num: IdSchema,
	material_id: IdSchema,
	measure_unit_id: IdSchema,
	quant: NumberSchema,
	material: AttrsSchema,
	measure_unit: AttrsSchema,
});

const MaterialTransferDocumentDTOSchema = v.object({
	id: IdSchema,
	version: VersionSchema,
	date: DateStringSchema,
	source_construction_site_id: IdSchema,
	destination_construction_site_id: IdSchema,
	comment: v.nullable(TextSchema),
	source_construction_site: AttrsSchema,
	destination_construction_site: AttrsSchema,
	items: v.array(MaterialTransferDocumentItemDTOSchema),
});

export const materialReceiptDocumentFromDTO = (
	dto: MaterialReceiptDocumentDTO | unknown,
): MaterialReceiptDocument => {
	const parsed = v.parse(MaterialReceiptDocumentDTOSchema, dto);

	return {
		...parsed,
		date: new Date(parsed.date),
		items: parsed.items.map((item) => ({
			...item,
			material_receipt_id: parsed.id,
		})),
	};
};

export const materialConsumptionDocumentFromDTO = (
	dto: MaterialConsumptionDocumentDTO | unknown,
): MaterialConsumptionDocument => {
	const parsed = v.parse(MaterialConsumptionDocumentDTOSchema, dto);

	return {
		...parsed,
		date: new Date(parsed.date),
		items: parsed.items.map((item) => ({
			...item,
			material_consumption_id: parsed.id,
		})),
	};
};

export const materialTransferDocumentFromDTO = (
	dto: MaterialTransferDocumentDTO | unknown,
): MaterialTransferDocument => {
	const parsed = v.parse(MaterialTransferDocumentDTOSchema, dto);

	return {
		...parsed,
		date: new Date(parsed.date),
		items: parsed.items.map((item) => ({
			...item,
			material_transfer_id: parsed.id,
		})),
	};
};
