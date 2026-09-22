import api from "@/api/http";
import {
	materialConsumptionDocumentApi,
	materialRequestDocumentApi,
	materialTransferDocumentApi,
} from "@/api/materialDocuments";
import {
	materialConsumptionDocumentFromDTO,
	materialRequestDocumentFromDTO,
	materialTransferDocumentFromDTO,
} from "@/schemas/materialDocuments";
import type { RoleId } from "@/types/enums/roleId";
import type {
	MaterialConsumptionDocument,
	MaterialRequestDocument,
	MaterialTransferDocument,
} from "@/types/materialDocuments";
import type { MaterialDocumentPrintKind } from "@/utils/materialDocumentPrint";

export type LoadedMaterialDocument =
	| {
			kind: "transfer";
			document: MaterialTransferDocument;
	  }
	| {
			kind: "consumption";
			document: MaterialConsumptionDocument;
	  }
	| {
			kind: "request";
			document: MaterialRequestDocument;
	  };

const scopedDocumentPath = (
	roleID: RoleId,
	kind: MaterialDocumentPrintKind,
	documentID: number,
): string => {
	const encodedID = encodeURIComponent(String(documentID));
	const resource =
		kind === "transfer"
			? "material-transfers"
			: kind === "consumption"
				? "material-consumptions"
				: "material-requests";

	if (roleID === "construction_site_manager") {
		return `/construction-manager/${resource}/${encodedID}`;
	}
	if (roleID === "supply_manager" && kind === "request") {
		return `/supply-manager/material-requests/${encodedID}`;
	}

	throw new Error("Печатная форма недоступна для текущей роли.");
};

const loadScopedDocument = async (
	roleID: RoleId,
	kind: MaterialDocumentPrintKind,
	documentID: number,
): Promise<LoadedMaterialDocument> => {
	const response = await api.get<unknown>(
		scopedDocumentPath(roleID, kind, documentID),
	);

	switch (kind) {
		case "transfer":
			return {
				kind,
				document: materialTransferDocumentFromDTO(
					response,
				),
			};
		case "consumption":
			return {
				kind,
				document: materialConsumptionDocumentFromDTO(
					response,
				),
			};
		case "request":
			return {
				kind,
				document: materialRequestDocumentFromDTO(
					response,
				),
			};
	}
};

export const loadMaterialDocumentForPrint = async (
	roleID: RoleId,
	kind: MaterialDocumentPrintKind,
	documentID: number,
): Promise<LoadedMaterialDocument> => {
	if (!Number.isInteger(documentID) || documentID <= 0) {
		throw new Error("Некорректный идентификатор документа.");
	}

	if (roleID !== "admin") {
		return await loadScopedDocument(roleID, kind, documentID);
	}

	switch (kind) {
		case "transfer":
			return {
				kind,
				document: await materialTransferDocumentApi.detail(
					{
						id: documentID,
					},
				),
			};
		case "consumption":
			return {
				kind,
				document: await materialConsumptionDocumentApi.detail(
					{
						id: documentID,
					},
				),
			};
		case "request":
			return {
				kind,
				document: await materialRequestDocumentApi.detail(
					{
						id: documentID,
					},
				),
			};
	}
};
