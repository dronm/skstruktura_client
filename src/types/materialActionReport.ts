export type MaterialActionReportLevel =
	| "construction_site"
	| "material"
	| "document";

export interface MaterialActionReportReference {
	keys: {
		id: number;
	};
	descr: string;
}

export interface MaterialActionReportRow {
	key: string;
	row_type: MaterialActionReportLevel;
	construction_site_id: number;
	construction_site: MaterialActionReportReference;
	material_id?: number;
	material?: MaterialActionReportReference;
	recorder_type?: string;
	recorder_id?: number;
	document_date?: string;
	document_number?: string;
	caption: string;
	balance_start: number | null;
	income: number | null;
	outcome: number | null;
	balance_end: number | null;
	has_children: boolean;
	child_count: number;
}

export interface MaterialActionReportResponse {
	rows: MaterialActionReportRow[];
	total: number;
	generated_at: Date;
}

export interface MaterialActionReportRequest {
	dateFrom: Date;
	dateTo: Date;
	constructionSiteIds: number[];
	materialIds: number[];
	level: MaterialActionReportLevel;
	parentConstructionSiteId?: number;
	parentMaterialId?: number;
	from?: number;
	count?: number;
}
