export interface CollectionTotalDefinition<TItem extends object> {
	field: Extract<keyof TItem, string>;
	label: string;
	fractionDigits?: number;
}
