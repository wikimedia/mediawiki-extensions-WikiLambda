<template>
	<!--
		WikiLambda Vue interface module for selecting any ZObject,
		with autocompletion on name.
		Uses the base component AutocompleteSearchInput from MediaSearch
		Vue.js base components.
		Receives an input parameter to filter the type of ZObjects that
		it will search and display (e.g. Z4 for selecting only types)

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<span class="ext-wikilambda-select-zobject">
		<a
			v-if="readonly || viewmode"
			:href="'/wiki/' + selectedId"
			:target="referenceLinkTarget"
		>
			{{ selectedText }}
		</a>
		<sd-autocomplete-search-input
			v-else
			name="zobject-selector"
			:class="{ 'ext-wikilambda-zkey-input-invalid': validatorIsInvalid }"
			:label="placeholder"
			:placeholder="placeholder"
			:search-placeholder="$i18n( 'wikilambda-function-definition-inputs-item-selector-search-placeholder' )"
			:initial-value="selectedText"
			:lookup-results="lookupLabels"
			@input="onInput"
			@submit="onSubmit"
			@clear-lookup-results="onClearLookupResults"
		>
		</sd-autocomplete-search-input>
		<sd-message
			v-if="validatorIsInvalid"
			:inline="true"
			type="error"
		> {{ validatorErrorMessage }} </sd-message>
	</span>
</template>

