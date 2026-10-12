<script setup lang="ts">
import { CollectionListPage } from "@katren/vue-collection-lib";

import { elevationCollection } from "@/collections/elevation.gen";
</script>

<template>
	<CollectionListPage :collection="elevationCollection" />
</template>
