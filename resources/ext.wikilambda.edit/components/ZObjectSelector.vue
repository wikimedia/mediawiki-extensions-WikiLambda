<template>
	<!--
		WikiLambda Vue interface module for selecting any ZObject,
		with lookup on name.
		Receives an input parameter to filter the type of ZObjects that
		it will search and display (e.g. Z4 for selecting only types)

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<span
		class="ext-wikilambda-select-zobject"
		:class="{ 'ext-wikilambda-select-zobject__fitted': fitWidth }"
		:style="{ width: fieldWidth }"
	>
		<!-- Show link when we are in view mode -->
		<div
			v-if="isViewMode"
			class="ext-wikilambda-select-zobject__link"
		>
			<a
				:href="selectedUrl"
				target="_blank"
			>{{ selectedLabel }}</a>
		</div>
		<!-- TODO (T336290): add error state when implemented in codex -->
		<!-- Show fields when edit is false -->
		<template v-else>
			<cdx-lookup
				:key="lookupKey"
				v-model:selected="selectedValue"
				:disabled="disabled"
				:class="{ 'ext-wikilambda-select-zobject__input-invalid': validatorIsInvalid }"
				:placeholder="lookupPlaceholder"
				:menu-items="lookupResults"
				:end-icon="lookupIcon"
				:initial-input-value="selectedLabel"
				:status="errorLookupStatus"
				@update:selected="onSelect"
				@input="onInput"
				@focusout="onFocusOut"
				@focus="onFocus"
			>
				<template #no-results>
					{{ $i18n( 'wikilambda-zobjectselector-no-results' ).text() }}
				</template>
			</cdx-lookup>
			<cdx-message
				v-if="validatorIsInvalid"
				:inline="true"
				type="error"
			>{{ validatorErrorMessage }}</cdx-message>
			<cdx-message
				v-if="errorState"
				class="ext-wikilambda-select-zobject__error"
				:type="errorType"
				inline
			>{{ errorMessage }}</cdx-message>
		</template>
	</span>
</template>

