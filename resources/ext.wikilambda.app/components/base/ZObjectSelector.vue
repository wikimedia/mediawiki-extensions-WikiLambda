<!--
	WikiLambda Vue interface module for selecting any ZObject,
	with lookup on name.

	Receives an input parameter to filter the type of ZObjects that
	it will search and display (e.g. Z4 for selecting only types)

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<span class="ext-wikilambda-app-object-selector" data-testid="z-object-selector">
		<cdx-select
			v-if="isEnum"
			class="ext-wikilambda-app-object-selector__select"
			:selected="selectedValue"
			:disabled="disabled"
			:menu-items="enumValues"
			:menu-config="selectConfig"
			@update:selected="onSelect"
			@load-more="onLoadMoreSelect"
		></cdx-select>
		<cdx-lookup
			v-else
			:key="selectedValue"
			class="ext-wikilambda-app-object-selector__lookup"
			:input-value="inputValue"
			:selected="selectedValue"
			:disabled="disabled"
			:placeholder="lookupPlaceholder"
			:menu-items="menuItems"
			:menu-config="lookupConfig"
			:status="errorLookupStatus"
			data-testid="z-object-selector-lookup"
			@update:selected="onSelect"
			@update:input-value="onInput"
			@load-more="onLoadMoreLookup"
			@blur="onBlur"
			@focus="onFocus"
		>
			<template #no-results>
				{{ i18n( 'wikilambda-zobjectselector-no-results' ).text() }}
			</template>
		</cdx-lookup>
		<div
			v-if="hasFieldErrors"
			class="ext-wikilambda-app-object-selector__errors"
		>
			<cdx-message
				v-for="( error, index ) in fieldErrors"
				:key="`field-error-${ index }`"
				:type="error.type"
				:inline="true"
			>
				<wl-safe-message :error="error"></wl-safe-message>
			</cdx-message>
		</div>
	</span>
</template>

<script>
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const useError = require( '../../composables/useError.js' );
const icons = require( '../../../lib/icons.json' );

