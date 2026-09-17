<script setup lang="ts">
import { CollectionListPage } from "@katren/vue-collection-lib";

import { contactCollection } from "@/collections/contact.gen";
</script>

<template>
	<CollectionListPage :collection="contactCollection" />
</template>
