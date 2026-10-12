<script setup lang="ts">
import { CollectionListPage } from "@katren/vue-collection-lib";

import { buildingElementCollection } from "@/collections/buildingElement.gen";
</script>

<template>
	<CollectionListPage :collection="buildingElementCollection" />
</template>
