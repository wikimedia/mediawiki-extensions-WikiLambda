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

		<span v-if="viewmode">{{ selectedId }}</span>
		<wbmi-autocomplete-search-input
			v-else
			name="zobject-selector"
			:label="placeholder"
			:placeholder="placeholder"
			:initial-value="selectedText"
			:lookup-results="lookupLabels"
			@input="onInput"
			@blur="onBlur"
			@submit="onSubmit"
			@clear="onClear"
			@clear-lookup-results="onClearLookupResults"
		>
		</wbmi-autocomplete-search-input>

	</span>
</template>

<script>
var Constants = require( '../Constants.js' ),
	WbmiAutocompleteSearchInput = require( './base/AutocompleteSearchInput.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapState = require( 'vuex' ).mapState,
	mapGetters = require( 'vuex' ).mapGetters,
	mapMutations = require( 'vuex' ).mapMutations;

module.exports = {
	name: 'ZObjectSelector',
	components: {
		'wbmi-autocomplete-search-input': WbmiAutocompleteSearchInput
	},
	props: {
		viewmode: {
			type: Boolean,
			required: true
		},
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
		}
	},
	data: function () {
		return {
			lookupResults: {},
			lookupDelayTimer: null,
			lookupDelayMs: 300,
			inputValue: ''
		};
	},
	computed: $.extend( {},
		mapGetters( [ 'zLang' ] ),
		mapState( [
			'zLangs',
			'zKeys',
			'zKeyLabels'
		] ),
		{
			lookupLabels: function () {
				return Object.keys( this.lookupResults );
			},
			selectedLabel: function () {
				return this.zKeyLabels[ this.selectedId ];
			},
			selectedText: function () {
				if ( this.selectedId ) {
					return this.selectedLabel + ' (' + this.selectedId + ')';
				} else {
					return '';
				}
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

			isValidZidFormat: function ( zid ) {
				return /^Z\d+$/.test( zid );
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
			 * Once the timeout is done, calls the `wikilambda_searchlabels` API
			 * with the current value of the input
			 *
			 * @param {string} input
			 */
			getLookupResults: function ( input ) {
				var api = new mw.Api(),
					self = this,
					queryType = 'wikilambda_searchlabels';

				api.get( {
					action: 'query',
					list: queryType,
					// eslint-disable-next-line camelcase
					wikilambda_search: input,
					// eslint-disable-next-line camelcase
					wikilambda_type: this.type,
					// eslint-disable-next-line camelcase
					wikilambda_language: this.zLang
				} ).done( function ( data ) {
					self.lookupResults = {};

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
									self.lookupResults[ label + ' (' + zid + ')' ] = zid;
								}
								// Update zKeyLabels in the Vuex store
								if ( !( zid in self.zKeyLabels ) ) {
									self.addZKeyLabel( {
										key: zid,
										label: label
									} );
								}
							}
						);
						self.showList = true;
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
				var self = this;

				if ( this.isValidZidFormat( this.inputValue ) ) {
					this.fetchZKeys( {
						zids: [ this.inputValue ],
						zlangs: this.zLangs
					} ).done( function () {
						if (
							( self.inputValue in self.zKeys ) &&
							( self.hasValidType( self.inputValue ) )
						) {
							self.$emit( 'input', self.inputValue );
						}
					} );
				}
			},

			/**
			 * On Autocomplete field input, set a timer so that the lookup is not done immediately.
			 *
			 * @param {string} input
			 */
			onInput: function ( input ) {
				var self = this;
				this.inputValue = input;

				// The `input` event is also emitted when the field is emptied.
				// We handle this case with the `onClearLookupResults` event instead.
				if ( !input ) {
					return;
				}

				clearTimeout( this.lookupDelayTimer );
				this.lookupDelayTimer = setTimeout( function () {
					self.getLookupResults( input );
				}, this.lookupDelayMs );
			},

			/**
			 * ZObject is selected, the component emits `input` event
			 *
			 * @param {string} item
			 */
			onSubmit: function ( item ) {
				if ( this.lookupResults[ item ] ) {
					this.$emit( 'input', this.lookupResults[ item ] );
				} else {
					this.validateZidInput();
				}
			},

			/**
			 * ZObject is selected, the component emits `input` event
			 */
			onClear: function () {
				this.$emit( 'input', '' );
			},

			/**
			 * The autocomplete field is empty or an item is selected,
			 * so it clears the list of suggestions.
			 */
			onClearLookupResults: function () {
				this.lookupResults = {};
			},

			/**
			 * When blurred with a value written in the input, check if it
			 * matches a ZObject format.
			 * If so, check if ZObject exists.
			 * If it exists, select ZObject. Else, clear field.
			 */
			onBlur: function () {
				this.validateZidInput();
			}
		}
	)
};
</script>

<style lang="less">

.ext-wikilambda-select-zobject {
	display: inline-block;
}

</style>
