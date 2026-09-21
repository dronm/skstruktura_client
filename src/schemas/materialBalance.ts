import * as v from "valibot";

import {
	IdSchema,
	IntSchema,
	NumberSchema,
	RequiredTextSchema,
} from "@/schemas/common";
import type {
	MaterialBalanceConstructionSite,
	MaterialBalanceResponse,
	MaterialBalanceRow,
} from "@/types/materialBalance";

const MaterialBalanceReferenceSchema = v.object({
	keys: v.object({
		id: IdSchema,
	}),
	descr: RequiredTextSchema,
	dataType: v.optional(v.string()),
});

const MaterialBalanceConstructionSiteSchema = v.object({
	id: IdSchema,
	name: RequiredTextSchema,
});

const MaterialBalanceConstructionSitesSchema = v.union([
	v.array(MaterialBalanceConstructionSiteSchema),
	v.object({
		rows: v.array(MaterialBalanceConstructionSiteSchema),
	}),
]);

const MaterialBalanceRowSchema = v.object({
	material_type_id: IdSchema,
	material_type: MaterialBalanceReferenceSchema,
	material_id: IdSchema,
	material: MaterialBalanceReferenceSchema,
	measure_unit_id: IdSchema,
	measure_unit: MaterialBalanceReferenceSchema,
	balance: NumberSchema,
});

const MaterialBalanceResponseSchema = v.object({
	rows: v.array(MaterialBalanceRowSchema),
	total: v.pipe(IntSchema, v.minValue(0)),
	generated_at: RequiredTextSchema,
});

export const materialBalanceConstructionSitesFromDTO = (
	dto: unknown,
): MaterialBalanceConstructionSite[] => {
	const parsed = v.parse(MaterialBalanceConstructionSitesSchema, dto);

	return (
		Array.isArray(parsed) ? parsed : parsed.rows
	) as MaterialBalanceConstructionSite[];
};

export const materialBalanceResponseFromDTO = (
	dto: unknown,
): MaterialBalanceResponse => {
	const parsed = v.parse(MaterialBalanceResponseSchema, dto);

	return {
		rows: parsed.rows as MaterialBalanceRow[],
		total: parsed.total,
		generated_at: new Date(parsed.generated_at),
	};
};
