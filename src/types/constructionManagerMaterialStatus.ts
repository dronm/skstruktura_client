import type { MaterialStatusType } from "@/types/enums/materialStatusType.gen";

export interface ConstructionManagerMaterialStatusCurrentDTO {
	material_id: number;
	material_name: string;
	material_type_id: number;
	material_type_name: string;
	status: MaterialStatusType;
	status_record_id: number | null;
	status_changed_at: string | null;
}

export interface ConstructionManagerMaterialStatusCurrent {
	material_id: number;
	material_name: string;
	material_type_id: number;
	material_type_name: string;
	status: MaterialStatusType;
	status_record_id: number | null;
	status_changed_at: Date | null;
}

export interface ConstructionManagerMaterialStatusHistoryDTO {
	id: number;
	created_at: string;
	construction_site_id: number;
	material_id: number;
	material_name: string;
	material_type_id: number;
	material_type_name: string;
	status: MaterialStatusType;
}

export interface ConstructionManagerMaterialStatusHistory {
	id: number;
	created_at: Date;
	construction_site_id: number;
	material_id: number;
	material_name: string;
	material_type_id: number;
	material_type_name: string;
	status: MaterialStatusType;
}

export interface ConstructionManagerMaterialStatusChange {
	construction_site_id: number;
	material_id: number;
	created_at: Date;
	expected_status_record_id: number | null;
	expected_status: MaterialStatusType;
	target_status: MaterialStatusType;
}