// Base components
const SafeMessage = require( './SafeMessage.vue' );
// Codex components
const { CdxLookup, CdxSelect, CdxMessage } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-object-selector',
	components: {
		'cdx-message': CdxMessage,
		'cdx-select': CdxSelect,
		'cdx-lookup': CdxLookup,
		'wl-safe-message': SafeMessage
	},
	props: {
		keyPath: {
			type: String,
			default: undefined
		},
		selectedZid: {
			type: String,
			default: ''
		},
		type: {
			type: String,
			required: false,
			default: undefined
		},
		returnType: {
			type: String,
			required: false,
			default: undefined
		},
		strictReturnType: {
			type: Boolean,
			required: false,
			default: false
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		placeholder: {
			type: String,
			default: ''
		},
		/**
		 * List of Zids to exclude from selection and from
		 * the lookup results. Must be in uppercase.
		 */
		excludeZids: {
			type: Array,
			default: function () {
				return [];
			},
			required: false
		}
	},
	emits: [ 'select-item', 'blur', 'input-change' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();
		const { hasFieldErrors, fieldErrors, clearFieldErrors } = useError( { keyPath: props.keyPath } );

		const inputValue = ref( '' );
		const lookupResults = ref( [] );
		const lookupConfig = ref( {
			boldLabel: true,
			searchQuery: '',
			visibleItemLimit: 5,
			searchContinue: null
		} );
		let lookupDelayTimer = null;
		const lookupDelayMs = 300;
		let lookupAbortController = null;
		const selectConfig = {
			visibleItemLimit: 5
		};

		// Computed properties
		/**
		 * Value model for the internal codex lookup component. It
		 * must be null or the value (Zid) of the selected MenuItem.
		 *
		 * @return {string}
		 */
		const selectedValue = computed( () => props.selectedZid || null );

		/**
		 * Human readable label for the selected Zid in the
		 * user language or closest fallback. If the label is
		 * not available it returns the input.
		 *
		 * @return {string}
		 */
		const selectedLabel = computed( () => props.selectedZid ?
			store.getLabelData( props.selectedZid ).label :
			'' );

		/**
		 * Returns whether the type is an enumeration
		 *
		 * @return {boolean}
		 */
		const isEnum = computed( () => store.isEnumType( props.type ) );

		// Helper method for getLabelOrZid (defined early for use in computed)
		/**
		 * Returns the label for the given value if it exists, otherwise returns the value itself.
		 * If the requested language is 'qqx', return (value/zid) as the label.
		 *
		 * @param {string} value - The ZID value
		 * @param {string} label - The label text
		 * @return {string}
		 */
		function getLabelOrZid( value, label ) {
			// If the requested language is 'qqx', return (value/zid) as the label
			if ( store.getUserRequestedLang === 'qqx' ) {
				return `(${ value })`;
			}
			return label;
		}

		/**
		 * Whether is in the built-in list of Zids excluded from selection.
		 *
		 * @param {string} zid
		 * @return {boolean}
		 */
		const isDisallowedType = ( zid ) => (
			( props.type === Constants.Z_TYPE ) &&
			Constants.EXCLUDE_FROM_SELECTOR.includes( zid )
		);

		/**
		 * Helper method for checking if a ZID is excluded.
		 * Al the zids in the excludeZids input property must be uppercase.
		 *
		 * @param {string} zid
		 * @return {boolean}
		 */
		const isExcludedZid = ( zid ) => props.excludeZids.includes( zid ) || isDisallowedType( zid );

		/**
		 * Returns the computed suggestions for the given type.
		 *
		 * @return {Array}
		 */
		const suggestions = computed( () => {
			if ( !props.type ) {
				return [];
			}

			let title = '';
			let suggestedZids = [];
			switch ( props.type ) {
				case Constants.Z_NATURAL_LANGUAGE:
					title = i18n( 'wikilambda-object-selector-suggested-languages' ).text();
					suggestedZids = Constants.SUGGESTIONS.LANGUAGES;
					break;
				case Constants.Z_TYPE:
					title = i18n( 'wikilambda-object-selector-suggested-types' ).text();
					suggestedZids = Constants.SUGGESTIONS.TYPES;
					break;
				default:
					return [];
			}

			const suggestionsList = [];
			// Add dropdown title
			suggestionsList.push( {
				label: title,
				value: 'suggestion',
				disabled: true
			} );

			// Add one item per suggested Zid, excluding disallowed/excluded ones
			suggestedZids.forEach( ( zid ) => {
				if ( !isExcludedZid( zid ) ) {
					suggestionsList.push( {
						value: zid,
						label: store.getLabelData( zid ).label,
						description: store.getLabelData( props.type ).label,
						class: 'ext-wikilambda-app-object-selector__suggestion'
					} );
				}
			} );

			return suggestionsList;
		} );

		/**
		 * Returns the items to show in the lookup menu:
		 * * If user is searching for a term; show returned results or 'No results found'
		 * * If user is just clicking on the field; show selected menu item or suggested items
		 *
		 * @return {Array}
		 */
		const menuItems = computed( () => {
			// User is actively searching (input differs from selected label)
			if ( inputValue.value !== selectedLabel.value ) {
				// If there's input text, show search results; otherwise show suggestions
				return inputValue.value ? lookupResults.value : suggestions.value;
			}

			// User is not searching:
			// If nothing is selected, show suggestions
			if ( !props.selectedZid ) {
				return suggestions.value;
			}
			// Otherwise show the lookup results
			return lookupResults.value;
		} );

		/**
		 * Returns the menu items for the enum selector.
		 * By passing selected Zid to store.getEnumValues getter, it will manually
		 * include this item in the enum list if:
		 * * it's not part of the first page of enum values
		 * * it's a valid instance of the enum type
		 *
		 * @return {Array}
		 */
		const enumValues = computed( () => store.getEnumValues( props.type, props.selectedZid ).map( ( item ) => {
			const value = item.page_title;
			const label = getLabelOrZid( value, item.label );
			return { value, label };
		} ) );

		/**
		 * Returns the placeholder for the Lookup selector, either
		 * the value passed as an input prop, or a built-in message
		 * depending on the type.
		 *
		 * @return {string}
		 */
		const lookupPlaceholder = computed( () => {
			if ( props.placeholder ) {
				return props.placeholder;
			}
			switch ( props.type ) {
				case Constants.Z_FUNCTION:
					return i18n( 'wikilambda-function-typeselector-label' ).text();
				case Constants.Z_NATURAL_LANGUAGE:
					return i18n( 'wikilambda-editor-label-addlanguage-label' ).text();
				case Constants.Z_TYPE:
					return i18n( 'wikilambda-typeselector-label' ).text();
				default:
					return i18n( 'wikilambda-zobjectselector-label' ).text();
			}
		} );

		/**
		 * Status property for the Lookup component (ValidateStatusType).
		 * Can take the values 'default', 'warning', or 'error':
		 * https://doc.wikimedia.org/codex/latest/components/types-and-constants.html#validationstatustype
		 *
		 * @return {string}
		 */
		const errorLookupStatus = computed( () => {
			if ( !hasFieldErrors.value ) {
				return 'default';
			}

			// Check if any field error is of type 'error'
			const hasError = fieldErrors.value.some( ( error ) => error.type === 'error' );
			if ( hasError ) {
				return 'error';
			}

			// All field errors are warnings
			return 'warning';
		} );

		/**
		 * Returns the array of zids to pass as the wikilambdasearch_type
		 * parameter to the wikilambdasearch_labels API.
		 *
		 * @return {Array}
		 */
		const lookupTypes = computed( () => {
			const types = [];
			// If type is set, add to the array
			if ( props.type ) {
				types.push( props.type );
			}
			// If type=Z4, we allow Z7s that return Z4s
			if ( props.type === Constants.Z_TYPE ) {
				types.push( Constants.Z_FUNCTION_CALL );
			}
			// Return array of types if any
			return types.length ? types : undefined;
		} );

		/**
		 * Returns the array of zids to pass as the wikilambdasearch_return_type
		 * parameter to the wikilambdasearch_labels API.
		 *
		 * @return {Array}
		 */
		const lookupReturnTypes = computed( () => {
			const types = [];
			// If return type is set, we add type and Z1
			if ( props.returnType ) {
				types.push( props.returnType );
			}
			// If type=Z4, we allow Z7s that return Z4s or Z1s
			if ( props.type === Constants.Z_TYPE ) {
				types.push( Constants.Z_TYPE );
			}
			// If return type is defined but strictReturnType=false, we add Z1
			if ( types.length > 0 && !props.strictReturnType ) {
				types.push( Constants.Z_OBJECT );
			}
			// Return array of return types if any
			return types.length ? types : undefined;
		} );

		// Methods
		/**
		 * Load more values for the enumeration selector when the user scrolls to the bottom of the list
		 * and there are more results to load.
		 */
		function onLoadMoreSelect() {
			store.fetchEnumValues( { type: props.type } );
		}

		/**
		 * Reset the abort controller and return the signal.
		 *
		 * @return {AbortSignal}
		 */
		function resetAbortController() {
			if ( lookupAbortController ) {
				lookupAbortController.abort();
			}
			lookupAbortController = new AbortController();
			return lookupAbortController.signal;
		}

		/**
		 * Determines the appropriate icon for a lookup result based on its type.
		 *
		 * @param {Object} result - The lookup result object
		 * @return {string|undefined} The icon name or undefined
		 */
		function getMenuItemIcon( result ) {
			// If we expect to receive functions along with other literal types, show icon
			if (
				!lookupTypes.value ||
				( lookupTypes.value.length > 1 && lookupTypes.value.includes( Constants.Z_FUNCTION ) )
			) {
				// If the result is a function, show the function icon
				return result.page_type === Constants.Z_FUNCTION ?
					icons.cdxIconFunction :
					icons.cdxIconInstance;
			}
			return undefined;
		}

		/**
		 * Builds a menu item object from a lookup result.
		 *
		 * @param {Object} result - The lookup result from the API
		 * @return {Object} A menu item object for Codex
		 */
		function buildMenuItem( result ) {
			const value = result.page_title;
			const label = getLabelOrZid( value, result.label );
			const description = getLabelOrZid( result.page_type, result.type_label );
			const supportingText = ( label !== result.match_label ) ? `(${ result.match_label })` : '';
			const icon = getMenuItemIcon( result );

			return {
				value,
				label,
				description,
				supportingText,
				icon
			};
		}

		/**
		 * Updates the lookup configuration with new search data.
		 *
		 * @param {string} searchQuery - The search query string
		 * @param {string|null} searchContinue - The search continuation token
		 */
		function updateLookupConfig( searchQuery, searchContinue ) {
			lookupConfig.value.searchQuery = searchQuery;
			lookupConfig.value.searchContinue = searchContinue;
		}

		/**
		 * Processes lookup response data and updates the lookup results.
		 *
		 * @param {Object} data - The response data from the API
		 * @param {string} input - The original search input
		 */
		function handleLookupResponse( data, input ) {
			const { labels, searchContinue } = data;

			// Clear results if this is a new search (not a continuation)
			if ( !lookupConfig.value.searchContinue ) {
				lookupResults.value = [];
			}

			// Update lookup configuration
			updateLookupConfig( input, searchContinue );

			// Process labels if available
			if ( !labels || labels.length === 0 ) {
				return;
			}

			const zids = [];
			const newMenuItems = [];

			labels.forEach( ( result ) => {
				const menuItem = buildMenuItem( result );
				const value = menuItem.value;

				// Exclude everything in the exclude Zids and disallowed types lists
				if ( !isExcludedZid( value ) ) {
					newMenuItems.push( menuItem );
				}

				// Gather all zids to request them for the data store
				zids.push( value );
			} );

			// Add new menu items to lookup results
			lookupResults.value.push( ...newMenuItems );

			// Fetch and collect all the data;
			// store.fetchZids makes sure that only the missing zids are requested
			if ( zids.length > 0 ) {
				store.fetchZids( { zids } );
			}
		}

		/**
		 * Handle lookup error.
		 *
		 * @param {Error} error
		 * @param {string} searchTerm
		 */
		function handleLookupError( error, searchTerm ) {
			if ( error.code === 'abort' ) {
				return;
			}
			lookupConfig.value.searchQuery = searchTerm;
			if ( !lookupConfig.value.searchContinue ) {
				lookupResults.value = [];
			}
		}

		/**
		 * Handle get zObject lookup.
		 * update lookup results with label and update in store.
		 *
		 * @param {string} input
		 */
		function getLookupResults( input ) {
			const signal = resetAbortController();
			store.lookupZObjectLabels( {
				input,
				types: lookupTypes.value,
				returnTypes: lookupReturnTypes.value,
				searchContinue: lookupConfig.value.searchContinue,
				signal
			} ).then( ( data ) => {
				handleLookupResponse( data, input );
			} ).catch( ( error ) => handleLookupError( error, input ) );
		}

		/**
		 * Load more Lookup results when the user scrolls to the bottom of the list
		 * and there are more results to load.
		 */
		function onLoadMoreLookup() {
			if ( !lookupConfig.value.searchContinue ) {
				// No more results to load
				return;
			}
			getLookupResults( lookupConfig.value.searchQuery );
		}

		/**
		 * On field input, perform a backend lookup and set the lookupResults
		 * array. When searching for a Zid, validate and select.
		 *
		 * @param {string} input
		 */
		function onInput( input ) {
			inputValue.value = input;
			emit( 'input-change', input || '' );

			// Clear field errors
			clearFieldErrors();

			// Clear searchContinue when a new search is initiated
			lookupConfig.value.searchContinue = null;

			// If input is empty, reset lookupResults
			if ( !input ) {
				lookupResults.value = [];
				return;
			}

			// Search after 300 ms
			clearTimeout( lookupDelayTimer );
			lookupDelayTimer = setTimeout( () => {
				getLookupResults( input );
			}, lookupDelayMs );
		}

		/**
		 * On focus, if there is an inputValue and the lookupResults are empty,
		 * get the lookup results for the inputValue.
		 * This ensures that the lookup results are populated when the field is focused,
		 * especially when the field is mounted.
		 */
		function onFocus() {
			if ( inputValue.value && !lookupResults.value.length ) {
				getLookupResults( inputValue.value );
			}
		}

		/**
		 * Model update event, sets the value of the field
		 * either with an empty value or with a selected value
		 * from the menu.
		 *
		 * @param {string | null} value
		 */
		function onSelect( value ) {
			// T374246: update:selected events are emitted with null value
			// whenever input changes, so we need to exit early whenever
			// selected value is null, instead of setting the value to empty
			// for now. When Codex fixes this issue, we'll be able to remove
			// the following lines and restore the clear behavior.
			if ( value === null ) {
				return;
			}

			// If the already selected value is selected again, exit early
			// and reset the input value to the selected value (T382755).
			if ( selectedValue.value === value ) {
				inputValue.value = selectedLabel.value;
				return;
			}

			// If we select a new value, clear errors and emit select event
			// Once the parent responds to the select event and updates the
			// selected value, the computed property selectedValue will be
			// updated.
			clearFieldErrors();
			emit( 'select-item', value || '' );
		}

		/**
		 * On blur, handle various states of input and selection
		 */
		function onBlur() {
			// On blur, these are the possible states:
			// * inputValue is empty
			// * inputValue is non-empty
			// * selectedValue is empty
			// * selectedValue is not empty

			// This means that the possible cases are:
			// 1. Nothing is selected previously, and we blur with empty text field
			// 2. Nothing is selected previously, and we blur with string in the input:
			//    2.a. The field text doesn't match any lookup options
			//         E.g. we write "str", nothing that we want comes in the lookup,
			//         and we exit the field.
			//    2.b. The field text matches one lookup option.
			//         E.g. we write "String", we see "String" in the lookup and we exit
			//         thinking that writing the option will be enough
			// 3. Something is selected previously, and we blur with empty text field
			// 4. Something is selected previously, and we blur with non-empty text field
			//    4.a. The field text doesn't match any lookup options
			//    4.b. The field text matches one lookup option
			//    4.c. The field text matches the already selected label

			// Logic:
			// Nothing selected:
			// * match?: set selectedValue
			// * no match?: clear inputValue
			// Something selected:
			// * match already selected?: do nothing
			// * match?: set selectedValue
			// * no match?: set inputValue to selectedLabel

			// If current inputValue matches selected label, do nothing:
			if ( inputValue.value === selectedLabel.value ) {
				return;
			}

			// Match current inputValue with available menu options:
			const match = lookupResults.value.find( ( option ) => option.label === inputValue.value );
			if ( match ) {
				// Select new value
				onSelect( match.value );
			} else {
				// Reset to old value
				inputValue.value = selectedLabel.value;
				lookupConfig.value.searchQuery = selectedLabel.value;
			}
		}

		// Watch
		/**
		 * When label of selected Zid is updated, updates
		 * the input value shown in the field.
		 */
		watch( selectedLabel, ( label ) => {
			inputValue.value = label;
		} );

		/**
		 * When isEnum flag changes (due to a type change, or
		 * due to delayed retrieval of type data), it initializes
		 * the fetching of the enum values.
		 */
		watch( isEnum, ( value ) => {
			if ( value ) {
				store.fetchEnumValues( { type: props.type, limit: Constants.API_ENUMS_FIRST_LIMIT } );
			}
		} );

		// Lifecycle
		onMounted( () => {
			inputValue.value = selectedLabel.value;
			if ( isEnum.value ) {
				store.fetchEnumValues( { type: props.type, limit: Constants.API_ENUMS_FIRST_LIMIT } );
			}
		} );

		// Return all properties and methods for the template
		return {
			enumValues,
			errorLookupStatus,
			fieldErrors,
			hasFieldErrors,
			inputValue,
			isEnum,
			lookupConfig,
			lookupPlaceholder,
			menuItems,
			onBlur,
			onFocus,
			onInput,
			onLoadMoreLookup,
			onLoadMoreSelect,
			onSelect,
			selectConfig,
			selectedValue,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-object-selector {
	.ext-wikilambda-app-object-selector__errors {
		margin-top: @spacing-50;
	}

	.ext-wikilambda-app-object-selector__suggestion {
		// Override the default Codex menu item weight
		.cdx-menu-item__text__label,
		.cdx-search-result-title {
			font-weight: @font-weight-normal;
		}
	}
}
</style>