<script>
var Constants = require( '../Constants.js' ),
	CdxLookup = require( '@wikimedia/codex' ).CdxLookup,
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	validator = require( '../mixins/validator.js' ),
	typeUtils = require( '../mixins/typeUtils.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	icons = require( '../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'wl-z-object-selector',
	components: {
		'cdx-message': CdxMessage,
		'cdx-lookup': CdxLookup
	},
	mixins: [ validator, typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		rowId: {
			type: Number,
			default: 0
		},
		selectedZid: {
			type: String,
			default: ''
		},
		edit: {
			type: [ Boolean, undefined ],
			required: false,
			default: undefined
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
		fitWidth: {
			type: Boolean,
			default: false
		},
		placeholder: {
			type: [ String, Object ],
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
	emits: [ 'input', 'focus', 'focus-out' ],
	data: function () {
		return {
			active: false,
			lookupKey: 1,
			lookupResults: [],
			lookupDelayTimer: null,
			lookupDelayMs: 300,
			inputValue: ''
		};
	},
	computed: $.extend( {}, mapGetters( [
		'getLabel',
		'getLabelData',
		'getPersistedObject',
		'getErrors'
	] ), {

		/**
		 * Returns edit mode depending on the global viewmode
		 * injected property and the edit property. Edit property
		 * overwrites the global viewmode prop.
		 *
		 * @return {boolean}
		 */
		isViewMode: function () {
			if ( this.edit !== undefined ) {
				return !this.edit;
			}
			return !!this.viewmode;
		},

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
		 * URL of the selected Zid. Will only be shown when edit is false.
		 *
		 * @return {string}
		 */
		selectedUrl: function () {
			return this.selectedZid ?
				new mw.Title( this.selectedZid ).getUrl() :
				'';
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
				this.getLabel( this.selectedZid ) :
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
				case Constants.Z_NATURAL_LANGUAGE:
					return this.$i18n( 'wikilambda-editor-label-addlanguage-label' ).text();
				case Constants.Z_TYPE:
					return this.$i18n( 'wikilambda-typeselector-label' ).text();
				default:
					return this.$i18n( 'wikilambda-zobjectselector-label' ).text();
			}
		},

		/**
		 * This computed property calculates the width of the field depending on its value
		 *
		 * TODO (T336291): Because this is a not a monospace font, the larger the word is, the
		 * less space it occupies in ch, so probably we should remove a %:
		 *
		 * > 1ch is usually wider than the average character width, usually by around 20-30%
		 *
		 * Refs:
		 * https://stackoverflow.com/questions/3392493/adjust-width-of-input-field-to-its-input
		 * https://meyerweb.com/eric/thoughts/2018/06/28/what-is-the-css-ch-unit/
		 *
		 * @return {string}
		 */
		fieldWidth: function () {
			if ( !this.fitWidth ) {
				return 'auto';
			}
			if ( this.active ) {
				return '100%';
			}
			// If no value or placeholder, default is 20 characters
			var chars = 20;
			if ( this.selectedLabel && ( this.selectedLabel.length > 0 ) ) {
				// Two extra characters to account for inner padding
				chars = this.selectedLabel.length + 6;
			} else if ( this.lookupPlaceholder && ( this.lookupPlaceholder.length > 0 ) ) {
				chars = this.lookupPlaceholder.length + 6;
			}
			// Subtract 20%
			chars = Math.ceil( chars - chars * 0.1 );
			return `${chars}ch`;
		},

		/**
		 * Returns whether the code object is in an error state
		 *
		 * @return {boolean}
		 */
		errorState: function () {
			// the error is not guaranteed to exist
			if ( this.getErrors[ this.rowId ] ) {
				return this.getErrors[ this.rowId ].state;
			}
			return false;
		},

		/**
		 * Returns the localized text that describes the error, if any,
		 * else returns an emoty string.
		 *
		 * @return {string}
		 */
		errorMessage: function () {
			if ( this.getErrors[ this.rowId ] && this.getErrors[ this.rowId ].state ) {
				const messageStr = this.getErrors[ this.rowId ].message;
				// TODO (T336873): These messages could be arbitrary and might not be defined.
				// eslint-disable-next-line mediawiki/msg-doc
				return this.$i18n( messageStr ).text();
			}
			return '';
		},

		/**
		 * Returns the string identifying the error type, if any,
		 * else returns undefined.
		 *
		 * @return {string | undefined}
		 */
		errorType: function () {
			return this.getErrors[ this.rowId ] ? this.getErrors[ this.rowId ].type : undefined;
		},

		/**
		 * Status property for the Lookup component (ValidateStatusType).
		 * Can take the values 'default' or 'error':
		 * https://doc.wikimedia.org/codex/latest/components/types-and-constants.html#validationstatustype
		 *
		 * @return {string}
		 */
		errorLookupStatus: function () {
			return this.errorState ? 'error' : 'default';
		}
	} ),
	methods: $.extend( {},
		mapActions( [
			'lookupZObject',
			'fetchZKeys',
			'setError'
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
				return ( ( this.excludeZids.indexOf( zid ) !== -1 ) || this.isDisallowedType( zid ) );
			},

			/**
			 * Whether is in the built-in list of Zids excluded from selection.
			 *
			 * TODO (T336292): this is too opinionated for this component, this should
			 * depend on what role this component has with respect to the whole ZObject.
			 * For example a Z3 cannot be chosen as a root object, but can be
			 * chosen as a type.
			 *
			 * @param {string} zid
			 * @return {boolean}
			 */
			isDisallowedType: function ( zid ) {
				return (
					( this.type === Constants.Z_TYPE ) &&
					( Constants.EXCLUDED_Z_TYPES.indexOf( zid ) !== -1 )
				);
			},

			/**
			 * Whether the selected zid fits the type restrictions according
			 * to the type set as prop. If there's no type set, returns true
			 *
			 * @param {string} zid
			 * @return {boolean}
			 */
			hasValidType: function ( zid ) {
				// If the input property type is not set, accept any zid:
				if ( !this.type ) {
					return true;
				}
				// Else, check that the selected zid has a matching type:
				const fetchedObject = this.getPersistedObject( zid );
				const zidType = fetchedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ];
				return ( this.type === zidType );
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
					returnType: this.returnType
				} ).then( ( payload ) => {
					// If the string searched has changed, do not show the search result
					if ( this.inputValue.indexOf( input ) === -1 ) {
						return;
					}
					const getZkeys = [];
					this.lookupResults = [];
					// Update lookupResults list
					if ( payload && payload.length > 0 ) {
						payload.forEach( ( result ) => {
							const value = result.page_title;
							const label = result.label;
							// Exclude everything in the exclude Zids and disallowed types lists
							if ( !this.isExcludedZid( value ) ) {
								this.lookupResults.push( { value, label } );
							}
							// Gather all zids to request them for the data store
							getZkeys.push( value );
						} );
						// Once lookupResults are gathered, fetch and collect all the data;
						// fetchZKeys makes sure that only the missing zids are requested
						this.fetchZKeys( { zids: getZkeys } );
					} else {
						this.validatorSetError( 'wikilambda-noresult' );
					}
				} );
			},

			/**
			 * Allow the field to receive a Zid instead of a label and,
			 * if valid and it exists, select and submit it.
			 * If the selector restricts the type, check that the ZObject
			 * type fits this restriction.
			 *
			 * @param {string} zid string that is already a valid Zid
			 */
			validateZidInput: function ( zid ) {
				// The input Zid is in the excluded list: do nothing
				if ( this.isExcludedZid( zid ) ) {
					return;
				}

				// I the Zid has the correct format, validate and select.
				// If the object is not yet saved in the store, fetch and then validate.
				const fetchedObject = this.getPersistedObject( zid );
				if ( fetchedObject ) {
					this.validateAndSelectZid( zid );
				} else {
					this.fetchZKeys( { zids: [ zid ] } ).then( () => {
						this.validateAndSelectZid( zid );
					} );
				}
			},

			/**
			 * Validate the selected Zid by checking that the selected Zid
			 * passes all the type restrictions, and if there's no error,
			 * select. This method is called when the object is already fetched
			 * and saved in the store. If it's not found, the store will
			 * return empty.
			 *
			 * @param {string} zid string of a fetched and valid Zid
			 */
			validateAndSelectZid: function ( zid ) {
				const fetchedObject = this.getPersistedObject( zid );

				// If not stored, it has been requested and nothing
				// was returned, which means the Zid is invalid:
				if ( !fetchedObject ) {
					this.clearResults();
					this.validatorSetError( 'wikilambda-invalidzobject' );
					return;
				}

				// If it's stored but its type doesn't fit the requested
				// type restrictions, the Zid is invalid:
				if ( !this.hasValidType( zid ) ) {
					this.clearResults();
					this.validatorSetError( 'wikilambda-invalidzobject' );
					return;
				}

				// Add the selected Zid into the lookupResults
				const label = this.getLabel( zid );
				this.lookupResults = [ {
					value: zid,
					label: `${label} (${zid})`
				} ];
			},

			/**
			 * Clears the ZObjectSelector field value and menu items.
			 * This is used from the components:
			 * * ZLabelsBlock (TODO (T324242): soon to be removed)
			 * * main-types/ZMultilingualString (TODO (T324242): soon to be removed)
			 * * FunctionEditorLanguage
			 */
			clearResults: function () {
				this.lookupResults = [];
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
				this.validatorResetError();

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
					if ( this.isValidZidFormat( input.toUpperCase() ) ) {
						this.validateZidInput( input.toUpperCase() );
					} else {
						this.getLookupResults( input );
					}
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
				this.$emit( 'input', value );
				this.setError( {
					internalId: this.rowId,
					errorState: false
				} );
			},

			/**
			 * Focus out event sets active to false and controls width
			 * of the field if it's set to fitWidth=true
			 */
			onFocusOut: function () {
				this.active = false;
				this.$emit( 'focus-out' );
			},

			/**
			 * Focus event sets active to true and controls width
			 * of the field if it's set to fitWidth=true
			 */
			onFocus: function () {
				this.active = true;
				this.$emit( 'focus' );
			}
		}
	),
	watch: {
		selectedLabel: {
			handler: function () {
				// Trigger a rerender when initial input value changes,
				// This might occur due to slow network request for a particular label
				// Also make sure not to trigger rerender if the user has typed an input
				if ( !this.inputValue ) {
					this.lookupKey += 1;
				}
			}
		}
	},
	mounted: function () {
		this.fetchZKeys( { zids: [
			Constants.Z_STRING,
			Constants.Z_REFERENCE,
			Constants.Z_BOOLEAN,
			Constants.Z_TYPED_LIST
		] } );
	}
};
</script>

<style lang="less">
@import '../ext.wikilambda.edit.less';

.ext-wikilambda-select-zobject {
	.cdx-text-input__input {
		min-width: auto;
	}

	&__fitted {
		transition: @wl-transition-field-expand;
		display: inline-block;

		.cdx-text-input__input {
			min-width: auto;
		}
	}

	.cdx-text-input__icon {
		svg {
			width: @size-75;
			height: @size-75;
			min-width: @size-75;
			min-height: @size-75;
		}
	}

	&__link {
		min-height: 32px;
		display: inline-flex;
		align-items: center;
	}

	a {
		display: inline-flex;
	}

	&__input-invalid {
		background: #fee;
		border: 2px #f00 solid;
	}

	&__error {
		padding-top: 6px;
		width: max-content;
	}
}
</style>
