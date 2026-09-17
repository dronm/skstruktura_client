import {
	defineCrudReference,
	type CollectionParams,
	type CollectionResponse,
} from "@katren/vue-collection-lib";

import { contactApi } from "@/api/contact";
import type { Contact } from "@/types/contact.gen";

export type IdReferenceKey = {
	id: number;
};

interface ContactReferenceRow {
	id: number;
	descr: string;
}

interface FilterValue {
	v?: unknown;
}

interface FilterGroup {
	f?: Record<string, FilterValue | undefined>;
}

const queryFromParams = (params?: CollectionParams): string => {
	const query = (params as CollectionParams & { query?: unknown } | undefined)?.query;
	if (typeof query === "string" && query.trim()) {
		return query.trim();
	}

	for (const group of params?.filter ?? []) {
		const filterValue = (group as FilterGroup).f?.descr?.v;
		if (typeof filterValue !== "string") {
			continue;
		}

		return filterValue
			.replace(/^%+/, "")
			.replace(/%+$/, "")
			.trim();
	}

	return "";
};

const autocompleteLimit = (params?: CollectionParams): number => {
	const count = params?.count ?? 20;
	return Math.min(Math.max(count, 1), 50);
};

const listContacts = async (
	params?: CollectionParams,
): Promise<CollectionResponse<ContactReferenceRow>> => {
	const items = await contactApi.autocomplete(
		queryFromParams(params),
		autocompleteLimit(params),
	);

	return {
		rows: items.map((item) => ({
			id: item.keys.id,
			descr: item.descr,
		})),
		agg: {
			tot_count: items.length,
		},
	};
};

const contactDescr = (contact: Contact): string => {
	return [
		contact.name,
		contact.phone,
		contact.email,
	]
		.map((value) => value?.trim() ?? "")
		.filter(Boolean)
		.join(", ");
};

const detailContact = async (
	key: IdReferenceKey,
): Promise<ContactReferenceRow> => {
	const contact = await contactApi.detail(key);

	return {
		id: contact.id,
		descr: contactDescr(contact) || `#${contact.id}`,
	};
};

export const contactReference = defineCrudReference<
	ContactReferenceRow,
	IdReferenceKey,
	number
>({
	list: listContacts,
	detail: detailContact,
	keyField: "id",
	searchField: "descr",
	descrFields: ["descr"],
	minLength: 0,
	completeOnFocus: true,
	fallback: (id) => `#${id}`,
	isEmpty: (id) => id <= 0,
	emptyValue: 0,
	openRoute: (value) => ({
		name: "contactEdit",
		params: value.keys ?? {},
	}),
	selectRoute: {
		name: "contacts",
	},
});
