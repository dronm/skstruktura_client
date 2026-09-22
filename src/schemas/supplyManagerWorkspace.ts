import * as v from "valibot";

import {
	IdSchema,
	IntSchema,
	NumberSchema,
	RequiredTextSchema,
} from "@/schemas/common";
import type {
	MaterialRequestSupplierAssignmentHistory,
	SupplyManagerIncomingRequest,
} from "@/types/supplyManagerWorkspace";

const NonNegativeIntSchema = v.pipe(IntSchema, v.minValue(0));

const isValidCalendarDate = (value: string): boolean => {
	const year = Number(value.slice(0, 4));
	const month = Number(value.slice(5, 7));
	const day = Number(value.slice(8, 10));
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
};

const DateOnlySchema = v.pipe(
	v.string(),
	v.isoDate(),
	v.check(isValidCalendarDate),
);

const TimestampSchema = v.pipe(
	RequiredTextSchema,
	v.isoTimestamp(),
	v.check(isValidCalendarDate),
	v.check((value) => !Number.isNaN(Date.parse(value))),
);

const dateOnlyFromDTO = (value: string): Date => {
	return new Date(
		Number(value.slice(0, 4)),
		Number(value.slice(5, 7)) - 1,
		Number(value.slice(8, 10)),
	);
};

const SupplyManagerReferenceSchema = v.object({
	keys: v.record(v.string(), v.unknown()),
	descr: RequiredTextSchema,
	dataType: v.optional(v.string()),
});

const SupplyManagerIncomingRequestItemDTOSchema = v.object({
	id: IdSchema,
	line_num: v.pipe(IntSchema, v.minValue(1)),
	material_id: IdSchema,
	material: SupplyManagerReferenceSchema,
	measure_unit_id: IdSchema,
	measure_unit: SupplyManagerReferenceSchema,
	quant: NumberSchema,
	required_date: v.nullable(DateOnlySchema),
	order_importance_id: IdSchema,
	order_importance: SupplyManagerReferenceSchema,
	status_id: IdSchema,
	status: SupplyManagerReferenceSchema,
	supplier_id: v.nullable(IdSchema),
	supplier: v.nullable(SupplyManagerReferenceSchema),
});

const SupplyManagerIncomingRequestDTOSchema = v.object({
	id: IdSchema,
	version: v.pipe(IntSchema, v.minValue(1)),
	date: TimestampSchema,
	construction_site_id: IdSchema,
	construction_site: SupplyManagerReferenceSchema,
	construction_manager_id: IdSchema,
	construction_manager: SupplyManagerReferenceSchema,
	comment: v.nullable(v.string()),
	status_id: IdSchema,
	status: SupplyManagerReferenceSchema,
	items: v.array(SupplyManagerIncomingRequestItemDTOSchema),
});

const MaterialRequestSupplierAssignmentHistoryItemDTOSchema = v.object({
	id: IdSchema,
	line_num: v.pipe(IntSchema, v.minValue(1)),
	material_request_supplier_assignment_id: IdSchema,
	material_request_item_id: IdSchema,
	supplier_id: IdSchema,
	supplier: SupplyManagerReferenceSchema,
	material_request_id: IdSchema,
	request_date: TimestampSchema,
	construction_site_id: IdSchema,
	construction_site: SupplyManagerReferenceSchema,
	material_id: IdSchema,
	material: SupplyManagerReferenceSchema,
	measure_unit_id: IdSchema,
	measure_unit: SupplyManagerReferenceSchema,
	quant: NumberSchema,
	required_date: v.nullable(DateOnlySchema),
	order_importance_id: IdSchema,
	order_importance: SupplyManagerReferenceSchema,
});

const MaterialRequestSupplierAssignmentHistoryDTOSchema = v.object({
	id: IdSchema,
	date: TimestampSchema,
	supply_manager_id: IdSchema,
	supply_manager: SupplyManagerReferenceSchema,
	comment: v.nullable(v.string()),
	version: v.pipe(IntSchema, v.minValue(1)),
	items: v.array(MaterialRequestSupplierAssignmentHistoryItemDTOSchema),
});

export const supplyManagerIncomingRequestFromDTO = (
	dto: unknown,
): SupplyManagerIncomingRequest => {
	const parsed = v.parse(SupplyManagerIncomingRequestDTOSchema, dto);

	return {
		...parsed,
		date: new Date(parsed.date),
		items: parsed.items.map((item) => ({
			...item,
			required_date:
				item.required_date === null
					? null
					: dateOnlyFromDTO(item.required_date),
		})),
	};
};

export const materialRequestSupplierAssignmentHistoryFromDTO = (
	dto: unknown,
): MaterialRequestSupplierAssignmentHistory => {
	const parsed = v.parse(
		MaterialRequestSupplierAssignmentHistoryDTOSchema,
		dto,
	);

	return {
		...parsed,
		date: new Date(parsed.date),
		items: parsed.items.map((item) => ({
			...item,
			request_date: new Date(item.request_date),
			required_date:
				item.required_date === null
					? null
					: dateOnlyFromDTO(item.required_date),
		})),
	};
};

export const collectionOffsetSchema = NonNegativeIntSchema;
