import type {
	CollectionParams,
	CollectionResponse,
} from "@katren/vue-collection-lib";

import { concreteTypeApi } from "@/api/concreteType.gen";
import { downtimeReasonApi } from "@/api/downtimeReason.gen";
import { elevationApi } from "@/api/elevation.gen";
import { gridAxisApi } from "@/api/gridAxis.gen";
import { measureUnitApi } from "@/api/measureUnit.gen";
import { workApi } from "@/api/work.gen";

export interface ConstructionWorkLogOption {
	id: number;
	label: string;
	active: boolean;
}

export interface ConstructionWorkLogLookups {
	works: ConstructionWorkLogOption[];
	concreteTypes: ConstructionWorkLogOption[];
	measureUnits: ConstructionWorkLogOption[];
	letterAxes: ConstructionWorkLogOption[];
	numberAxes: ConstructionWorkLogOption[];
	elevations: ConstructionWorkLogOption[];
	downtimeReasons: ConstructionWorkLogOption[];
}

const loadAll = async <T>(
	list: (params?: CollectionParams) => Promise<CollectionResponse<T>>,
	params: CollectionParams = {},
): Promise<T[]> => {
	const rows: T[] = [];
	const count = 250;
	while (true) {
		const response = await list({
			...params,
			from: rows.length,
			count,
		});
		rows.push(...response.rows);
		if (
			response.rows.length === 0 ||
			rows.length >= response.agg.tot_count
		) {
			return rows;
		}
	}
};

const namedOptions = (
	rows: { id: number; name: string; is_active: boolean }[],
): ConstructionWorkLogOption[] => {
	return rows.map((row) => ({
		id: row.id,
		label: row.name,
		active: row.is_active,
	}));
};

export const loadConstructionWorkLogLookups =
	async (): Promise<ConstructionWorkLogLookups> => {
		const [
			works,
			concreteTypes,
			measureUnits,
			letterAxes,
			numberAxes,
			elevations,
			downtimeReasons,
		] = await Promise.all([
			loadAll((params) => workApi.list(params), {
				sorter: [{ f: "name", d: "a" }],
			}),
			loadAll((params) => concreteTypeApi.list(params), {
				sorter: [{ f: "name", d: "a" }],
			}),
			loadAll((params) => measureUnitApi.list(params), {
				sorter: [{ f: "name", d: "a" }],
			}),
			loadAll((params) => gridAxisApi.list(params), {
				filter: [
					{
						f: {
							kind: {
								o: "e",
								v: "letter",
							},
						},
					},
				],
				sorter: [
					{ f: "sort_order", d: "a" },
					{ f: "name", d: "a" },
					{ f: "id", d: "a" },
				],
			}),
			loadAll((params) => gridAxisApi.list(params), {
				filter: [
					{
						f: {
							kind: {
								o: "e",
								v: "number",
							},
						},
					},
				],
				sorter: [
					{ f: "sort_order", d: "a" },
					{ f: "name", d: "a" },
					{ f: "id", d: "a" },
				],
			}),
			loadAll((params) => elevationApi.list(params), {
				sorter: [{ f: "value_m", d: "a" }],
			}),
			loadAll((params) => downtimeReasonApi.list(params), {
				sorter: [{ f: "name", d: "a" }],
			}),
		]);
		return {
			works: namedOptions(works),
			concreteTypes: namedOptions(concreteTypes),
			measureUnits: namedOptions(measureUnits),
			letterAxes: namedOptions(letterAxes),
			numberAxes: namedOptions(numberAxes),
			elevations: elevations.map((row) => ({
				id: row.id,
				label: `${row.value_m > 0 ? "+" : ""}${row.value_m.toLocaleString("ru-RU")} м`,
				active: row.is_active,
			})),
			downtimeReasons: namedOptions(downtimeReasons),
		};
	};
