import { buildingElementApi } from "@/api/buildingElement.gen";
export interface ConcreteHeatingLogOption {
	id: number;
	label: string;
	active: boolean;
}
export interface ConcreteHeatingLogLookups {
	buildingElements: ConcreteHeatingLogOption[];
}
export const loadConcreteHeatingLogLookups =
	async (): Promise<ConcreteHeatingLogLookups> => {
		const buildingElements: ConcreteHeatingLogOption[] = [];
		while (true) {
			const response = await buildingElementApi.list({
				from: buildingElements.length,
				count: 250,
				sorter: [
					{ f: "name", d: "a" },
					{ f: "id", d: "a" },
				],
			});
			buildingElements.push(
				...response.rows.map((row) => ({
					id: row.id,
					label: row.name,
					active: row.is_active,
				})),
			);
			if (
				response.rows.length === 0 ||
				buildingElements.length >=
					response.agg.tot_count
			)
				return { buildingElements };
		}
	};
