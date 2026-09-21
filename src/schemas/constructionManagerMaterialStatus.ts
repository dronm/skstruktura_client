import * as v from "valibot";

import {
	DateStringSchema,
	IdSchema,
	RequiredTextSchema,
} from "@/schemas/common";
import { MaterialStatusTypeSchema } from "@/schemas/enums/materialStatusType.gen";
import type {
	ConstructionManagerMaterialStatusCurrent,
	ConstructionManagerMaterialStatusCurrentDTO,
	ConstructionManagerMaterialStatusHistory,
	ConstructionManagerMaterialStatusHistoryDTO,
} from "@/types/constructionManagerMaterialStatus";

const ConstructionManagerMaterialStatusCurrentDTOSchema = v.object({
	material_id: IdSchema,
	material_name: RequiredTextSchema,
	material_type_id: IdSchema,
	material_type_name: RequiredTextSchema,
	status: MaterialStatusTypeSchema,
	status_record_id: v.nullable(IdSchema),
	status_changed_at: v.nullable(DateStringSchema),
});

const ConstructionManagerMaterialStatusHistoryDTOSchema = v.object({
	id: IdSchema,
	created_at: DateStringSchema,
	construction_site_id: IdSchema,
	material_id: IdSchema,
	material_name: RequiredTextSchema,
	material_type_id: IdSchema,
	material_type_name: RequiredTextSchema,
	status: MaterialStatusTypeSchema,
});

export const constructionManagerMaterialStatusCurrentFromDTO = (
	dto: ConstructionManagerMaterialStatusCurrentDTO,
): ConstructionManagerMaterialStatusCurrent => {
	const parsed = v.parse(
		ConstructionManagerMaterialStatusCurrentDTOSchema,
		dto,
	);

	return {
		...parsed,
		status_changed_at:
			parsed.status_changed_at === null
				? null
				: new Date(parsed.status_changed_at),
	};
};

export const constructionManagerMaterialStatusHistoryFromDTO = (
	dto: ConstructionManagerMaterialStatusHistoryDTO,
): ConstructionManagerMaterialStatusHistory => {
	const parsed = v.parse(
		ConstructionManagerMaterialStatusHistoryDTOSchema,
		dto,
	);

	return {
		...parsed,
		created_at: new Date(parsed.created_at),
	};
};
