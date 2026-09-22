import type { CollectionAgg } from "@katren/vue-collection-lib";

export interface SupplyManagerReference {
	keys: Record<string, unknown>;
	descr: string;
	dataType?: string;
}

export interface SupplyManagerIncomingRequestItemDTO {
	id: number;
	line_num: number;
	material_id: number;
	material: SupplyManagerReference;
	measure_unit_id: number;
	measure_unit: SupplyManagerReference;
	quant: number;
	required_date: string | null;
	order_importance_id: number;
	order_importance: SupplyManagerReference;
	status_id: number;
	status: SupplyManagerReference;
	supplier_id: number | null;
	supplier: SupplyManagerReference | null;
}

export interface SupplyManagerIncomingRequestItem extends Omit<
	SupplyManagerIncomingRequestItemDTO,
	"required_date"
> {
	required_date: Date | null;
}

export interface SupplyManagerIncomingRequestDTO {
	id: number;
	version: number;
	date: string;
	construction_site_id: number;
	construction_site: SupplyManagerReference;
	construction_manager_id: number;
	construction_manager: SupplyManagerReference;
	comment: string | null;
	status_id: number;
	status: SupplyManagerReference;
	items: SupplyManagerIncomingRequestItemDTO[];
}

export interface SupplyManagerIncomingRequest extends Omit<
	SupplyManagerIncomingRequestDTO,
	"date" | "items"
> {
	date: Date;
	items: SupplyManagerIncomingRequestItem[];
}

export interface MaterialRequestSupplierAssignmentHistoryItemDTO {
	id: number;
	line_num: number;
	material_request_supplier_assignment_id: number;
	material_request_item_id: number;
	supplier_id: number;
	supplier: SupplyManagerReference;
	material_request_id: number;
	request_date: string;
	construction_site_id: number;
	construction_site: SupplyManagerReference;
	material_id: number;
	material: SupplyManagerReference;
	measure_unit_id: number;
	measure_unit: SupplyManagerReference;
	quant: number;
	required_date: string | null;
	order_importance_id: number;
	order_importance: SupplyManagerReference;
}

export interface MaterialRequestSupplierAssignmentHistoryItem extends Omit<
	MaterialRequestSupplierAssignmentHistoryItemDTO,
	"request_date" | "required_date"
> {
	request_date: Date;
	required_date: Date | null;
}

export interface MaterialRequestSupplierAssignmentHistoryDTO {
	id: number;
	date: string;
	supply_manager_id: number;
	supply_manager: SupplyManagerReference;
	comment: string | null;
	version: number;
	items: MaterialRequestSupplierAssignmentHistoryItemDTO[];
}

export interface MaterialRequestSupplierAssignmentHistory extends Omit<
	MaterialRequestSupplierAssignmentHistoryDTO,
	"date" | "items"
> {
	date: Date;
	items: MaterialRequestSupplierAssignmentHistoryItem[];
}

export interface SupplyManagerCollectionResponse<T> {
	rows: T[];
	agg: CollectionAgg;
}

export interface SupplyManagerIncomingRequestParams {
	constructionSiteID?: number | null;
	dateFrom?: Date | null;
	dateTo?: Date | null;
	materialSearch?: string;
	orderImportanceID?: number | null;
	from?: number;
	count?: number;
}

export interface SupplyManagerAssignmentHistoryParams {
	constructionSiteID?: number | null;
	from?: number;
	count?: number;
}

export interface MaterialRequestSupplierAssignmentCreate {
	date: Date;
	comment: string | null;
	requests: Array<{
		id: number;
		version: number;
	}>;
	items: Array<{
		material_request_item_id: number;
		supplier_id: number;
	}>;
}
