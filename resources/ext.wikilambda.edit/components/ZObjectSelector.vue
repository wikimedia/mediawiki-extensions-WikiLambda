<template>
	<!--
		WikiLambda Vue interface module for selecting any ZObject,
		with autocompletion on name.
		Uses the base component AutocompleteSearchInput from MediaSearch
		Vue.js base components.
		Receives an input parameter to filter the type of ZObjects that
		it will search and display (e.g. Z4 for selecting only types)

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<span class="ext-wikilambda-select-zobject">
		<a
			v-if="readonly || viewmode"
			:href="'/wiki/' + type"
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
			:initial-value="selectedText"
			:lookup-results="lookupLabels"
			@input="onInput"
			@blur="onSubmit"
			@submit="onSubmit"
			@clear="onClear"
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
	mapState = require( 'vuex' ).mapState,
	mapGetters = require( 'vuex' ).mapGetters,
	mapMutations = require( 'vuex' ).mapMutations;

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
		mapState( [
			'zRegex'
		] ),
		{
			lookupLabels: function () {
				return Object.keys( this.lookupResults ).map( function ( key ) {
					return this.lookupResults[ key ];
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
		mapActions( [ 'fetchZKeys' ] ),
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
			 * Once the timeout is done, calls the `wikilambdasearch_labels` API
			 * with the current value of the input
			 *
			 * @param {string} input
			 */
			getLookupResults: function ( input ) {
				var api = new mw.Api(),
					self = this,
					queryType = 'wikilambdasearch_labels',
					searchedString = input;

				api.get( {
					action: 'query',
					list: queryType,
					// eslint-disable-next-line camelcase
					wikilambdasearch_search: input,
					// eslint-disable-next-line camelcase
					wikilambdasearch_type: this.type,
					// eslint-disable-next-line camelcase
					wikilambdasearch_language: this.zLang
				} ).done( function ( data ) {
					self.lookupResults = {};
					// If the string searched has changed, do not show the search result
					if ( self.inputValue.indexOf( searchedString ) === -1 ) {
						return;
					}

					// If any results available
					if ( ( 'query' in data ) && ( queryType in data.query ) ) {
						data.query[ queryType ].forEach(
							function ( result ) {
								var zid = result.page_title,
									label = result.label;
								// Update lookupResults list
								// If we are searching for Types (this.type === 'Z4')
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
								}
							}
						);
						self.showList = true;
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
				clearTimeout( this.lookupDelayTimer );
				this.lookupDelayTimer = setTimeout( function () {
					if ( self.isValidZidFormat( input.toUpperCase() ) ) {
						self.validateZidInput();
					} else {
						self.getLookupResults( input );
					}
				}, this.lookupDelayMs );
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
					return;
				}
				this.validatorResetError();
				if ( typeof item === 'object' ) {
					inputValue = this.inputValue;
				} else {
					inputValue = item;
				}

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
					this.$emit( 'input', zId );
					this.valueEmitted = true;
				} else {
					this.validatorSetError( 'wikilambda-invalidzobject' );
				}
			},

			/**
			 * The autocomple field is cleaned
			 */
			onClear: function () {
				this.$emit( 'input', '' );
				this.validatorResetError();
			},

			/**
			 * The autocomplete field is empty or an item is selected,
			 * so it clears the list of suggestions.
			 */
			onClearLookupResults: function () {
				this.lookupResults = {};
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
