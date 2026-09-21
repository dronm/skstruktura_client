import type {
	CollectionParams,
	CollectionResponse,
} from "@katren/vue-collection-lib";

import { normalizeCollectionResponse } from "@/api/createCrudApi";
import api from "@/api/http";
import {
	materialBalanceConstructionSitesFromDTO,
	materialBalanceResponseFromDTO,
} from "@/schemas/materialBalance";
import { materialConsumptionListFromDTO } from "@/schemas/materialConsumptionList.gen";
import {
	materialConsumptionDocumentFromDTO,
	materialTransferDocumentFromDTO,
} from "@/schemas/materialDocuments";
import { materialRequestListFromDTO } from "@/schemas/materialRequestList.gen";
import { materialTransferListFromDTO } from "@/schemas/materialTransferList.gen";
import type {
	MaterialBalanceConstructionSite,
	MaterialBalanceResponse,
} from "@/types/materialBalance";
import type {
	MaterialConsumptionList,
	MaterialConsumptionListDTO,
} from "@/types/materialConsumptionList.gen";
import type {
	MaterialConsumptionDocument,
	MaterialConsumptionDocumentDTO,
	MaterialConsumptionDocumentSave,
	MaterialTransferDocument,
	MaterialTransferDocumentDTO,
	MaterialTransferDocumentSave,
} from "@/types/materialDocuments";
import type {
	MaterialRequestList,
	MaterialRequestListDTO,
} from "@/types/materialRequestList.gen";
import type {
	MaterialTransferList,
	MaterialTransferListDTO,
} from "@/types/materialTransferList.gen";

const basePath = "/construction-manager";

const materialConsumptionCreateBody = (
	document: MaterialConsumptionDocumentSave,
) => ({
	date: document.date,
	construction_site_id: document.construction_site_id,
	comment: document.comment,
	items: document.items.map((item) => ({
		material_id: item.material_id,
		measure_unit_id: item.measure_unit_id,
		quant: item.quant,
	})),
});

const materialTransferCreateBody = (
	document: MaterialTransferDocumentSave,
) => ({
	date: document.date,
	source_construction_site_id: document.source_construction_site_id,
	destination_construction_site_id:
		document.destination_construction_site_id,
	comment: document.comment,
	items: document.items.map((item) => ({
		material_id: item.material_id,
		measure_unit_id: item.measure_unit_id,
		quant: item.quant,
	})),
});

const loadRows = async (
	constructionSiteID: number,
): Promise<MaterialBalanceResponse> => {
	const rows: MaterialBalanceResponse["rows"] = [];
	let from = 0;
	let total = 0;
	let generatedAt = new Date();

	do {
		const params = new URLSearchParams({
			construction_site_id: String(constructionSiteID),
			from: String(from),
			count: "5000",
		});
		const response = materialBalanceResponseFromDTO(
			await api.get<unknown>(
				`${basePath}/materials?${params.toString()}`,
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
};

export const constructionManagerWorkspaceApi = {
	constructionSites: async (): Promise<
		MaterialBalanceConstructionSite[]
	> => {
		const response = await api.get<unknown>(`${basePath}/sites`);

		return materialBalanceConstructionSitesFromDTO(response);
	},

	transferDestinations: async (): Promise<
		MaterialBalanceConstructionSite[]
	> => {
		const response = await api.get<unknown>(
			`${basePath}/transfer-destinations`,
		);

		return materialBalanceConstructionSitesFromDTO(response);
	},

	materials: loadRows,

	materialRequests: async (
		constructionSiteID: number,
		params: CollectionParams = {},
	): Promise<CollectionResponse<MaterialRequestList>> => {
		const response =
			normalizeCollectionResponse<MaterialRequestListDTO>(
				await api.get<unknown>(
					`${basePath}/material-requests`,
					{
						construction_site_id:
							String(
								constructionSiteID,
							),
						from: String(params.from ?? 0),
						count: String(
							params.count ?? 30,
						),
					},
				),
			);

		return {
			rows: response.rows.map(materialRequestListFromDTO),
			agg: response.agg,
		};
	},

	materialConsumptions: async (
		constructionSiteID: number,
		params: CollectionParams = {},
	): Promise<CollectionResponse<MaterialConsumptionList>> => {
		const response =
			normalizeCollectionResponse<MaterialConsumptionListDTO>(
				await api.get<unknown>(
					`${basePath}/material-consumptions`,
					{
						construction_site_id:
							String(
								constructionSiteID,
							),
						from: String(params.from ?? 0),
						count: String(
							params.count ?? 30,
						),
					},
				),
			);

		return {
			rows: response.rows.map(materialConsumptionListFromDTO),
			agg: response.agg,
		};
	},

	materialTransfers: async (
		constructionSiteID: number,
		params: CollectionParams = {},
	): Promise<CollectionResponse<MaterialTransferList>> => {
		const response =
			normalizeCollectionResponse<MaterialTransferListDTO>(
				await api.get<unknown>(
					`${basePath}/material-transfers`,
					{
						construction_site_id:
							String(
								constructionSiteID,
							),
						from: String(params.from ?? 0),
						count: String(
							params.count ?? 30,
						),
					},
				),
			);

		return {
			rows: response.rows.map(materialTransferListFromDTO),
			agg: response.agg,
		};
	},

	createMaterialConsumption: async (
		document: MaterialConsumptionDocumentSave,
	): Promise<MaterialConsumptionDocument> => {
		const response = await api.post<MaterialConsumptionDocumentDTO>(
			`${basePath}/material-consumptions`,
			materialConsumptionCreateBody(document),
		);

		return materialConsumptionDocumentFromDTO(response);
	},

	createMaterialTransfer: async (
		document: MaterialTransferDocumentSave,
	): Promise<MaterialTransferDocument> => {
		const response = await api.post<MaterialTransferDocumentDTO>(
			`${basePath}/material-transfers`,
			materialTransferCreateBody(document),
		);

		return materialTransferDocumentFromDTO(response);
	},
};
