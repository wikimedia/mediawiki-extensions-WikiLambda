<!--
	WikiLambda Vue root component to render the Abstract View

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-app-abstract-title" :no-overrides="true">
		<template #header>
			{{ i18n( 'wikilambda-abstract-special-create' ).text() }}
		</template>
		<template #main>
			<cdx-field>
				<template #label>
					Wikidata item
				</template>
				<div class="ext-wikilambda-app-abstract-title__field">
					<wl-wikidata-entity-selector
						:entity-id="itemId"
						:entity-label="itemLabel"
						:type="itemType"
						@select-wikidata-entity="selectItemId"
					></wl-wikidata-entity-selector>
					<cdx-progress-indicator
						v-if="isLoading"
						class="ext-wikilambda-app-abstract-title__loading">
						{{ i18n( 'wikilambda-loading' ).text() }}
					</cdx-progress-indicator>
				</div>
			</cdx-field>

			<!-- Item selected to an already created page -->
			<cdx-message
				v-if="itemId && !canCreateNewPage && !isLoading"
				class="ext-wikilambda-app-abstract-title__notice"
				type="warning"
			>
				{{ i18n( 'wikilambda-abstract-special-create-existing' ).text() }}
				<p><a :href="itemPage.title">{{ itemLabel }} {{ i18n( 'parentheses', [ itemId ] ).text() }}</a></p>
			</cdx-message>
			<cdx-button
				class="ext-wikilambda-app-abstract-title__button"
				action="progressive"
				weight="primary"
				:disabled="!canCreateNewPage"
				@click="createAbstractForQid"
			>
				{{ i18n( 'wikilambda-abstract-special-create-createbutton-label' ).text() }}
			</cdx-button>
		</template>
	</wl-widget-base>
</template>

<script>
const { computed, defineComponent, inject, ref, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const { fetchPageInfo } = require( '../../utils/apiUtils.js' );
const { buildAbstractWikiTitle } = require( '../../utils/urlUtils.js' );
const usePageTitle = require( '../../composables/usePageTitle.js' );

// Base components
const WidgetBase = require( '../base/WidgetBase.vue' );
// Wikidata components
const WikidataEntitySelector = require( '../types/wikidata/EntitySelector.vue' );
// Codex components
const { CdxButton, CdxField, CdxMessage, CdxProgressIndicator } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-title',
	components: {
		'wl-widget-base': WidgetBase,
		'wl-wikidata-entity-selector': WikidataEntitySelector,
		'cdx-button': CdxButton,
		'cdx-field': CdxField,
		'cdx-message': CdxMessage,
		'cdx-progress-indicator': CdxProgressIndicator
	},
	setup() {
		const i18n = inject( 'i18n' );
		const { setCreateAbstractTitle } = usePageTitle();

		// Use main store
		const store = useMainStore();

		const itemType = Constants.Z_WIKIDATA_ITEM;

		const itemId = ref( null );
		const itemPage = ref( null );
		const isLoading = ref( false );

		/**
		 * Returns the LabelData object for the selected Item.
		 *
		 * @return {LabelData|undefined}
		 */
		const itemLabelData = computed( () => store.getItemLabelData( itemId.value ) );

		/**
		 * Returns the string label of the selected Wikidata Item or
		 * an empty string if none is selected.
		 *
		 * @return {string}
		 */
		const itemLabel = computed( () => itemLabelData.value ? itemLabelData.value.label : '' );

		/**
		 * Returns whether we can create a new Abstract Wiki page, so:
		 * * itemId must be selected
		 * * itemId must be a valid Qid
		 * * itemId must be an existing Wikidata Id
		 * * itemId must be missing as Abstract Wiki content
		 *
		 * @return {boolean}
		 */
		const canCreateNewPage = computed( () => Boolean(
			itemId.value && // itemId is set
			!isLoading.value && // we are done fetching
			( !itemPage.value || itemPage.value.missing ) // itemPage is unset or missing
		) );

		/**
		 * Selects the Wikidata Item ID chosen in the lookup field.
		 *
		 * @param {string} id
		 */
		function selectItemId( id ) {
			itemId.value = id;
		}

		/**
		 * Checks whether an Abstract Wiki page exists for this Item ID
		 * and updates itemPage with the fetched page value.
		 *
		 * @param {string} id
		 */
		function checkAvailability( id ) {
			isLoading.value = true;
			itemPage.value = null;

			// Build title with primary namespace and qid
			const title = buildAbstractWikiTitle( store.getAbstractWikipediaNamespace, id );

			fetchPageInfo( { titles: [ title ] } )
				.then( ( response ) => {
					for ( const pageid of Object.keys( response ) ) {
						const page = response[ pageid ];
						if ( !page.missing && ( ( page.denormalized === title ) || ( page.title === title ) ) ) {
							itemPage.value = page;
							return;
						}
					}
				} )
				.finally( () => {
					isLoading.value = false;
				} );
		}

		/**
		 * Proceeds to create an Abstract Wiki page for the selected
		 * Wikidata Item ID, by setting the Id in the store.
		 */
		function createAbstractForQid() {
			if ( !canCreateNewPage.value ) {
				return;
			}
			store.setAbstractWikiId( itemId.value );
			setCreateAbstractTitle( itemId.value );
		}

		// Watch itemId changes, and fetch the data from AW and WD
		watch( itemId, ( id ) => {
			if ( !id ) {
				itemPage.value = null;
				return;
			}

			checkAvailability( id );
			store.fetchItems( { ids: [ id ] } );
		} );

		return {
			canCreateNewPage,
			isLoading,
			itemId,
			itemType,
			itemPage,
			itemLabel,
			selectItemId,
			createAbstractForQid,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-title {
	.ext-wikilambda-app-abstract-title__field {
		position: relative;
		max-width: @size-4000;
		margin-bottom: @spacing-150;
	}

	.ext-wikilambda-app-abstract-title__notice {
		margin-bottom: @spacing-100;
	}

	.ext-wikilambda-app-abstract-title__loading {
		position: absolute;
		right: @spacing-50;
		bottom: @spacing-25;

		.cdx-progress-indicator__indicator {
			width: @size-icon-small;
			height: @size-icon-small;
			min-width: @size-icon-small;
			min-height: @size-icon-small;
		}
	}
}
</style>
