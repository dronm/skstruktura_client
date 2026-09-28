import * as v from "valibot";

import { IntSchema, NumberSchema, RequiredTextSchema } from "@/schemas/common";
import type {
	InventoryValuationClosure,
	InventoryValuationState,
} from "@/types/inventoryValuation";

const NullableIntSchema = v.nullable(IntSchema);
const NullableTextSchema = v.nullable(RequiredTextSchema);

const InventoryValuationStateSchema = v.object({
	settings: v.object({
		allow_negative_open_period: v.boolean(),
		exclude_vat_from_cost: v.boolean(),
		closed_through: NullableTextSchema,
		vat_basis_editable: v.boolean(),
	}),
	pending_count: IntSchema,
	negative_count: IntSchema,
	current_amount: v.nullable(NumberSchema),
	can_manage: v.boolean(),
	closures: v.array(
		v.object({
			id: IntSchema,
			closed_through: RequiredTextSchema,
			closed_at: RequiredTextSchema,
			closed_by: NullableIntSchema,
			reopened_at: NullableTextSchema,
			reopened_by: NullableIntSchema,
		}),
	),
	last_recalculated_at: RequiredTextSchema,
});

export const inventoryValuationStateFromDTO = (
	dto: unknown,
): InventoryValuationState => {
	const parsed = v.parse(InventoryValuationStateSchema, dto);

	return {
		settings: {
			allow_negative_open_period:
				parsed.settings.allow_negative_open_period,
			exclude_vat_from_cost: parsed.settings.exclude_vat_from_cost,
			closed_through:
				parsed.settings.closed_through === null
					? null
					: new Date(parsed.settings.closed_through),
			vat_basis_editable: parsed.settings.vat_basis_editable,
		},
		pending_count: parsed.pending_count,
		negative_count: parsed.negative_count,
		current_amount: parsed.current_amount,
		can_manage: parsed.can_manage,
		closures: parsed.closures.map(
			(item): InventoryValuationClosure => ({
				id: item.id,
				closed_through: new Date(item.closed_through),
				closed_at: new Date(item.closed_at),
				closed_by: item.closed_by,
				reopened_at:
					item.reopened_at === null
						? null
						: new Date(item.reopened_at),
				reopened_by: item.reopened_by,
			}),
		),
		last_recalculated_at: new Date(parsed.last_recalculated_at),
	};
};
