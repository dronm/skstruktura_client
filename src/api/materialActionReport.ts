import api from "@/api/http";
import { materialActionReportResponseFromDTO } from "@/schemas/materialActionReport";
import type {
	MaterialActionReportRequest,
	MaterialActionReportResponse,
} from "@/types/materialActionReport";

const appendIDs = (
	params: URLSearchParams,
	name: string,
	values: number[],
): void => {
	if (values.length > 0) {
		params.set(name, values.join(","));
	}
};

export const materialActionReportApi = {
	list: async (
		request: MaterialActionReportRequest,
	): Promise<MaterialActionReportResponse> => {
		const params = new URLSearchParams({
			date_from: request.dateFrom.toISOString(),
			date_to: request.dateTo.toISOString(),
			level: request.level,
			from: String(request.from ?? 0),
			count: String(request.count ?? 1000),
		});

		appendIDs(
			params,
			"construction_site_ids",
			request.constructionSiteIds,
		);
		appendIDs(params, "material_ids", request.materialIds);

		if (request.parentConstructionSiteId !== undefined) {
			params.set(
				"parent_construction_site_id",
				String(request.parentConstructionSiteId),
			);
		}
		if (request.parentMaterialId !== undefined) {
			params.set(
				"parent_material_id",
				String(request.parentMaterialId),
			);
		}

		const response = await api.get<unknown>(
			`/reports/material-actions?${params.toString()}`,
		);
		return materialActionReportResponseFromDTO(response);
	},
};
