export interface InventoryValuationSettings {
	allow_negative_open_period: boolean;
	exclude_vat_from_cost: boolean;
	closed_through: Date | null;
	vat_basis_editable: boolean;
}

export interface InventoryValuationClosure {
	id: number;
	closed_through: Date;
	closed_at: Date;
	closed_by: number | null;
	reopened_at: Date | null;
	reopened_by: number | null;
}

export interface InventoryValuationState {
	settings: InventoryValuationSettings;
	pending_count: number;
	negative_count: number;
	current_amount: number | null;
	can_manage: boolean;
	closures: InventoryValuationClosure[];
	last_recalculated_at: Date;
}

export interface InventoryValuationSettingsUpdate {
	allow_negative_open_period?: boolean;
	exclude_vat_from_cost?: boolean;
}
