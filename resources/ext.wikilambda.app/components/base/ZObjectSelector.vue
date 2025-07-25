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
		>
			<template #no-results>
				{{ $i18n( 'wikilambda-zobjectselector-no-results' ).text() }}
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
				<!-- eslint-disable vue/no-v-html -->
				<div v-html="getErrorMessage( error )"></div>
			</cdx-message>
		</div>
	</span>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const errorMixin = require( '../../mixins/errorMixin.js' );
const typeMixin = require( '../../mixins/typeMixin.js' );
const useMainStore = require( '../../store/index.js' );
const icons = require( '../../../lib/icons.json' );

// Codex components
const { CdxLookup, CdxSelect, CdxMessage } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-object-selector',
	components: {
		'cdx-message': CdxMessage,
		'cdx-select': CdxSelect,
		'cdx-lookup': CdxLookup
	},
	mixins: [ errorMixin, typeMixin ],
	props: {
		keyPath: { // eslint-disable-line vue/no-unused-properties
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
	data: function () {
		return {
			inputValue: '',
			lookupResults: [],
			lookupConfig: {
				boldLabel: true,
				searchQuery: '',
				visibleItemLimit: 5,
				searchContinue: null
			},
			lookupDelayTimer: null,
			lookupDelayMs: 300,
			lookupAbortController: null,
			selectConfig: {
				visibleItemLimit: 5
			}
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLabelData',
		'getEnumValues',
		'isEnumType',
		'getUserRequestedLang'
	] ), {
		/**
		 * Value model for the internal codex lookup component. It
		 * must be null or the value (Zid) of the selected MenuItem.
		 *
		 * @return {string}
		 */
		selectedValue: function () {
			return this.selectedZid || null;
		},

		/**
		 * Human readable label for the selected Zid in the
		 * user language or closest fallback. If the label is
		 * not available it returns the input.
		 *
		 * @return {string}
		 */
		selectedLabel: function () {
			return this.selectedZid ?
				this.getLabelData( this.selectedZid ).label :
				'';
		},

		/**
		 * Returns lookupResults if there are any items,
		 * else returns the suggestions for the type.
		 *
		 * @return {Array}
		 */
		menuItems: function () {
			return this.lookupResults.length > 0 ? this.lookupResults : this.suggestions;
		},

		/**
		 * Returns the computed suggestions for the given type.
		 *
		 * @return {Array}
		 */
		suggestions: function () {
			if ( !this.type ) {
				return [];
			}

			let title = '';
			let suggestedZids = [];
			switch ( this.type ) {
				case Constants.Z_NATURAL_LANGUAGE:
					title = this.$i18n( 'wikilambda-object-selector-suggested-languages' ).text();
					suggestedZids = Constants.SUGGESTIONS.LANGUAGES;
					break;
				case Constants.Z_TYPE:
					title = this.$i18n( 'wikilambda-object-selector-suggested-types' ).text();
					suggestedZids = Constants.SUGGESTIONS.TYPES;
					break;
				default:
					return [];
			}

			const suggestions = [];
			// Add dropdown title
			suggestions.push( {
				label: title,
				value: 'suggestion',
				disabled: true
			} );

			// Add one item per suggested Zid
			suggestedZids.forEach( ( zid ) => {
				suggestions.push( {
					value: zid,
					label: this.getLabelData( zid ).label,
					description: this.getLabelData( this.type ).label,
					class: 'ext-wikilambda-app-object-selector__suggestion'
				} );
			} );

			return suggestions;
		},

		/**
		 * Returns whether the type is an enumeration
		 *
		 * @return {boolean}
		 */
		isEnum: function () {
			return this.isEnumType( this.type );
		},

		/**
		 * Returns the menu items for the enum selector.
		 * By passing selected Zid to getEnumValues getter, it will manually
		 * include this item in the enum list if:
		 * * it's not part of the first page of enum values
		 * * it's a valid instance of the enum type
		 *
		 * @return {Array}
		 */
		enumValues: function () {
			return this.getEnumValues( this.type, this.selectedZid ).map( ( item ) => {
				const value = item.page_title;
				const label = this.getLabelOrZid( value, item.label );
				return { value, label };
			} );
		},

		/**
		 * Returns the placeholder for the Lookup selector, either
		 * the value passed as an input prop, or a built-in message
		 * depending on the type.
		 *
		 * @return {string}
		 */
		lookupPlaceholder: function () {
			if ( this.placeholder ) {
				return this.placeholder;
			}
			switch ( this.type ) {
				case Constants.Z_FUNCTION:
					return this.$i18n( 'wikilambda-function-typeselector-label' ).text();
				case Constants.Z_NATURAL_LANGUAGE:
					return this.$i18n( 'wikilambda-editor-label-addlanguage-label' ).text();
				case Constants.Z_TYPE:
					return this.$i18n( 'wikilambda-typeselector-label' ).text();
				default:
					return this.$i18n( 'wikilambda-zobjectselector-label' ).text();
			}
		},

		/**
		 * Status property for the Lookup component (ValidateStatusType).
		 * Can take the values 'default' or 'error':
		 * https://doc.wikimedia.org/codex/latest/components/types-and-constants.html#validationstatustype
		 *
		 * @return {string}
		 */
		errorLookupStatus: function () {
			return this.hasFieldErrors ? 'error' : 'default';
		},

		/**
		 * Returns the array of zids to pass as the wikilambdasearch_type
		 * parameter to the wikilambdasearch_labels API.
		 *
		 * @return {Array}
		 */
		lookupTypes: function () {
			const types = [];
			// If type is set, add to the array
			if ( this.type ) {
				types.push( this.type );
			}
			// If type=Z4, we allow Z7s that return Z4s
			if ( this.type === Constants.Z_TYPE ) {
				types.push( Constants.Z_FUNCTION_CALL );
			}
			// Return array of types if any
			return types.length ? types : undefined;
		},

		/**
		 * Returns the array of zids to pass as the wikilambdasearch_return_type
		 * parameter to the wikilambdasearch_labels API.
		 *
		 * @return {Array}
		 */
		lookupReturnTypes: function () {
			const types = [];
			// If return type is set, we add type and Z1
			if ( this.returnType ) {
				types.push( this.returnType );
			}
			// If type=Z4, we allow Z7s that return Z4s or Z1s
			if ( this.type === Constants.Z_TYPE ) {
				types.push( Constants.Z_TYPE );
			}
			// If return type is defined but strictReturnType=false, we add Z1
			if ( types.length > 0 && !this.strictReturnType ) {
				types.push( Constants.Z_OBJECT );
			}
			// Return array of return types if any
			return types.length ? types : undefined;
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'lookupZObjectLabels',
		'fetchEnumValues',
		'fetchZids'
	] ), {
		/**
		 * Load more values for the enumeration selector when the user scrolls to the bottom of the list
		 * and there are more results to load.
		 */
		onLoadMoreSelect: function () {
			this.fetchEnumValues( { type: this.type } );
		},

		/**
		 * Load more Lookup results when the user scrolls to the bottom of the list
		 * and there are more results to load.
		 */
		onLoadMoreLookup: function () {
			if ( !this.lookupConfig.searchContinue ) {
				// No more results to load
				return;
			}

			this.getLookupResults( this.lookupConfig.searchQuery );
		},

		/**
		 * Whether is in the input list of Zids excluded from selection.
		 * Al the zids in the excludeZids input property must be uppercase.
		 *
		 * @param {string} zid
		 * @return {boolean}
		 */
		isExcludedZid: function ( zid ) {
			return ( this.excludeZids.includes( zid ) || this.isDisallowedType( zid ) );
		},

		/**
		 * Whether is in the built-in list of Zids excluded from selection.
		 *
		 * @param {string} zid
		 * @return {boolean}
		 */
		isDisallowedType: function ( zid ) {
			return (
				( this.type === Constants.Z_TYPE ) &&
				Constants.EXCLUDE_FROM_SELECTOR.includes( zid )
			);
		},

		/**
		 * Handle get zObject lookup.
		 * update lookup results with label and update in store.
		 *
		 * @param {string} input
		 */
		getLookupResults: function ( input ) {
			// Cancel previous request if any
			if ( this.lookupAbortController ) {
				this.lookupAbortController.abort();
			}
			this.lookupAbortController = new AbortController();
			this.lookupZObjectLabels( {
				input,
				types: this.lookupTypes,
				returnTypes: this.lookupReturnTypes,
				searchContinue: this.lookupConfig.searchContinue,
				signal: this.lookupAbortController.signal
			} ).then( ( data ) => {
				const { labels, searchContinue } = data;
				const zids = [];
				// If searchContinue is present, store it in lookupConfig
				this.lookupConfig.searchContinue = searchContinue;
				this.lookupConfig.searchQuery = input;
				// Update lookupResults list
				if ( labels && labels.length > 0 ) {
					labels.forEach( ( result ) => {
						// Set up codex MenuItem options
						// https://doc.wikimedia.org/codex/latest/components/demos/menu-item.html
						const value = result.page_title;
						const label = this.getLabelOrZid( value, result.label );
						const description = this.getLabelOrZid( result.page_type, result.type_label );
						const supportingText = ( label !== result.match_label ) ? `(${ result.match_label })` : '';

						let icon;
						// If we expect to receive functions along with other literal types, show icon
						if ( !this.lookupTypes || ( this.lookupTypes.length > 1 &&
							this.lookupTypes.includes( Constants.Z_FUNCTION )
						) ) {
							icon = ( result.page_type === Constants.Z_FUNCTION ) ?
								icons.cdxIconFunction :
								icons.cdxIconInstance;
						} else {
							icon = undefined;
						}

						// Exclude everything in the exclude Zids and disallowed types lists
						if ( !this.isExcludedZid( value ) ) {
							this.lookupResults.push( {
								value,
								label,
								description,
								supportingText,
								icon
							} );
						}

						// Gather all zids to request them for the data store
						zids.push( value );
					} );
					// Once lookupResults are gathered, fetch and collect all the data;
					// fetchZids makes sure that only the missing zids are requested
					this.fetchZids( { zids } );
				}
			} ).catch( ( error ) => {
				if ( error.code === 'abort' ) {
					return;
				}
			} );
		},

		/**
		 * Returns the value when the user requested language is 'qqx',
		 * otherwise returns the label.
		 *
		 * @param {string} value
		 * @param {string} label
		 * @return {Object}
		 */
		getLabelOrZid: function ( value, label ) {
			// If the requested language is 'qqx', return (value/zid) as the label
			if ( this.getUserRequestedLang === 'qqx' ) {
				return `(${ value })`;
			}
			return label;
		},

		/**
		 * Clears the ZObjectSelector lookup results.
		 * This doesn't clear the component TextInput.
		 */
		clearResults: function () {
			this.lookupResults = [];
			// Reset searchContinue when a new search is initiated
			this.lookupConfig.searchContinue = null;
		},

		/**
		 * On field input, perform a backend lookup and set the lookupResults
		 * array. When searching for a Zid, validate and select.
		 *
		 * @param {string} input
		 */
		onInput: function ( input ) {
			// 1. OnInput will still be called when the selectedValue changes from outside.
			// 2. OnInput will be called with an empty string when the selectedValue does not match
			// an item in menuItems in the cdx-lookup.
			// 3. If #1 or #2 happens when the input is disabled, we should not do anything.
			if ( this.disabled ) {
				return;
			}
			this.inputValue = input;
			this.$emit( 'input-change', input || '' );

			this.clearFieldErrors();

			// Clear previous results when input changes
			this.clearResults();

			// Just search if more than one characters
			if ( !input || input.length < 2 ) {
				return;
			}

			// Search after 300 ms
			clearTimeout( this.lookupDelayTimer );
			this.lookupDelayTimer = setTimeout( () => {
				this.getLookupResults( input );
			}, this.lookupDelayMs );
		},

		/**
		 * Model update event, sets the value of the field
		 * either with an empty value or with a selected value
		 * from the menu.
		 *
		 * @param {string | null} value
		 */
		onSelect: function ( value ) {
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
			if ( this.selectedValue === value ) {
				this.inputValue = this.selectedLabel;
				return;
			}

			// If we select a new value, clear errors and emit select event
			// Once the parent responds to the select event and updates the
			// selected value, the computed property selectedValue will be
			// updated.
			this.clearFieldErrors();
			this.$emit( 'select-item', value || '' );
		},

		/**
		 * On Lookup blur, make sure that the input and the selected values
		 * are synchronized: If there is something written in the input but
		 * there is nothing selected, clear the input. If the input is empty,
		 * clear the selection
		 */
		onBlur: function () {
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
			if ( this.inputValue === this.selectedLabel ) {
				return;
			}

			// Match current inputValue with available menu options:
			const match = this.lookupResults.find( ( option ) => option.label === this.inputValue );
			if ( match ) {
				// Select new value
				this.onSelect( match.value );
			} else {
				// Reset to old value
				this.inputValue = this.selectedLabel;
				this.lookupConfig.searchQuery = this.selectedLabel;
			}
		}
	} ),
	watch: {
		/**
		 * When label of selected Zid is updated, updates
		 * the input value shown in the field.
		 *
		 * @param {string} label
		 */
		selectedLabel: function ( label ) {
			this.inputValue = label;
		},
		/**
		 * When isEnum flag changes (due to a type change, or
		 * due to delayed retrieval of type data), it initializes
		 * the fetching of the enum values.
		 *
		 * @param {boolean} value
		 */
		isEnum: function ( value ) {
			if ( value ) {
				// Fetch 20 enum values which usually is enough to show all enums directly
				this.fetchEnumValues( { type: this.type, limit: 20 } );
			}
		}
	},
	mounted: function () {
		this.inputValue = this.selectedLabel;
		if ( this.isEnum ) {
			// Fetch 20 enum values which usually is enough to show all enums directly
			this.fetchEnumValues( { type: this.type, limit: 20 } );
		}
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
