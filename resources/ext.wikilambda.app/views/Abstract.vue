<!--
	WikiLambda Vue root component to render the Abstract View

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-abstract-view">
		<div class="ext-wikilambda-app-row">
			<template v-if="!qid">
				<!-- No selected title -->
				<div class="ext-wikilambda-app-col ext-wikilambda-app-col-24">
					<wl-abstract-title :edit="edit"></wl-abstract-title>
				</div>
			</template>
			<template v-else>
				<!-- Selected title -->
				<div class="ext-wikilambda-app-col ext-wikilambda-app-col-12 ext-wikilambda-app-col-tablet-24">
					<wl-abstract-content :edit="edit"></wl-abstract-content>
				</div>
				<div class="ext-wikilambda-app-col ext-wikilambda-app-col-12 ext-wikilambda-app-col-tablet-24">
					<wl-abstract-preview></wl-abstract-preview>
				</div>
			</template>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, onMounted, onUnmounted, watch } = require( 'vue' );

const useMainStore = require( '../store/index.js' );
const usePageTitle = require( '../composables/usePageTitle.js' );

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
	setup( _props, { emit } ) {
		const store = useMainStore();
		const { updateAbstractPageTitle } = usePageTitle();

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

		/**
		 * Returns the LabelData for the selected Wikidata item, or undefined when
		 * no item is selected. When item data has not yet been fetched, LabelData
		 * uses the QID itself as the label (isUntitled = true).
		 *
		 * @return {LabelData|undefined}
		 */
		const qidLabelData = computed( () => store.getItemLabelData( qid.value ) );

		/**
		 * Update the page heading whenever the QID or its label changes.
		 * Uses the resolved Wikidata label, or the QID as a placeholder until
		 * the async fetch completes.
		 *
		 * @param {LabelData|undefined} labelData
		 */
		watch( qidLabelData, ( labelData ) => {
			if ( labelData && store.isAbstractCreatePage() ) {
				updateAbstractPageTitle( qid.value, labelData.label );
			}
		} );

		/**
		 * Clear the fragment selection when the user presses Escape. The
		 * listener is on the document, because the selection can be set from
		 * either column and the focus can be anywhere.
		 *
		 * @param {KeyboardEvent} event
		 */
		function onKeyDown( event ) {
			if ( event.key === 'Escape' && store.getSelectedFragment ) {
				store.setSelectedFragment( undefined );
			}
		}

		/**
		 * Lifecycle hook to emit the mounted event.
		 */
		onMounted( () => {
			document.addEventListener( 'keydown', onKeyDown );
			emit( 'mounted' );
		} );

		onUnmounted( () => {
			document.removeEventListener( 'keydown', onKeyDown );
		} );

		return {
			edit,
			qid
		};
	}
} );
</script>
