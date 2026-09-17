export const VAT_PERCENT_VALUES = [0, 22] as const;

export type VatPercent = (typeof VAT_PERCENT_VALUES)[number];

export const roundMoney = (value: number): number => {
	return Math.round((value + Number.EPSILON) * 100) / 100;
};

export const normalizeVatPercent = (value: unknown): VatPercent => {
	const numericValue = typeof value === "number" ? value : Number(value);
	return VAT_PERCENT_VALUES.includes(numericValue as VatPercent)
		? (numericValue as VatPercent)
		: 0;
};

export const calculateIncludedVat = (
	amount: number,
	vatPercent: number,
): number => {
	if (
		!Number.isFinite(amount) ||
		!Number.isFinite(vatPercent) ||
		amount <= 0 ||
		vatPercent <= 0
	) {
		return 0;
	}

	return roundMoney((amount * vatPercent) / (100 + vatPercent));
};
