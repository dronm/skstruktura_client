export const formatReference = (value: unknown): string => {
	if (typeof value === "object" && value !== null && "descr" in value) {
		return String(value.descr ?? "");
	}

	return "";
};
