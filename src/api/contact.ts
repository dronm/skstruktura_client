import api from "@/api/http";
import { contactApi as contactCrudApi } from "@/api/contact.gen";
import type { ContactCreatePayload } from "@/types/contact";
import type { ContactNew } from "@/types/contact.gen";

export interface ContactAutocompleteItem {
	keys: {
		id: number;
	};
	descr: string;
}

const autocomplete = async (
	query: string,
	limit = 20,
): Promise<ContactAutocompleteItem[]> => {
	return await api.get<ContactAutocompleteItem[]>(
		"/contacts/autocomplete",
		{
			q: query.trim() || undefined,
			limit,
		},
	);
};

const create = async (model: ContactCreatePayload) => {
	// The endpoint accepts omitted nullable create fields; the generated type does not.
	return await contactCrudApi.create(model as ContactNew);
};

export const contactApi = {
	...contactCrudApi,
	create,
	autocomplete,
};
