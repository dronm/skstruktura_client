import type { CollectionResponse } from "@katren/vue-collection-lib";

import { normalizeCollectionResponse } from "@/api/createCrudApi";
import api from "@/api/http";
import {
	materialRequestSupplierAssignmentHistoryFromDTO,
	supplyManagerIncomingRequestFromDTO,
} from "@/schemas/supplyManagerWorkspace";
import { materialBalanceConstructionSitesFromDTO } from "@/schemas/materialBalance";
import type { MaterialBalanceConstructionSite } from "@/types/materialBalance";
import type {
	MaterialRequestSupplierAssignmentCreate,
	MaterialRequestSupplierAssignmentHistory,
	MaterialRequestSupplierAssignmentHistoryDTO,
	SupplyManagerAssignmentHistoryParams,
	SupplyManagerIncomingRequest,
	SupplyManagerIncomingRequestDTO,
	SupplyManagerIncomingRequestParams,
} from "@/types/supplyManagerWorkspace";

const basePath = "/supply-manager";

const optionalDate = (
	value: Date | null | undefined,
	endOfDay = false,
): string | undefined => {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
		return undefined;
	}

	const normalized = new Date(value);
	normalized.setHours(
		endOfDay ? 23 : 0,
		endOfDay ? 59 : 0,
		endOfDay ? 59 : 0,
		endOfDay ? 999 : 0,
	);
	return normalized.toISOString();
};

const compactQuery = (
	query: Record<string, string | undefined>,
): Record<string, string> => {
	return Object.fromEntries(
		Object.entries(query).filter(
			(entry): entry is [string, string] =>
				typeof entry[1] === "string" &&
				entry[1].length > 0,
		),
	);
};

const assignmentCreateBody = (
	model: MaterialRequestSupplierAssignmentCreate,
) => ({
	date: model.date.toISOString(),
	comment: model.comment,
	requests: model.requests,
	items: model.items,
});

export const supplyManagerWorkspaceApi = {
	constructionSites: async (): Promise<
		MaterialBalanceConstructionSite[]
	> => {
		return materialBalanceConstructionSitesFromDTO(
			await api.get<unknown>(`${basePath}/sites`),
		);
	},

	incomingRequests: async (
		params: SupplyManagerIncomingRequestParams = {},
	): Promise<CollectionResponse<SupplyManagerIncomingRequest>> => {
		const response =
			normalizeCollectionResponse<SupplyManagerIncomingRequestDTO>(
				await api.get<unknown>(
					`${basePath}/material-requests`,
					compactQuery({
						construction_site_id:
							params.constructionSiteID ===
								null ||
							params.constructionSiteID ===
								undefined
								? undefined
								: String(
										params.constructionSiteID,
									),
						date_from: optionalDate(
							params.dateFrom,
						),
						date_to: optionalDate(
							params.dateTo,
							true,
						),
						material_search:
							params.materialSearch?.trim() ||
							undefined,
						order_importance_id:
							params.orderImportanceID ===
								null ||
							params.orderImportanceID ===
								undefined
								? undefined
								: String(
										params.orderImportanceID,
									),
						from: String(params.from ?? 0),
						count: String(
							params.count ?? 50,
						),
					}),
				),
			);

		return {
			rows: response.rows.map(
				supplyManagerIncomingRequestFromDTO,
			),
			agg: response.agg,
		};
	},

	createAssignment: async (
		model: MaterialRequestSupplierAssignmentCreate,
	): Promise<MaterialRequestSupplierAssignmentHistory> => {
		return materialRequestSupplierAssignmentHistoryFromDTO(
			await api.post<unknown>(
				`${basePath}/material-request-supplier-assignments`,
				assignmentCreateBody(model),
			),
		);
	},

	assignmentHistory: async (
		params: SupplyManagerAssignmentHistoryParams = {},
	): Promise<
		CollectionResponse<MaterialRequestSupplierAssignmentHistory>
	> => {
		const response =
			normalizeCollectionResponse<MaterialRequestSupplierAssignmentHistoryDTO>(
				await api.get<unknown>(
					`${basePath}/material-request-supplier-assignments`,
					compactQuery({
						construction_site_id:
							params.constructionSiteID ===
								null ||
							params.constructionSiteID ===
								undefined
								? undefined
								: String(
										params.constructionSiteID,
									),
						from: String(params.from ?? 0),
						count: String(
							params.count ?? 30,
						),
					}),
				),
			);

		return {
			rows: response.rows.map(
				materialRequestSupplierAssignmentHistoryFromDTO,
			),
			agg: response.agg,
		};
	},
};
