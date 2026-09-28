import api from "@/api/http";
import { inventoryValuationStateFromDTO } from "@/schemas/inventoryValuation";
import type {
	InventoryValuationSettingsUpdate,
	InventoryValuationState,
} from "@/types/inventoryValuation";

const basePath = "/inventory-valuation";

const formatDate = (value: Date): string => {
	const year = value.getFullYear();
	const month = String(value.getMonth() + 1).padStart(2, "0");
	const day = String(value.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

export const inventoryValuationApi = {
	state: async (): Promise<InventoryValuationState> => {
		return inventoryValuationStateFromDTO(
			await api.get<unknown>(basePath),
		);
	},

	updateSettings: async (
		input: InventoryValuationSettingsUpdate,
	): Promise<InventoryValuationState> => {
		return inventoryValuationStateFromDTO(
			await api.put<unknown>(`${basePath}/settings`, input),
		);
	},

	recalculate: async (): Promise<InventoryValuationState> => {
		return inventoryValuationStateFromDTO(
			await api.post<unknown>(`${basePath}/recalculate`),
		);
	},

	close: async (closedThrough: Date): Promise<InventoryValuationState> => {
		return inventoryValuationStateFromDTO(
			await api.post<unknown>(`${basePath}/close`, {
				closed_through: formatDate(closedThrough),
			}),
		);
	},

	reopen: async (): Promise<InventoryValuationState> => {
		return inventoryValuationStateFromDTO(
			await api.post<unknown>(`${basePath}/reopen`),
		);
	},
};
