import type { RouteLocationRaw, Router } from "vue-router";

export type MaterialDocumentPrintKind = "transfer" | "consumption" | "request";

const routeNames: Record<MaterialDocumentPrintKind, string> = {
	transfer: "materialTransferPrint",
	consumption: "materialConsumptionPrint",
	request: "materialRequestPrint",
};

export const materialDocumentPrintRoute = (
	kind: MaterialDocumentPrintKind,
	documentID: number,
): RouteLocationRaw => ({
	name: routeNames[kind],
	params: {
		id: String(documentID),
	},
});

export const openMaterialDocumentPrint = (
	router: Router,
	kind: MaterialDocumentPrintKind,
	documentID: number,
): void => {
	if (!Number.isInteger(documentID) || documentID <= 0) {
		return;
	}

	const href = router.resolve(
		materialDocumentPrintRoute(kind, documentID),
	).href;
	window.open(href, "_blank", "noopener,noreferrer");
};
