<script setup lang="ts">
import { CollectionListPage } from "@katren/vue-collection-lib";

import { orderImportanceCollection } from "@/collections/orderImportance.gen";
</script>

<template>
	<CollectionListPage :collection="orderImportanceCollection" />
</template>
