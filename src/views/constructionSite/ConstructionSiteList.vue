<script setup lang="ts">
import {
	CollectionListPage,
} from "@katren/vue-collection-lib";

import { constructionSiteCollection } from "@/collections/constructionSite.gen";
</script>

<template>
	<CollectionListPage :collection="constructionSiteCollection" />
</template>
