import { defineCollection } from "@katren/vue-collection-lib";

import { gridAxisCollection as generatedGridAxisCollection } from "@/collections/gridAxis.gen";

export const gridAxisCollection = defineCollection({
	...generatedGridAxisCollection,
	defaultSorter: [
		{ f: "kind", d: "a" },
		{ f: "sort_order", d: "a" },
		{ f: "name", d: "a" },
		{ f: "id", d: "a" },
	],
	stateKey: "gridAxis-sort-order-grid",
});
