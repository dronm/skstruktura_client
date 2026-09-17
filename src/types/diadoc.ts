export interface DiadocRef {
	keys: {
		id: number;
	};
	descr: string;
}

export type DiadocDocumentStatus =
	| "received"
	| "needs_matching"
	| "ready"
	| "imported"
	| "ignored"
	| "failed"
	| "revoked"
	| "superseded";

export interface DiadocDocumentListRowDTO {
	id: number;
	version: number;
	status: DiadocDocumentStatus;
	document_number: string;
	document_date?: string | null;
	sender_name: string;
	sender_inn: string;
	sender_kpp: string;
	supplier_id?: number | null;
	supplier?: DiadocRef | null;
	construction_site_id?: number | null;
	construction_site?: DiadocRef | null;
	receipt_number: string;
	receipt_date?: string | null;
	line_count: number;
	amount_without_vat: string;
	vat_amount: string;
	amount_with_vat: string;
	missing_count: number;
	last_error?: string;
	material_receipt_id?: number | null;
	updated_at: string;
}

export interface DiadocDocumentListRow extends Omit<
	DiadocDocumentListRowDTO,
	"document_date" | "receipt_date" | "updated_at"
> {
	document_date: Date | null;
	receipt_date: Date | null;
	updated_at: Date;
}

export interface DiadocDocumentListResponseDTO {
	rows: DiadocDocumentListRowDTO[];
	total: number;
}

export interface DiadocReadinessIssue {
	code: string;
	field: string;
	item_id?: number;
}

export interface DiadocReadiness {
	ready: boolean;
	missing: DiadocReadinessIssue[];
	warnings: string[];
}

export interface DiadocTotals {
	line_count: number;
	amount_without_vat: string;
	vat_amount: string;
	amount_with_vat: string;
}

export interface DiadocDocumentTotals {
	document: DiadocTotals;
	import: DiadocTotals;
	excluded: DiadocTotals;
}

export interface DiadocDocumentItemDTO {
	id: number;
	line_num: number;
	source_product_code?: string;
	source_article?: string;
	source_gtin?: string;
	source_name: string;
	source_okei_code?: string;
	source_unit_name?: string;
	source_quant: string;
	source_price: string;
	source_amount_without_vat: string;
	source_vat_percent: string;
	source_vat_amount: string;
	source_amount_with_vat: string;
	construction_site_id?: number | null;
	construction_site?: DiadocRef | null;
	material_id?: number | null;
	material?: DiadocRef | null;
	measure_unit_id?: number | null;
	measure_unit?: DiadocRef | null;
	conversion_factor?: string | null;
	import_quant?: string | null;
	import_price?: string | null;
	import_amount?: string | null;
	import_vat_percent?: string | null;
	import_vat_amount?: string | null;
	is_excluded: boolean;
	mapping_source?: string;
	last_error?: string;
	issues: string[];
}

export interface DiadocDocumentItem extends Omit<
	DiadocDocumentItemDTO,
	"material_id" | "measure_unit_id" | "conversion_factor"
> {
	material_id: number;
	measure_unit_id: number;
	conversion_factor: number | null;
}

export interface DiadocDocumentDetailDTO {
	id: number;
	version: number;
	status: DiadocDocumentStatus;
	message_id: string;
	entity_id: string;
	document_number: string;
	document_date?: string | null;
	document_function?: string;
	document_version?: string;
	sender_box_id?: string;
	sender_name: string;
	sender_inn: string;
	sender_kpp: string;
	supplier_id?: number | null;
	supplier?: DiadocRef | null;
	construction_site_id?: number | null;
	construction_site?: DiadocRef | null;
	receipt_number: string;
	receipt_date?: string | null;
	receipt_comment: string;
	amount_without_vat: string;
	vat_amount: string;
	amount_with_vat: string;
	totals: DiadocDocumentTotals;
	material_receipt_id?: number | null;
	ignored_reason?: string;
	ignored_at?: string | null;
	ignored_by?: string;
	imported_at?: string | null;
	imported_by?: string;
	last_error?: string;
	readiness: DiadocReadiness;
	items: DiadocDocumentItemDTO[];
	created_at: string;
	updated_at: string;
}

export interface DiadocDocumentDetail extends Omit<
	DiadocDocumentDetailDTO,
	| "document_date"
	| "receipt_date"
	| "ignored_at"
	| "imported_at"
	| "created_at"
	| "updated_at"
	| "supplier_id"
	| "construction_site_id"
	| "items"
> {
	document_date: Date | null;
	receipt_date: Date | null;
	ignored_at: Date | null;
	imported_at: Date | null;
	created_at: Date;
	updated_at: Date;
	supplier_id: number;
	construction_site_id: number;
	items: DiadocDocumentItem[];
}

export interface DiadocResolutionRequest {
	version: number;
	supplier_id: number;
	construction_site_id: number | null;
	receipt_number: string;
	receipt_date: Date;
	receipt_comment: string;
	remember_supplier_match: boolean;
	items: Array<{
		id: number;
		material_id: number;
		construction_site_id: number | null;
		conversion_factor: string;
		remember_material_match: boolean;
	}>;
}

export interface DiadocImportResponse {
	document_id: number;
	material_receipt_id: number;
	status: "imported";
}

export interface DiadocStateDTO {
	configured: boolean;
	authorized: boolean;
	box_id?: string;
	enabled: boolean;
	event_timestamp_from: string;
	has_cursor: boolean;
	last_sync_started_at?: string | null;
	last_sync_finished_at?: string | null;
	last_sync_error?: string;
	version: number;
	buffer_counts: Record<string, number>;
}

export interface DiadocState extends Omit<
	DiadocStateDTO,
	| "event_timestamp_from"
	| "last_sync_started_at"
	| "last_sync_finished_at"
> {
	event_timestamp_from: Date;
	last_sync_started_at: Date | null;
	last_sync_finished_at: Date | null;
}
