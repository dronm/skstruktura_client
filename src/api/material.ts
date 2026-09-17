import * as v from "valibot";

import api from "@/api/http";
import { materialApi as generatedMaterialApi } from "@/api/material.gen";
import { MaterialListSchema } from "@/schemas/materialList.gen";
import type { MaterialKey } from "@/types/material.gen";

const basePath = "/material";

const MaterialEditDetailSchema = v.omit(MaterialListSchema, ["balances"]);

export type MaterialEditDetail = v.InferOutput<typeof MaterialEditDetailSchema>;

const detail = async (key: MaterialKey): Promise<MaterialEditDetail> => {
	const dto = await api.get<unknown>(
		`${basePath}/${encodeURIComponent(String(key.id))}`,
	);

	return v.parse(MaterialEditDetailSchema, dto);
};

export const materialApi = {
	...generatedMaterialApi,
	detail,
};
