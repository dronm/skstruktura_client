import * as v from "valibot";

import {
	IdSchema,
	IntSchema,
	NumberSchema,
	RequiredTextSchema,
} from "@/schemas/common";
import type {
	MaterialActionReportResponse,
	MaterialActionReportRow,
} from "@/types/materialActionReport";

const MaterialActionReportLevelSchema = v.picklist([
	"construction_site",
	"material",
	"document",
]);

const MaterialActionReportReferenceSchema = v.object({
	keys: v.object({
		id: IdSchema,
	}),
	descr: RequiredTextSchema,
});

const NullableNumberSchema = v.nullable(NumberSchema);

const MaterialActionReportRowSchema = v.object({
	key: RequiredTextSchema,
	row_type: MaterialActionReportLevelSchema,
	construction_site_id: IdSchema,
	construction_site: MaterialActionReportReferenceSchema,
	material_id: v.optional(IdSchema),
	material: v.optional(MaterialActionReportReferenceSchema),
	recorder_type: v.optional(RequiredTextSchema),
	recorder_id: v.optional(IdSchema),
	document_date: v.optional(RequiredTextSchema),
	document_number: v.optional(RequiredTextSchema),
	caption: RequiredTextSchema,
	balance_start: NullableNumberSchema,
	income: NullableNumberSchema,
	outcome: NullableNumberSchema,
	balance_end: NullableNumberSchema,
	has_children: v.boolean(),
	child_count: v.pipe(IntSchema, v.minValue(0)),
});

const MaterialActionReportResponseSchema = v.object({
	rows: v.array(MaterialActionReportRowSchema),
	total: v.pipe(IntSchema, v.minValue(0)),
	generated_at: RequiredTextSchema,
});

export const materialActionReportResponseFromDTO = (
	dto: unknown,
): MaterialActionReportResponse => {
	const parsed = v.parse(MaterialActionReportResponseSchema, dto);

	return {
		rows: parsed.rows as MaterialActionReportRow[],
		total: parsed.total,
		generated_at: new Date(parsed.generated_at),
	};
};
