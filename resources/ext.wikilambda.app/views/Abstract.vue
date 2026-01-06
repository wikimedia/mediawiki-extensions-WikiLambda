<!--
	WikiLambda Vue root component to render the Abstract View

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-abstract-view">
		<div class="ext-wikilambda-app-row">
			<template v-if="!qid">
				<div
					class="ext-wikilambda-app-col
					ext-wikilambda-app-col-24">
					<wl-abstract-title
						:edit="edit"
					></wl-abstract-title>
				</div>
				<!-- No selected title -->
			</template>
			<template v-else>
				<!-- Selected title -->
				<div
					class="ext-wikilambda-app-col
					ext-wikilambda-app-col-12
					ext-wikilambda-app-col-tablet-24">
					<wl-abstract-content
						:edit="edit"
					></wl-abstract-content>
				</div>
				<div
					class="ext-wikilambda-app-col
					ext-wikilambda-app-col-12
					ext-wikilambda-app-col-tablet-24">
					<wl-abstract-preview
						:edit="edit"
					></wl-abstract-preview>
				</div>
			</template>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, onMounted } = require( 'vue' );

const useMainStore = require( '../store/index.js' );

// Abstract components
const AbstractContent = require( '../components/abstract/AbstractContent.vue' );
const AbstractPreview = require( '../components/abstract/AbstractPreview.vue' );
const AbstractTitle = require( '../components/abstract/AbstractTitle.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-view',
	components: {
		'wl-abstract-content': AbstractContent,
		'wl-abstract-preview': AbstractPreview,
		'wl-abstract-title': AbstractTitle
	},
	emits: [ 'mounted' ],
	setup( _, { emit } ) {
		const store = useMainStore();

		/**
		 * Returns whether we are in an edit page according to the URL
		 *
		 * @return {boolean}
		 */
		const edit = computed( () => !store.getViewMode );

		/**
		 * Returns the Abstract Wiki Page Id saved in the store, which
		 * identifies the existing Abstract Wiki Page to view or edit,
		 * or the Wikidata Item Id for which to create a new AW page.
		 *
		 * @return {string}
		 */
		const qid = computed( () => store.getAbstractWikiId );

		// Lifecycle
		onMounted( () => {
			emit( 'mounted' );
		} );

		return {
			edit,
			qid
		};
	}
} );
</script>

<style lang="less">
.ext-wikilambda-app-abstract-view {
	/* something */
}
</style>
