import type { MaterialBalanceRow } from "@/types/materialBalance";

export interface MaterialWorkbenchRow {
	materialTypeID: number;
	materialTypeName: string;
	materialID: number;
	materialName: string;
	measureUnitID: number;
	measureUnitName: string;
	balance: number;
}

export interface MaterialWorkbenchGroup {
	id: number;
	name: string;
	rows: MaterialWorkbenchRow[];
}

export interface MaterialRequestWorkbenchLine {
	quant: number | null;
	orderImportanceID: number | null;
}

export interface PendingMaterialRequest {
	id: number;
	version: number;
}

export interface MaterialRequestWorkspaceDraft {
	comment: string;
	lines: Record<number, MaterialRequestWorkbenchLine>;
	pendingRequest: PendingMaterialRequest | null;
}

export interface MaterialConsumptionWorkbenchLine {
	quant: number | null;
}

export interface MaterialConsumptionWorkspaceDraft {
	comment: string;
	lines: Record<number, MaterialConsumptionWorkbenchLine>;
}

export const materialBalanceRowToWorkbenchRow = (
	row: MaterialBalanceRow,
): MaterialWorkbenchRow => ({
	materialTypeID: row.material_type_id,
	materialTypeName: row.material_type.descr,
	materialID: row.material_id,
	materialName: row.material.descr,
	measureUnitID: row.measure_unit_id,
	measureUnitName: row.measure_unit.descr,
	balance: row.balance,
});
