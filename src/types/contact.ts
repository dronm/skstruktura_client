import type { ContactNew } from "@/types/contact.gen";

type ContactOptionalCreateField = "email" | "employee_post_id";

export type ContactCreatePayload = Omit<
	ContactNew,
	ContactOptionalCreateField
> &
	Partial<Pick<ContactNew, ContactOptionalCreateField>>;
