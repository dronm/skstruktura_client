import type {
	CollectionParams,
	CollectionResponse,
} from "@katren/vue-collection-lib";
import { buildingElementApi } from "@/api/buildingElement.gen";
import { supplierApi } from "@/api/supplier.gen";
import { concreteTypeApi } from "@/api/concreteType.gen";
import { gridAxisApi } from "@/api/gridAxis.gen";
import { elevationApi } from "@/api/elevation.gen";
export interface ConcreteWorkLogOption {
	id: number;
	label: string;
	active: boolean;
	strengthClass?: string | null;
}
export interface ConcreteWorkLogLookups {
	buildingElements: ConcreteWorkLogOption[];
	suppliers: ConcreteWorkLogOption[];
	concreteTypes: ConcreteWorkLogOption[];
	letterAxes: ConcreteWorkLogOption[];
	numberAxes: ConcreteWorkLogOption[];
	elevations: ConcreteWorkLogOption[];
}
const loadAll = async <T>(
	list: (params?: CollectionParams) => Promise<CollectionResponse<T>>,
	params: CollectionParams = {},
): Promise<T[]> => {
	const rows: T[] = [];
	while (true) {
		const response = await list({
			...params,
			from: rows.length,
			count: 250,
		});
		rows.push(...response.rows);
		if (
			response.rows.length === 0 ||
			rows.length >= response.agg.tot_count
		)
			return rows;
	}
};
const namedOptions = (
	rows: {
		id: number;
		name: string;
		is_active: boolean;
		strength_class?: string | null;
	}[],
): ConcreteWorkLogOption[] =>
	rows.map((row) => ({
		id: row.id,
		label: row.name,
		active: row.is_active,
		strengthClass: row.strength_class,
	}));
export const loadConcreteWorkLogLookups =
	async (): Promise<ConcreteWorkLogLookups> => {
		const sorter: CollectionParams["sorter"] = [
			{ f: "name", d: "a" },
			{ f: "id", d: "a" },
		];
		const axes = (kind: string) =>
			loadAll((params) => gridAxisApi.list(params), {
				filter: [{ f: { kind: { o: "e", v: kind } } }],
				sorter: [
					{ f: "sort_order", d: "a" },
					{ f: "name", d: "a" },
					{ f: "id", d: "a" },
				],
			});
		const [
			buildingElements,
			suppliers,
			concreteTypes,
			letterAxes,
			numberAxes,
			elevations,
		] = await Promise.all([
			loadAll((params) => buildingElementApi.list(params), {
				sorter,
			}),
			loadAll((params) => supplierApi.list(params), {
				sorter,
			}),
			loadAll((params) => concreteTypeApi.list(params), {
				sorter,
			}),
			axes("letter"),
			axes("number"),
			loadAll((params) => elevationApi.list(params), {
				sorter: [
					{ f: "value_m", d: "a" },
					{ f: "id", d: "a" },
				],
			}),
		]);
		return {
			buildingElements: namedOptions(buildingElements),
			suppliers: namedOptions(suppliers),
			concreteTypes: namedOptions(concreteTypes),
			letterAxes: namedOptions(letterAxes),
			numberAxes: namedOptions(numberAxes),
			elevations: elevations.map((row) => ({
				id: row.id,
				label: `${row.value_m > 0 ? "+" : ""}${row.value_m.toLocaleString("ru-RU")} м`,
				active: row.is_active,
			})),
		};
	};
