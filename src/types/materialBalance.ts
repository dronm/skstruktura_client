export interface MaterialBalanceReference {
	keys: {
		id: number;
	};
	descr: string;
	dataType?: string;
}

export interface MaterialBalanceConstructionSite {
	id: number;
	name: string;
}

export interface MaterialBalanceRow {
	material_type_id: number;
	material_type: MaterialBalanceReference;
	material_id: number;
	material: MaterialBalanceReference;
	measure_unit_id: number;
	measure_unit: MaterialBalanceReference;
	balance: number;
}

export interface MaterialBalanceResponse {
	rows: MaterialBalanceRow[];
	total: number;
	generated_at: Date;
}
