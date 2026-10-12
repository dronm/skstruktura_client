<script setup lang="ts">
import { CollectionListPage } from "@katren/vue-collection-lib";

import { concreteTypeCollection } from "@/collections/concreteType.gen";
</script>

<template>
	<CollectionListPage :collection="concreteTypeCollection" />
</template>