<script>
var Constants = require( '../Constants.js' ),
	SdAutocompleteSearchInput = require( './base/AutocompleteSearchInput.vue' ),
	validator = require( '../mixins/validator.js' ),
	typeUtils = require( '../mixins/typeUtils.js' ),
	SdMessage = require( './base/Message.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	mapMutations = require( 'vuex' ).mapMutations;

// @vue/component
module.exports = {
	name: 'ZObjectSelector',
	components: {
		'sd-autocomplete-search-input': SdAutocompleteSearchInput,
		'sd-message': SdMessage
	},
	mixins: [ validator, typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		type: {
			type: String,
			default: ''
		},
		returnType: {
			type: String,
			default: ''
		},
		selectedId: {
			type: String,
			default: ''
		},
		placeholder: {
			type: [ String, Object ],
			default: ''
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			lookupResults: {},
			lookupDelayTimer: null,
			lookupDelayMs: 300,
			inputValue: '',
			validatorErrorMessages: [
				'wikilambda-noresult',
				'wikilambda-invalidzobject'
			],
			valueEmitted: false
		};
	},
	computed: $.extend( {},
		mapGetters( {
			zkeyLabels: 'getZkeyLabels',
			zKeys: 'getZkeys',
			zLang: 'getZLang'
		} ),
		{
			lookupLabels: function () {
				return Object.keys( this.lookupResults ).map( function ( key ) {
					var label = this.zkeyLabels[ key ],
						result = this.lookupResults[ key ];

					if ( label === result ) {
						return result;
					} else {
						return result + ' (' + label + ')';
					}
				}.bind( this ) );
			},
			selectedLabel: function () {
				return this.zkeyLabels[ this.selectedId ];
			},
			selectedText: function () {
				if ( this.selectedId ) {
					return this.selectedLabel;
				} else {
					return '';
				}
			},
			referenceLinkTarget: function () {
				if ( !( this.viewmode || this.readonly ) ) {
					return '_blank';
				}

				return;
			}
		}
	),
	methods: $.extend( {},
		mapActions( [
			'lookupZObject',
			'fetchZKeys'
		] ),
		mapMutations( [ 'addZKeyLabel' ] ),
		{
			isExcludedZType: function ( zid ) {
				return (
					( this.type === Constants.Z_TYPE ) &&
					( Constants.EXCLUDED_Z_TYPES.indexOf( zid ) !== -1 )
				);
			},
			hasValidType: function ( zid ) {
				var zidType = this.zKeys[ zid ][ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ];
				return ( !this.type || // Either the selection isn't type restricted
					(
						( this.type === zidType ) && // Or the specified type matches de ZObject type
						!this.isExcludedZType( zid ) // and ZID is not part of the EXCLUDED_Z_TYPES
					) );
			},

			/**
			 * Handle get zObject lookup.
			 * update lookup results with label and update zKeyLabels in store.
			 *
			 * @param {string} input
			 */
			getLookupResults: function ( input ) {
				var self = this,
					searchedString = input;
				this.lookupZObject( {
					input: input,
					type: this.type,
					returnType: this.returnType
				} ).then( function ( payload ) {
					// If the string searched has changed, do not show the search result
					if ( self.inputValue.indexOf( searchedString ) === -1 ) {
						return;
					}

					var zKeys = [];
					self.lookupResults = {};
					if ( payload && payload.length > 0 ) {
						payload.forEach(
							function ( result ) {
								var zid = result.page_title,
									label = result.label;
								// Update lookupResults list
								// If we are searching for Types (this.type === Constants.Z_TYPE)
								// we should exclude Z1, Z2, Z7 and Z9 from the results
								if ( !self.isExcludedZType( zid ) ) {
									self.lookupResults[ zid ] = label;
								}
								// Update zKeyLabels in the Vuex store
								if ( !( zid in self.zkeyLabels ) ) {
									self.addZKeyLabel( {
										key: zid,
										label: label
									} );

									zKeys.push( zid );
								}
							}
						);
						self.showList = true;

						self.fetchZKeys( zKeys );
					} else {
						self.validatorSetError( 'wikilambda-noresult' );
					}
				} );

			},

			/**
			 * Allow the field to receive a Zid instead of a label and,
			 * if valid and it exists, select and submit it.
			 * If the selector restricts the type, check that the ZObject
			 * type fits this restriction.
			 */
			validateZidInput: function () {
				var self = this,
					normalizedSearchValue = self.inputValue.toUpperCase();

				if ( self.isValidZidFormat( normalizedSearchValue ) ) {
					self.fetchZKeys( [
						normalizedSearchValue
					] ).then( function () {
						var label = '';
						self.lookupResults = {};
						// If data is returned, The value will show in the zKeys
						if (
							( normalizedSearchValue in self.zKeys ) &&
							( self.hasValidType( normalizedSearchValue ) )
						) {
							label = self.zkeyLabels[ normalizedSearchValue ];
							self.lookupResults[ label + ' (' + normalizedSearchValue + ')' ] = normalizedSearchValue;
							self.showList = true;
						} else {
							self.validatorSetError( 'wikilambda-invalidzobject' );
						}
					} );
				} else {
					self.validatorSetError( 'wikilambda-invalidzobject' );
				}
			},
			/**
			 * On Autocomplete field input, set a timer so that the lookup is not done immediately.
			 *
			 * @param {string} input
			 */
			onInput: function ( input ) {
				var self = this;
				this.valueEmitted = false;
				this.inputValue = input;

				// The `input` event is also emitted when the field is emptied.
				// We handle this case with the `onClearLookupResults` event instead.
				if ( !input ) {
					return;
				}

				this.validatorResetError();

				// Just search if more than one characters
				if ( input.length < 2 ) {
					return;
				}

				if ( self.isValidZidFormat( input.toUpperCase() ) ) {
					clearTimeout( this.lookupDelayTimer );
					this.lookupDelayTimer = setTimeout( function () {
						self.validateZidInput();
					}, this.lookupDelayMs );
				} else {
					self.getLookupResults( input );
				}
			},

			/**
			 * ZObject is selected, the component emits `input` event.
			 * This method is emitted on blur and on element click
			 *
			 * @param {string} item
			 */
			onSubmit: function ( item ) {
				var zId = '',
					inputValue;
				// we need to make sure that the input event is not triggered twice
				if ( this.valueEmitted === true ) {
					this.valueEmitted = false;
					return;
				}
				this.validatorResetError();
				if ( typeof item === 'object' ) {
					inputValue = this.inputValue;
				} else {
					inputValue = item;
				}

				// if the input value is empty, we don't want to do anything
				if ( inputValue.length <= 0 ) {
					return;
				}

				var match = '';
				var matchPercentage = 0;

				for ( var result in this.lookupResults ) {
					if (
						inputValue.indexOf( this.lookupResults[ result ] ) !== -1 &&
						( matchPercentage < this.lookupResults[ result ].length / inputValue.length )
					) {
						match = this.lookupResults[ result ];
						matchPercentage = this.lookupResults[ result ].length / inputValue.length;
					}
				}

				inputValue = match;

				// If the input is a valid Zid, set zId
				// Otherwise check if the text matches a label
				if ( this.isValidZidFormat( inputValue.toUpperCase() ) ) {
					zId = inputValue;
				} else {
					for ( var key in this.lookupResults ) {
						var label = this.lookupResults[ key ];

						if ( label === inputValue ) {
							zId = key;
							break;
						}
					}
				}
				if ( this.zkeyLabels[ zId ] ) {
					this.emitInput( zId );
					this.valueEmitted = true;
				} else {
					this.validatorSetError( 'wikilambda-invalidzobject' );
				}
			},
			/**
			 * The autocomplete field is empty or an item is selected,
			 * so it clears the list of suggestions.
			 */
			onClearLookupResults: function () {
				this.lookupResults = {};
			},
			emitInput: function ( zId ) {
				this.$emit( 'input', zId );
			}
		}
	)
};
</script>

<style lang="less">

.ext-wikilambda-select-zobject {
	display: inline-block;
}

.ext-wikilambda-select-zobject-input-invalid {
	background: #fee;
	border: 2px #f00 solid;
}

</style>
