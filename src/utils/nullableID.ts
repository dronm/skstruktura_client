export const normalizeNullableID = (value: unknown): number | null => {
	const id = typeof value === "number" ? value : Number(value);

	return Number.isInteger(id) && id > 0 ? id : null;
};
