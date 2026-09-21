import api from "@/api/http";
import {
	materialBalanceConstructionSitesFromDTO,
	materialBalanceResponseFromDTO,
} from "@/schemas/materialBalance";
import type {
	MaterialBalanceConstructionSite,
	MaterialBalanceResponse,
} from "@/types/materialBalance";

const basePath = "/reports/material-balance";

export const materialBalanceApi = {
	constructionSites: async (): Promise<
		MaterialBalanceConstructionSite[]
	> => {
		const response = await api.get<unknown>(`${basePath}/sites`);

		return materialBalanceConstructionSitesFromDTO(response);
	},

	list: async (
		constructionSiteID: number,
	): Promise<MaterialBalanceResponse> => {
		const rows: MaterialBalanceResponse["rows"] = [];
		let from = 0;
		let total = 0;
		let generatedAt = new Date();

		do {
			const params = new URLSearchParams({
				construction_site_id:
					String(constructionSiteID),
				from: String(from),
				count: "5000",
			});
			const response = materialBalanceResponseFromDTO(
				await api.get<unknown>(
					`${basePath}?${params.toString()}`,
				),
			);

			rows.push(...response.rows);
			total = response.total;
			generatedAt = response.generated_at;
			from += response.rows.length;

			if (response.rows.length === 0) {
				break;
			}
		} while (from < total);

		return {
			rows,
			total,
			generated_at: generatedAt,
		};
	},
};
