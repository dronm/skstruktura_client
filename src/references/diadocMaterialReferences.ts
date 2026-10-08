import { measureUnitReference } from "@/references/inventoryReferences";

export const diadocMeasureUnitReference = {
	...measureUnitReference,
	create: {
		mode: "page" as const,
		route: { name: "measureUnitCreate" },
		prefill: (text: string) => ({ name: text.trim() }),
	},
};
