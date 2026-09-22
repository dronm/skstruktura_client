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
	MaterialRequestDocument,
	MaterialRequestDocumentDTO,
	MaterialReceiptDocument,
	MaterialReceiptDocumentDTO,
	MaterialTransferDocument,
	MaterialTransferDocumentDTO,
} from "@/types/materialDocuments";

const VersionSchema = v.pipe(IntSchema, v.minValue(1));
const VatPercentSchema = v.pipe(NumberSchema, v.minValue(0), v.maxValue(100));
const VatAmountSchema = v.pipe(NumberSchema, v.minValue(0));
const PositiveQuantitySchema = v.pipe(NumberSchema, v.minValue(Number.EPSILON));

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

const MaterialRequestDocumentItemDTOSchema = v.object({
	id: IdSchema,
	line_num: IdSchema,
	material_id: IdSchema,
	measure_unit_id: IdSchema,
	quant: PositiveQuantitySchema,
	supplier_id: v.nullable(IdSchema),
	required_date: v.nullable(DateStringSchema),
	order_importance_id: IdSchema,
	status_id: IdSchema,
	material: AttrsSchema,
	measure_unit: AttrsSchema,
	supplier: v.nullable(AttrsSchema),
	order_importance: AttrsSchema,
	status: AttrsSchema,
});

const MaterialRequestDocumentDTOSchema = v.object({
	id: IdSchema,
	version: VersionSchema,
	date: DateStringSchema,
	construction_site_id: IdSchema,
	construction_manager_id: IdSchema,
	comment: v.nullable(TextSchema),
	construction_site: AttrsSchema,
	construction_manager: AttrsSchema,
	status_id: IdSchema,
	status: AttrsSchema,
	items: v.array(MaterialRequestDocumentItemDTOSchema),
});

const dateOnlyFromDTO = (value: string | null): Date | null => {
	if (value === null) {
		return null;
	}

	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
	if (match === null) {
		return null;
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	return new Date(year, month - 1, day);
};

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

export const materialRequestDocumentFromDTO = (
	dto: MaterialRequestDocumentDTO | unknown,
): MaterialRequestDocument => {
	const parsed = v.parse(MaterialRequestDocumentDTOSchema, dto);

	return {
		...parsed,
		date: new Date(parsed.date),
		items: parsed.items.map((item) => ({
			...item,
			material_request_id: parsed.id,
			required_date: dateOnlyFromDTO(item.required_date),
		})),
	};
};
