<!--
	WikiLambda Vue component to search and select a Commons media file.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-commons-media-selector">
		<cdx-lookup
			:input-value="inputValue"
			data-testid="commons-media-selector"
			:selected="mediaId"
			:placeholder="placeholder"
			:menu-items="lookupResults"
			:menu-config="lookupConfig"
			:start-icon="imageIcon"
			@update:selected="onSelect"
			@update:input-value="onInput"
			@blur="onBlur"
			@focus="onFocus"
			@load-more="onLoadMore"
		>
			<template #no-results>
				{{ i18n( 'wikilambda-zobjectselector-no-results' ).text() }}
			</template>
		</cdx-lookup>
		<!-- Selected preview: shown below the field after a selection is made -->
		<div
			v-if="selectedPreview"
			class="ext-wikilambda-app-commons-media-selector__selected-preview"
		>
			<img
				:src="selectedPreview.url"
				:alt="selectedPreview.title"
				class="ext-wikilambda-app-commons-media-selector__selected-preview-image"
			>
			<a
				v-if="selectedPreview.descriptionUrl"
				:href="selectedPreview.descriptionUrl"
				target="_blank"
				class="ext-wikilambda-app-commons-media-selector__selected-preview-title"
			>{{ selectedPreview.title }}</a>
			<span
				v-else
				class="ext-wikilambda-app-commons-media-selector__selected-preview-title"
			>{{ selectedPreview.title }}</span>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, inject, ref, watch } = require( 'vue' );

const useMainStore = require( '../../../store/index.js' );
const icons = require( '../../../../lib/icons.json' );

