import type {
	CollectionParams,
	CollectionResponse,
} from "@katren/vue-collection-lib";

import api from "@/api/http";
import type {
	DiadocDocumentDetail,
	DiadocDocumentDetailDTO,
	DiadocDocumentListResponseDTO,
	DiadocDocumentListRow,
	DiadocDocumentListRowDTO,
	DiadocImportResponse,
	DiadocResolutionRequest,
	DiadocState,
	DiadocStateDTO,
} from "@/types/diadoc";

export interface DiadocDocumentListFilter {
	status: string;
	search: string;
}

const dateValue = (value?: string | null): Date | null => {
	if (!value) {
		return null;
	}

	const result = new Date(value);
	return Number.isNaN(result.getTime()) ? null : result;
};

const fromListDTO = (dto: DiadocDocumentListRowDTO): DiadocDocumentListRow => ({
	...dto,
	document_date: dateValue(dto.document_date),
	receipt_date: dateValue(dto.receipt_date),
	updated_at: dateValue(dto.updated_at) ?? new Date(0),
});

const fromDetailDTO = (dto: DiadocDocumentDetailDTO): DiadocDocumentDetail => ({
	...dto,
	document_date: dateValue(dto.document_date),
	receipt_date: dateValue(dto.receipt_date),
	ignored_at: dateValue(dto.ignored_at),
	imported_at: dateValue(dto.imported_at),
	created_at: dateValue(dto.created_at) ?? new Date(0),
	updated_at: dateValue(dto.updated_at) ?? new Date(0),
	supplier_id: dto.supplier_id ?? 0,
	construction_site_id: dto.construction_site_id ?? 0,
	items: dto.items.map((item) => ({
		...item,
		material_id: item.material_id ?? 0,
		measure_unit_id: item.measure_unit_id ?? 0,
		conversion_factor: item.conversion_factor
			? Number(item.conversion_factor)
			: 1,
	})),
});

const fromStateDTO = (dto: DiadocStateDTO): DiadocState => ({
	...dto,
	event_timestamp_from: dateValue(dto.event_timestamp_from) ?? new Date(),
	last_sync_started_at: dateValue(dto.last_sync_started_at),
	last_sync_finished_at: dateValue(dto.last_sync_finished_at),
});

export const listDiadocDocuments = async (
	filter: DiadocDocumentListFilter,
	params: CollectionParams = {},
): Promise<CollectionResponse<DiadocDocumentListRow>> => {
	const response = await api.get<DiadocDocumentListResponseDTO>(
		"/diadoc/documents",
		{
			status: filter.status || "active",
			search: filter.search.trim() || undefined,
			from: params.from ?? 0,
			count: params.count ?? 30,
		},
	);

	return {
		rows: response.rows.map(fromListDTO),
		agg: {
			tot_count: response.total,
		},
	};
};

export const getDiadocDocument = async (
	id: number,
): Promise<DiadocDocumentDetail> => {
	const response = await api.get<DiadocDocumentDetailDTO>(
		`/diadoc/documents/${id}`,
	);
	return fromDetailDTO(response);
};

export const resolveDiadocDocument = async (
	id: number,
	request: DiadocResolutionRequest,
): Promise<DiadocDocumentDetail> => {
	const response = await api.put<DiadocDocumentDetailDTO>(
		`/diadoc/documents/${id}/resolution`,
		request,
	);
	return fromDetailDTO(response);
};

export const excludeDiadocItem = async (
	documentId: number,
	itemId: number,
	version: number,
): Promise<DiadocDocumentDetail> => {
	const response = await api.post<DiadocDocumentDetailDTO>(
		`/diadoc/documents/${documentId}/items/${itemId}/exclude`,
		{ version },
	);
	return fromDetailDTO(response);
};

export const restoreDiadocItem = async (
	documentId: number,
	itemId: number,
	version: number,
): Promise<DiadocDocumentDetail> => {
	const response = await api.post<DiadocDocumentDetailDTO>(
		`/diadoc/documents/${documentId}/items/${itemId}/restore`,
		{ version },
	);
	return fromDetailDTO(response);
};

export const ignoreDiadocDocument = async (
	id: number,
	version: number,
	reason = "",
): Promise<DiadocDocumentDetail> => {
	const response = await api.delete<DiadocDocumentDetailDTO>(
		`/diadoc/documents/${id}`,
		{ version, reason },
	);
	return fromDetailDTO(response);
};

export const restoreDiadocDocument = async (
	id: number,
	version: number,
): Promise<DiadocDocumentDetail> => {
	const response = await api.post<DiadocDocumentDetailDTO>(
		`/diadoc/documents/${id}/restore`,
		{ version },
	);
	return fromDetailDTO(response);
};

export const retryDiadocDocument = async (
	id: number,
	version: number,
): Promise<DiadocDocumentDetail> => {
	const response = await api.post<DiadocDocumentDetailDTO>(
		`/diadoc/documents/${id}/retry`,
		{ version },
	);
	return fromDetailDTO(response);
};

export const importDiadocDocument = (
	id: number,
	version: number,
): Promise<DiadocImportResponse> => {
	return api.post<DiadocImportResponse>(
		`/diadoc/documents/${id}/import`,
		{ version },
	);
};

export const getDiadocState = async (): Promise<DiadocState> => {
	const response = await api.get<DiadocStateDTO>("/diadoc/state");
	return fromStateDTO(response);
};

export const updateDiadocState = async (
	version: number,
	enabled: boolean,
): Promise<DiadocState> => {
	const response = await api.patch<DiadocStateDTO>("/diadoc/state", {
		version,
		enabled,
	});
	return fromStateDTO(response);
};

export const replayDiadocEvents = async (
	version: number,
	eventTimestampFrom: Date,
	restoreIgnored: boolean,
	retryFailed: boolean,
): Promise<DiadocState> => {
	const response = await api.post<DiadocStateDTO>(
		"/diadoc/state/replay",
		{
			version,
			event_timestamp_from: eventTimestampFrom,
			restore_ignored: restoreIgnored,
			retry_failed: retryFailed,
		},
	);
	return fromStateDTO(response);
};

export const syncDiadoc = (): Promise<Record<string, unknown>> => {
	return api.post<Record<string, unknown>>("/diadoc/sync");
};
