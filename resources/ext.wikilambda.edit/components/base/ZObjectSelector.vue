<!--
	WikiLambda Vue interface module for selecting any ZObject,
	with lookup on name.

	Receives an input parameter to filter the type of ZObjects that
	it will search and display (e.g. Z4 for selecting only types)

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<span class="ext-wikilambda-select-zobject">
		<!-- Show fields when edit is false -->
		<cdx-lookup
			:key="lookupKey"
			:selected="selectedValue"
			:disabled="disabled"
			:placeholder="lookupPlaceholder"
			:menu-items="lookupResults"
			:menu-config="lookupConfig"
			:end-icon="lookupIcon"
			:initial-input-value="selectedLabel"
			:status="errorLookupStatus"
			data-testid="z-object-selector-lookup"
			@update:selected="onSelect"
			@input="onInput"
		>
			<template #no-results>
				{{ $i18n( 'wikilambda-zobjectselector-no-results' ).text() }}
			</template>
		</cdx-lookup>
		<div
			v-if="hasFieldErrors"
			class="ext-wikilambda-select-zobject__errors"
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
const { defineComponent } = require( 'vue' );
const Constants = require( '../../Constants.js' ),
	CdxLookup = require( '@wikimedia/codex' ).CdxLookup,
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	errorUtils = require( '../../mixins/errorUtils.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	icons = require( '../../../../lib/icons.json' );

module.exports = exports = defineComponent( {
	name: 'wl-z-object-selector',
	components: {
		'cdx-message': CdxMessage,
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
			lookupKey: 1,
			lookupResults: [],
			lookupConfig: {
				boldLabel: true,
				searchQuery: ''
			},
			lookupDelayTimer: null,
			lookupDelayMs: 300,
			inputValue: ''
		};
	},
	computed: Object.assign( mapGetters( [
		'getLabelData'
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
			'lookupZObject',
			'fetchZids'
		] ),
		{
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
			 * update lookup results with label and update  in store.
			 *
			 * @param {string} input
			 */
			getLookupResults: function ( input ) {
				this.lookupZObject( {
					input,
					type: this.type,
					returnType: this.returnType,
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
							const label = result.label;
							const description = result.type_label;
							const supportingText = ( result.label !== result.match_label ) ? `(${ result.match_label })` : '';
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
					} else {
						this.setSuggestions();
					}
				} );
			},

			/**
			 * Clears the ZObjectSelector lookup results.
			 * This doesn't clear the component TextInput.
			 */
			clearResults: function () {
				this.lookupResults = [];
				this.setSuggestions();
				this.inputValue = '';
			},

			/**
			 * On field input, perform a backend lookup and set the lookupResults
			 * array. When searching for a Zid, validate and select.
			 *
			 * @param {string} input
			 */
			onInput: function ( input ) {
				this.inputValue = input;
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
			 * @param {string} value
			 */
			onSelect: function ( value ) {
				this.clearFieldErrors();
				this.$emit( 'input', value );
			},

			/**
			 * Reset lookup to suggestions by type
			 */
			setSuggestions: function () {
				if ( !this.type ) {
					return;
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
						return;
				}

				this.lookupResults.push( {
					label: title,
					value: 'suggestion',
					disabled: true
				} );

				suggestedZids.forEach( ( zid ) => {
					this.lookupResults.push( {
						value: zid,
						label: this.getLabelData( zid ).label,
						description: this.getLabelData( this.type ).label,
						class: 'ext-wikilambda-select-zobject-suggestion'
					} );
				} );
			}
		}
	),
	watch: {
		selectedLabel: function () {
			// Trigger a rerender when initial input value changes,
			// This might occur due to slow network request for a particular label
			// Also make sure not to trigger rerender if the user has typed an input
			if ( !this.inputValue ) {
				this.lookupKey += 1;
			}
		},
		type: function () {
			this.setSuggestions();
		}
	},
	mounted: function () {
		this.setSuggestions();
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-select-zobject {
	.cdx-text-input__end-icon {
		width: @size-icon-x-small;
		height: @size-icon-x-small;
		min-width: @size-icon-x-small;
		min-height: @size-icon-x-small;
	}

	&__link {
		min-height: 32px;
		display: inline-flex;
		align-items: center;
	}

	a {
		display: inline-flex;
	}

	&__errors {
		margin-top: @spacing-50;
		width: max-content;
	}

	.cdx-menu {
		.cdx-menu-item.ext-wikilambda-select-zobject-suggestion {
			.cdx-menu-item__text__label,
			.cdx-search-result-title {
				font-weight: @font-weight-normal;
			}
		}
	}
}
</style>