// Codex components
const { CdxLookup } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-commons-media-selector',
	components: {
		'cdx-lookup': CdxLookup
	},
	props: {
		mediaId: {
			type: [ String, null ],
			required: true
		},
		mediaTitle: {
			type: String,
			required: true
		},
		placeholder: {
			type: String,
			default: ''
		},
		/**
		 * List of allowed MIME type prefixes (e.g. `['image/']`).
		 * Results whose MIME type does not start with one of these prefixes are excluded.
		 * Pass an empty array (the default) to disable filtering and show all file types.
		 */
		mimeTypes: {
			type: Array,
			default: () => []
		}
	},
	emits: [ 'select-commons-media' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		// Constants
		const imageIcon = icons.cdxIconImage;

		// Lookup
		const inputValue = ref( '' );
		const lookupResults = ref( [] );
		const lookupConfig = ref( {
			boldLabel: true,
			searchQuery: '',
			visibleItemLimit: 5,
			searchContinue: null,
			showThumbnail: true
		} );
		let lookupDelayTimer = null;
		const lookupDelayMs = 300;
		let lookupAbortController = null;

		// Selected preview: computed from store data so it populates on initial
		// load as well as after a fresh selection.
		const selectedPreview = computed( () => {
			const mid = props.mediaId;
			if ( !mid ) {
				return null;
			}
			const thumbUrl = store.getCommonsMediaThumb( mid );
			if ( !thumbUrl ) {
				return null;
			}
			return {
				url: thumbUrl,
				title: store.getCommonsMediaTitle( mid ) || '',
				descriptionUrl: store.getCommonsMediaDescriptionUrl( mid ) || null
			};
		} );

		/**
		 * Abort any in-flight lookup request.
		 */
		function abortLookup() {
			if ( lookupAbortController ) {
				lookupAbortController.abort();
			}
		}

		/**
		 * Abort any in-flight request, create a new controller, and return its signal.
		 *
		 * @return {AbortSignal}
		 */
		function resetAbortController() {
			abortLookup();
			lookupAbortController = new AbortController();
			return lookupAbortController.signal;
		}

		/**
		 * Filters pages by the allowed MIME type prefixes from the mimeTypes prop.
		 * If mimeTypes is empty, all pages are returned.
		 *
		 * @param {Array} pages
		 * @return {Array}
		 */
		function filterByMimeType( pages ) {
			if ( !props.mimeTypes.length ) {
				return pages;
			}
			return pages.filter( ( page ) => {
				const mime = page.imageinfo && page.imageinfo[ 0 ] && page.imageinfo[ 0 ].mime;
				return mime && props.mimeTypes.some( ( allowed ) => mime.startsWith( allowed ) );
			} );
		}

		/**
		 * Builds a menu item object from a Commons search result page.
		 *
		 * @param {Object} page
		 * @param {number} page.pageid
		 * @param {string} page.title
		 * @param {Object} [page.thumbnail]
		 * @return {Object}
		 */
		function buildMenuItem( page ) {
			const mid = `M${ page.pageid }`;
			const title = page.title || '';
			const item = {
				value: mid,
				label: title,
				description: mid
			};
			if ( page.thumbnail && page.thumbnail.source ) {
				item.thumbnail = { url: page.thumbnail.source };
			}
			return item;
		}

		/**
		 * Updates lookup configuration with new search state.
		 *
		 * @param {string} searchQuery
		 * @param {number|null} searchContinue
		 */
		function updateLookupConfig( searchQuery, searchContinue ) {
			lookupConfig.value.searchQuery = searchQuery;
			lookupConfig.value.searchContinue = searchContinue;
		}

		/**
		 * Processes lookup response data and updates the menu items.
		 *
		 * @param {Object} data
		 * @param {string} searchTerm
		 */
		function handleLookupResponse( data, searchTerm ) {
			// Discard responses from superseded searches.
			if ( searchTerm !== inputValue.value ) {
				return;
			}

			const { pages, searchContinue } = data;

			if ( !lookupConfig.value.searchContinue ) {
				lookupResults.value = [];
			}

			updateLookupConfig( searchTerm, searchContinue );

			const filtered = filterByMimeType( pages || [] );
			if ( filtered.length > 0 ) {
				lookupResults.value.push( ...filtered.map( ( page ) => buildMenuItem( page ) ) );
			}

			// If more results exist on Commons but the visible list is still below the
			// threshold (because many were filtered out client-side), auto-fetch the next
			// page so the user isn't left with an unscrollable list and no load-more trigger.
			if ( searchContinue && lookupResults.value.length < lookupConfig.value.visibleItemLimit ) {
				getLookupResults( searchTerm );
			}
		}

		/**
		 * Handle lookup error.
		 *
		 * @param {Error} error
		 * @param {string} searchTerm
		 */
		function handleLookupError( error, searchTerm ) {
			// Discard errors from superseded searches or aborted requests.
			if ( error.code === 'abort' || searchTerm !== inputValue.value ) {
				return;
			}
			lookupConfig.value.searchQuery = inputValue.value;
			// Clear the results if there is no more search to continue.
			if ( !lookupConfig.value.searchContinue ) {
				lookupResults.value = [];
			}
			// Reset the search continue to null.
			lookupConfig.value.searchContinue = null;
		}

		/**
		 * Perform Commons media lookup given a search term.
		 *
		 * @param {string} searchTerm
		 */
		function getLookupResults( searchTerm ) {
			const signal = resetAbortController();
			const payload = {
				search: searchTerm,
				searchContinue: lookupConfig.value.searchContinue,
				signal
			};

			store.lookupCommonsMedia( payload )
				.then( ( data ) => handleLookupResponse( data, searchTerm ) )
				.catch( ( error ) => handleLookupError( error, searchTerm ) );
		}

		/**
		 * On field input, trigger a debounced Commons lookup.
		 *
		 * @param {string} input
		 */
		function onInput( input ) {
			inputValue.value = input;
			lookupConfig.value.searchContinue = null;

			if ( !input ) {
				abortLookup();
				lookupResults.value = [];
				return;
			}

			clearTimeout( lookupDelayTimer );
			lookupDelayTimer = setTimeout( () => {
				getLookupResults( input );
			}, lookupDelayMs );
		}

		/**
		 * When a result is selected, emit select-commons-media with the M-ID.
		 *
		 * @param {string|null} value
		 */
		function onSelect( value ) {
			if ( value === null ) {
				return;
			}

			if ( props.mediaId === value ) {
				inputValue.value = props.mediaTitle;
				return;
			}

			const selectedItem = lookupResults.value.find( ( item ) => item.value === value );
			inputValue.value = ( selectedItem && selectedItem.label ) || '';
			emit( 'select-commons-media', value );
		}

		/**
		 * On focus, repopulate results if the field has a value but no results.
		 */
		function onFocus() {
			if ( inputValue.value && !lookupResults.value.length ) {
				getLookupResults( inputValue.value );
			}
		}

		/**
		 * On blur, restore the previous selection if the input doesn't match.
		 */
		function onBlur() {
			if ( inputValue.value === props.mediaTitle ) {
				return;
			}

			const match = lookupResults.value.find( ( option ) => option.label === inputValue.value );
			if ( match ) {
				onSelect( match.value );
			} else {
				inputValue.value = props.mediaTitle;
				lookupConfig.value.searchQuery = props.mediaTitle;
				lookupResults.value = [];
			}
		}

		/**
		 * Load more results when the user scrolls to the bottom.
		 */
		function onLoadMore() {
			if ( !lookupConfig.value.searchContinue ) {
				return;
			}
			getLookupResults( lookupConfig.value.searchQuery );
		}

		watch( () => props.mediaId, ( mid ) => {
			if ( mid ) {
				store.fetchCommonsMedia( { ids: [ mid ] } );
			}
		}, { immediate: true } );

		watch( () => props.mediaTitle, ( title ) => {
			inputValue.value = title;
		}, { immediate: true } );

		return {
			i18n,
			imageIcon,
			inputValue,
			lookupConfig,
			lookupResults,
			selectedPreview,
			onBlur,
			onFocus,
			onInput,
			onLoadMore,
			onSelect
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-commons-media-selector {
	// Enlarge the Codex thumbnail in each dropdown menu item
	.cdx-menu-item__thumbnail .cdx-thumbnail__placeholder,
	.cdx-menu-item__thumbnail .cdx-thumbnail__image {
		width: 70px;
		height: 70px;
		min-width: 70px;
		min-height: 70px;
	}

	// TODO(T426171): reuse the styles of the rendered thumbnail figure
	&__selected-preview {
		margin-top: @spacing-50;
		width: @size-1200;
		background-color: @background-color-base;
		border: @border-base;
		border-radius: @border-radius-base;
		padding: @spacing-50 @spacing-50 @spacing-25 @spacing-50;
	}

	&__selected-preview-title {
		display: block;
		margin-top: @spacing-25;
		font-size: @font-size-x-small;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__selected-preview-image {
		display: block;
		width: 100%;
		height: auto;
		border-radius: @border-radius-base;
	}
}
</style>
