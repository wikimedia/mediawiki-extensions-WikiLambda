<template>
	<!--
		WikiLambda Vue interface module for selecting any ZObject,
		with lookup on name.
		Receives an input parameter to filter the type of ZObjects that
		it will search and display (e.g. Z4 for selecting only types)

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<span class="ext-wikilambda-select-zobject">
		<div v-if="readonly || viewmode" class="ext-wikilambda-select-zobject__link">
			<a
				:href="typeUrl()"
				:target="referenceLinkTarget"
			>
				{{ selectedText }}
			</a>
		</div>
		<!-- eslint-disable vue/no-v-model-argument -->
		<!-- eslint-disable vue/no-unsupported-features -->
		<!-- TODO: add error state when implemented in codex -->
		<cdx-lookup
			v-else
			:key="lookupKey"
			v-model:selected="selectedValue"
			:class="{ 'ext-wikilambda-select-zobject__input-invalid': validatorIsInvalid }"
			:placeholder="lookupPlaceholder"
			:menu-items="lookupResults"
			:end-icon="lookupIcon"
			:initial-input-value="initialInputValue"
			@input="onInput"
			@focusout="onFocusOut"
		>
			<template #no-results>
				No results found.
			</template>
		</cdx-lookup>
		<cdx-message
			v-if="validatorIsInvalid"
			:inline="true"
			type="error"
		>
			{{ validatorErrorMessage }}
		</cdx-message>
		<cdx-message
			v-if="errorState"
			class="ext-wikilambda-select-zobject__error"
			:type="errorType"
			inline
		>
			{{ errorMessage }}
		</cdx-message>
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
	mapMutations = require( 'vuex' ).mapMutations,
	icons = require( '../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'z-object-selector',
	components: {
		'cdx-message': CdxMessage,
		'cdx-lookup': CdxLookup
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
		initialSelectionLabel: {
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
		},
		usedLanguages: {
			type: Array,
			default: function () {
				return [];
			},
			required: false
		},
		zobjectId: {
			type: Number,
			default: -1
		}
	},
	data: function () {
		return {
			lookupResults: [],
			lookupDelayTimer: null,
			lookupDelayMs: 300,
			inputValue: '',
			valueEmitted: false,
			lookupKey: 1,
			selectedValue: this.selectedId
		};
	},
	computed: $.extend( {},
		mapGetters( {
			zkeyLabels: 'getZkeyLabels',
			zKeys: 'getZkeys',
			getErrors: 'getErrors'
		} ),
		{
			usedLanguageZids: function () {
				return this.usedLanguages.map( function ( language ) {
					return language.Z9K1;
				} );
			},
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
			initialInputValue: function () {
				this.inputValue = this.initialSelectionLabel;
				return this.initialSelectionLabel;
			},
			referenceLinkTarget: function () {
				if ( !( this.viewmode || this.readonly ) ) {
					return '_blank';
				}

				return;
			},
			lookupIcon: function () {
				return icons.cdxIconExpand;
			},
			errorType: function () {
				if ( this.getErrors[ this.zobjectId ] ) {
					return this.getErrors[ this.zobjectId ].type;
				}
				return null;
			},
			errorState: function () {
				// the error is not guaranteed to exist
				if ( this.getErrors[ this.zobjectId ] ) {
					return this.getErrors[ this.zobjectId ].state;
				}

				return false;
			},
			errorMessage: function () {
				if ( this.getErrors[ this.zobjectId ] ) {
					const messageStr = this.getErrors[ this.zobjectId ].message;
					return this.$i18n( messageStr ).text();
				}
				return null;
			}
		}
	),
	methods: $.extend( {},
		mapActions( [
			'lookupZObject',
			'fetchZKeys',
			'setError'
		] ),
		mapMutations( [ 'addAllZKeyLabels' ] ),
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
						this.type === zidType && // Or the specified type matches de ZObject type
						!this.isExcludedZType( zid ) // and ZID is not part of the EXCLUDED_Z_TYPES
					) );
			},
			isUsedLanguage: function ( zid ) {
				return this.usedLanguageZids.indexOf( zid ) !== -1;
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
					self.lookupResults = [];
					if ( payload && payload.length > 0 ) {
						payload.forEach(
							function ( result ) {
								var zid = result.page_title,
									lang = result.page_lang,
									label = result.label;

								// TODO (T322757): Show aliases ( result.is_primary === 0 ) differently

								// Update lookupResults list
								// If we are searching for Types (this.type === Constants.Z_TYPE)
								// we should exclude Z1, Z2, Z7 and Z9 from the results
								if ( !self.isExcludedZType( zid ) ) {
									if ( self.usedLanguageZids ? !self.isUsedLanguage( zid ) : true ) {
										self.lookupResults.push(
											{
												value: zid,
												label
											}
										);
									}
								}
								// Update zKeyLabels in the Vuex store
								if ( !( zid in self.zkeyLabels ) ) {
									self.addAllZKeyLabels( [ {
										zid,
										label,
										lang
									} ] );

									zKeys.push( zid );
								}
							}
						);
						self.fetchZKeys( { zids: zKeys } );
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

				if ( this.isUsedLanguage( normalizedSearchValue ) ) {
					return;
				}
				if ( self.isValidZidFormat( normalizedSearchValue ) ) {
					self.fetchZKeys( { zids: [ normalizedSearchValue ] } ).then( function () {
						var label = '';
						self.lookupResults = [];
						// If data is returned, The value will show in the zKeys
						if (
							( normalizedSearchValue in self.zKeys ) &&
							( self.hasValidType( normalizedSearchValue ) )
						) {
							label = self.zkeyLabels[ normalizedSearchValue ];
							self.lookupResults.push( {
								value: normalizedSearchValue,
								label: label + ' (' + normalizedSearchValue + ')'
							} );
						} else {
							self.validatorSetError( 'wikilambda-invalidzobject' );
						}
					} );
				} else {
					self.validatorSetError( 'wikilambda-invalidzobject' );
				}
			},
			// used by ZLabelsBlock, ZMultilingualString and FnEditorZLanguageSelector components to
			// automatically add and clear labels.
			clearResults: function () {
				this.lookupResults = [];
				this.inputValue = '';
				this.lookupKey += 1;
			},
			/**
			 * On lookup field input, set a timer so that the lookup is not done immediately.
			 *
			 * @param {string} input
			 */
			onInput: function ( input ) {
				var self = this;
				this.valueEmitted = false;
				this.inputValue = input;

				if ( !input ) {
					this.lookupResults = [];
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
			onFocusOut: function () {
				this.$emit( 'focus-out' );
			},
			typeUrl: function () {
				return new mw.Title( this.selectedId ).getUrl();
			}
		}
	),
	watch: {
		selectedValue: {
			handler: function ( zId ) {
				if ( this.selectedValue === null ) {
					this.$emit( 'input-removed' );
				}
				this.$emit( 'input', zId );

				this.setError( {
					internalId: this.zobjectId,
					errorState: false
				} );
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
.ext-wikilambda-select-zobject {
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
	}
}
</style>
