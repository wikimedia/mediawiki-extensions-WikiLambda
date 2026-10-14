<!--
	WikiLambda Vue component for the Add content dialog of an Abstract Content section.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-dialog
		:open="open"
		class="ext-wikilambda-app-abstract-add-content-dialog"
		:title="i18n( 'wikilambda-abstract-add-content-dialog-title' ).text()"
		use-close-button
		@update:open="closeDialog"
	>
		<template #header>
			<wl-custom-dialog-header @close-dialog="closeDialog">
				{{ i18n( 'wikilambda-abstract-add-content-dialog-title' ).text() }}
			</wl-custom-dialog-header>
			<!-- Function search -->
			<div class="ext-wikilambda-app-abstract-add-content-dialog__search">
				<cdx-search-input
					:model-value="searchTerm"
					:placeholder="i18n( 'wikilambda-abstract-add-content-search-placeholder' ).text()"
					:aria-label="i18n( 'wikilambda-abstract-add-content-search-placeholder' ).text()"
					clearable
					@update:model-value="updateSearchTerm"
				></cdx-search-input>
			</div>
		</template>
		<!-- Next steps when the search finds no function -->
		<wl-function-search-next-steps
			v-if="searchFoundNothing"
			class="ext-wikilambda-app-abstract-add-content-dialog__next-steps"
			:return-type="searchReturnType"
		></wl-function-search-next-steps>
		<wl-dialog-item-list
			v-else
			:groups="optionGroups"
			item-key="value"
			@select="selectOption"
		>
			<!-- Function: suggested by the community, or a search result -->
			<template #item="{ item }">
				<span class="ext-wikilambda-app-dialog-item-list__item-title">
					<span
						:lang="item.labelData.langCode"
						:dir="item.labelData.langDir"
					>{{ item.labelData.label }}</span>
					<!-- Search result: the text that the search matched, if it is not the name -->
					<span
						v-if="item.matchLabel && item.matchLabel.label !== item.labelData.label"
						class="ext-wikilambda-app-abstract-add-content-dialog__match"
						:lang="item.matchLabel.langCode"
						:dir="item.matchLabel.langDir"
					>{{ i18n( 'parentheses', [ item.matchLabel.label ] ).text() }}</span>
				</span>
				<span
					v-if="item.description"
					class="ext-wikilambda-app-dialog-item-list__item-description"
					:lang="item.description.langCode"
					:dir="item.description.langDir"
				>{{ item.description.label }}</span>
				<span
					v-if="item.inputs.length > 0"
					class="ext-wikilambda-app-abstract-add-content-dialog__option-inputs"
				>
					<span>{{ i18n( 'wikilambda-abstract-add-content-inputs' ).text() }}</span>
					<template v-for="( input, index ) in item.inputs" :key="input.zid">
						<span
							class="ext-wikilambda-app-abstract-add-content-dialog__option-input"
							:lang="input.langCode"
							:dir="input.langDir"
						>{{ input.label }}</span>
						<!-- Separates the input labels for screen readers -->
						<span
							v-if="index < item.inputs.length - 1"
							class="ext-wikilambda-app-abstract-add-content-dialog__screen-reader-text"
						>{{ i18n( 'comma-separator' ).text() }}</span>
					</template>
				</span>
			</template>
		</wl-dialog-item-list>
	</cdx-dialog>
</template>

