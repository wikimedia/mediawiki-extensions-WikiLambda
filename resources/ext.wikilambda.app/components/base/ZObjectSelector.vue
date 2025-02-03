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
			:selected="selectedValue"
			:disabled="disabled"
			:menu-items="enumValues"
			:menu-config="selectConfig"
			@update:selected="onSelect"
			@load-more="loadMoreValues"
		></cdx-select>
		<cdx-lookup
			v-else
			v-model:input-value="inputValue"
			:selected="selectedValue"
			:disabled="disabled"
			:placeholder="lookupPlaceholder"
			:menu-items="menuItems"
			:menu-config="lookupConfig"
			:end-icon="lookupIcon"
			:status="errorLookupStatus"
			data-testid="z-object-selector-lookup"
			@update:selected="onSelect"
			@update:input-value="onInput"
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
				:key="'field-error-' + rowId + '-' + index"
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
const { CdxLookup, CdxSelect, CdxMessage } = require( '@wikimedia/codex' );
const { defineComponent } = require( 'vue' );
const Constants = require( '../../Constants.js' ),
	errorUtils = require( '../../mixins/errorUtils.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	{ mapActions, mapGetters } = require( 'vuex' ),
	icons = require( '../../../lib/icons.json' );

module.exports = exports = defineComponent( {
	name: 'wl-z-object-selector',
	components: {
		'cdx-message': CdxMessage,
		'cdx-select': CdxSelect,
		'cdx-lookup': CdxLookup
	},
	mixins: [ errorUtils, typeUtils ],
	props: {
		rowId: {
			type: Number,
			default: 0
		},
		selectedZid: {
			type: String,
			default: ''
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		type: {
			type: String,
			default: ''
		},
		returnType: {
			type: String,
			default: ''
		},
		strictType: {
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
	emits: [ 'input' ],
	data: function () {
		return {
			inputValue: '',
			lookupResults: [],
			lookupConfig: {
				boldLabel: true,
				searchQuery: '',
				visibleItemLimit: 5
			},
			lookupDelayTimer: null,
			lookupDelayMs: 300,
			selectConfig: {
				visibleItemLimit: 5
			}
		};
	},
	computed: Object.assign( mapGetters( [
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
		 * Returns the menu items for the enumeration value selector
		 *
		 * @return {Array}
		 */
		enumValues: function () {
			return this.getEnumValues( this.type ).map( ( item ) => {
				const value = item.page_title;
				const label = this.getLabelOrZid( value, item.label );
				return { value, label };
			} );
		},

		/**
		 * Icon to display at the end of the Codex Lookup selector
		 *
		 * @return {string}
		 */
		lookupIcon: function () {
			return icons.cdxIconExpand;
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
		}
	} ),
	methods: Object.assign( {},
		mapActions( [
			'lookupZObjectLabels',
			'fetchEnumValues',
			'fetchZids'
		] ),
		{
			/**
			 * Load more values for the enumeration selector
			 *
			 * @return {void}
			 */
			loadMoreValues: function () {
				this.fetchEnumValues( { type: this.type, isContinue: true } );
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
				this.lookupZObjectLabels( {
					input,
					type: this.type || undefined,
					returnType: this.returnType || undefined,
					strictType: this.strictType
				} ).then( ( payload ) => {
					// If the string searched has changed, do not show the search result
					if ( !this.inputValue.includes( input ) ) {
						return;
					}
					const zids = [];
					this.lookupConfig.searchQuery = input;
					this.lookupResults = [];
					// Update lookupResults list
					if ( payload && payload.length > 0 ) {
						payload.forEach( ( result ) => {

							// Set up codex MenuItem options
							// https://doc.wikimedia.org/codex/latest/components/demos/menu-item.html
							const value = result.page_title;
							const label = this.getLabelOrZid( value, result.label );
							const description = this.getLabelOrZid( result.page_type, result.type_label );
							const supportingText = ( label !== result.match_label ) ? `(${ result.match_label })` : '';
							// If return type is set, reflect mode with icon
							let icon;
							if ( this.returnType ) {
								icon = ( result.page_type === this.type ) ?
									icons.cdxIconInstance :
									icons.cdxIconFunction;
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
			},

			/**
			 * On field input, perform a backend lookup and set the lookupResults
			 * array. When searching for a Zid, validate and select.
			 *
			 * @param {string} input
			 */
			onInput: function ( input ) {
				this.clearFieldErrors();

				// If empty input, clear and exit
				if ( !input ) {
					this.clearResults();
					return;
				}

				// Just search if more than one characters
				if ( input.length < 2 ) {
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

				// If we select a new value, clear errors and emit input event
				// Once the parent responds to the input event and updates the
				// selected value, the computed property selectedValue will be
				// updated.
				this.clearFieldErrors();
				this.$emit( 'input', value || '' );
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
		}
	),
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
				this.fetchEnumValues( { type: this.type } );
			}
		}
	},
	mounted: function () {
		this.inputValue = this.selectedLabel;
		if ( this.isEnum ) {
			this.fetchEnumValues( { type: this.type } );
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-object-selector {
	// Style the custom chevron icon to be smaller
	.cdx-text-input__end-icon {
		width: @size-icon-x-small;
		height: @size-icon-x-small;
		min-width: @size-icon-x-small;
		min-height: @size-icon-x-small;
	}

	.ext-wikilambda-app-object-selector__errors {
		margin-top: @spacing-50;
		width: max-content;
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