<script>
const { computed, defineComponent, inject, ref, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const LabelData = require( '../../store/classes/LabelData.js' );
const useMainStore = require( '../../store/index.js' );
const { extractIdFromUrl } = require( '../../utils/urlUtils.js' );

// Base components
const CustomDialogHeader = require( '../base/CustomDialogHeader.vue' );
const DialogItemList = require( '../base/DialogItemList.vue' );
const FunctionSearchNextSteps = require( '../base/FunctionSearchNextSteps.vue' );
// Codex components
const { CdxDialog, CdxSearchInput } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-add-content-dialog',
	components: {
		'cdx-dialog': CdxDialog,
		'cdx-search-input': CdxSearchInput,
		'wl-custom-dialog-header': CustomDialogHeader,
		'wl-dialog-item-list': DialogItemList,
		'wl-function-search-next-steps': FunctionSearchNextSteps
	},
	props: {
		open: {
			type: Boolean,
			required: true
		}
	},
	emits: [ 'close-dialog', 'select' ],
	setup( props, { emit } ) {
		const store = useMainStore();
		const i18n = inject( 'i18n' );

		// Function search
		const searchTerm = ref( '' );
		// Results of the last finished search: the zid and the label of each function.
		// They stay on screen until the results of a newer search term arrive.
		const lookupResults = ref( [] );
		// Whether the last finished search found no function. It also stays until newer results arrive.
		const searchFoundNothing = ref( false );
		let lookupAbortController = null;

		/**
		 * Returns a function option, with its label, description (if any)
		 * and the labels of its inputs. A search result also has the text
		 * that the search matched, such as an alias or a label in another language.
		 *
		 * @param {string} zid
		 * @param {LabelData|undefined} searchLabel The label from the search results, if any
		 * @param {LabelData|undefined} matchLabel The text that the search matched, if any
		 * @return {Object}
		 */
		function buildFunctionItem( zid, searchLabel, matchLabel ) {
			return {
				value: zid,
				// Until the function is loaded, show the label from the search results
				labelData: ( searchLabel && !store.getStoredObject( zid ) ) ?
					searchLabel :
					store.getLabelData( zid ),
				matchLabel,
				description: store.getDescription( zid ),
				inputs: store.getInputsOfFunctionZid( zid )
					.map( ( arg ) => store.getLabelData( arg[ Constants.Z_ARGUMENT_KEY ] ) )
			};
		}

		/**
		 * Returns the groups of options: the search results, if the last
		 * finished search found functions that return HTML. Otherwise, the
		 * community suggestions: the functions that return HTML configured
		 * by the community, if any.
		 *
		 * @return {Array}
		 */
		const optionGroups = computed( () => {
			if ( lookupResults.value.length > 0 ) {
				return [ {
					id: 'search-results',
					items: lookupResults.value
						.map( ( result ) => buildFunctionItem( result.zid, result.labelData, result.matchLabel ) )
				} ];
			}
			if ( store.getSuggestedHtmlFunctions.length === 0 ) {
				return [];
			}
			return [ {
				id: 'suggested',
				title: i18n( 'wikilambda-abstract-add-content-community-suggestions' ).text(),
				items: store.getSuggestedHtmlFunctions.map( ( zid ) => buildFunctionItem( zid ) )
			} ];
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
		 * Returns the text that the search matched in the given search result:
		 * an alias, a label in any language, or the zid. A zid has no language.
		 *
		 * @param {Object} result A search result
		 * @return {LabelData|undefined}
		 */
		function buildMatchLabel( result ) {
			if ( !result.match_label ) {
				return undefined;
			}
			if ( result.match_label === result.page_title ) {
				return new LabelData( result.page_title, result.match_label, null );
			}
			return new LabelData(
				result.page_title,
				result.match_label,
				result.match_lang,
				store.getLanguageIsoCodeOfZLang( result.match_lang )
			);
		}

		/**
		 * Processes the lookup response: keeps the found functions, and loads
		 * their data (labels, descriptions and inputs).
		 *
		 * @param {Object} data The response data from the API
		 * @param {string} input The search term of this lookup
		 */
		function handleLookupResponse( data, input ) {
			// Discard responses from superseded searches.
			if ( input !== searchTerm.value ) {
				return;
			}
			lookupResults.value = data.labels.map( ( result ) => ( {
				zid: result.page_title,
				// The search returns the label in the user language, not the matched text
				labelData: new LabelData(
					result.page_title,
					result.label,
					store.getUserLangZid,
					store.getUserLangCode
				),
				matchLabel: buildMatchLabel( result )
			} ) );
			searchFoundNothing.value = lookupResults.value.length === 0;
			if ( lookupResults.value.length > 0 ) {
				store.fetchZids( { zids: lookupResults.value.map( ( result ) => result.zid ) } );
			}
		}

		/**
		 * Handles a lookup error: shows the suggested functions. Not the next
		 * steps, as the search did not finish, so the function can exist.
		 *
		 * @param {Error} error
		 * @param {string} input The search term of this lookup
		 */
		function handleLookupError( error, input ) {
			if ( error.code === 'abort' || input !== searchTerm.value ) {
				return;
			}
			lookupResults.value = [];
			searchFoundNothing.value = false;
		}

		/**
		 * Searches the functions that return HTML and match the given term.
		 *
		 * @param {string} input
		 */
		function getLookupResults( input ) {
			const signal = resetAbortController();
			store.lookupZObjectLabels( {
				// Users often paste a link to a function instead of typing its zid
				input: extractIdFromUrl( input ) || input,
				types: [ Constants.Z_FUNCTION ],
				returnTypes: [ Constants.Z_HTML_FRAGMENT ],
				signal
			} )
				.then( ( data ) => handleLookupResponse( data, input ) )
				.catch( ( error ) => handleLookupError( error, input ) );
		}

		/**
		 * Updates the search term, and searches for it. The current options
		 * stay until the results arrive. An empty term shows the suggested
		 * functions, and a search that finds nothing shows the next steps.
		 *
		 * @param {string} value
		 */
		function updateSearchTerm( value ) {
			searchTerm.value = value;
			if ( !value ) {
				abortLookup();
				lookupResults.value = [];
				searchFoundNothing.value = false;
				return;
			}
			getLookupResults( value );
		}

		// Clear the search when the dialog closes, so that it opens without one
		watch( () => props.open, ( isOpen ) => {
			if ( !isOpen ) {
				updateSearchTerm( '' );
			}
		} );

		/**
		 * Closes the dialog with no action.
		 */
		function closeDialog() {
			emit( 'close-dialog' );
		}

		/**
		 * Emits the zid of the selected function.
		 *
		 * @param {Object} item
		 */
		function selectOption( item ) {
			emit( 'select', item.value );
		}

		return {
			closeDialog,
			optionGroups,
			searchFoundNothing,
			searchReturnType: Constants.Z_HTML_FRAGMENT,
			searchTerm,
			selectOption,
			updateSearchTerm,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';
@import 'mediawiki.mixins.less';

.ext-wikilambda-app-abstract-add-content-dialog {
	.cdx-dialog__body {
		padding: @spacing-50 0;
	}

	.ext-wikilambda-app-abstract-add-content-dialog__search {
		padding: @spacing-100 0 0;
	}

	// Same side padding as the options
	.ext-wikilambda-app-abstract-add-content-dialog__next-steps {
		padding: 0 @spacing-150;
	}

	.ext-wikilambda-app-abstract-add-content-dialog__match {
		margin-left: @spacing-25;
		color: @color-subtle;
	}

	.ext-wikilambda-app-abstract-add-content-dialog__option-inputs {
		display: flex;
		flex-wrap: wrap;
		gap: @spacing-25;
		margin-top: @spacing-25;
		color: @color-subtle;
		font-size: @font-size-x-small;
	}

	.ext-wikilambda-app-abstract-add-content-dialog__option-input {
		padding: 0 @spacing-35;
		border-radius: @border-radius-base;
		background-color: @background-color-interactive;
		color: @color-base;
	}

	// Input chips have the same color as a hovered or pressed row; keep them visible
	.ext-wikilambda-app-dialog-item-list__button:hover,
	.ext-wikilambda-app-dialog-item-list__button:active {
		.ext-wikilambda-app-abstract-add-content-dialog__option-input {
			background-color: @background-color-base;
		}
	}

	.ext-wikilambda-app-abstract-add-content-dialog__screen-reader-text {
		.mixin-screen-reader-text();
	}
}
</style>
