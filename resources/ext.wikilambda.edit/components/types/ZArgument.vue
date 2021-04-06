<template>
	<!--
		WikiLambda Vue interface module for editing ZArgument objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		({{ argumentKey }}):
		<div>
			{{ typeLabel }}:
			<z-object-selector
				:type="Constants.Z_TYPE"
				:placeholder="$i18n( 'wikilambda-argument-typeselector-label' )"
				:selected-id="argumentType"
				:viewmode="viewmode"
				@input="typeHandler"
			></z-object-selector>
		</div>
		<div>
			{{ labelsLabel }}:
			<z-multilingual-string
				v-if="argumentLabels"
				:zobject="argumentLabels"
				:viewmode="viewmode"
				@delete-lang="deleteZMonolingualString"
				@add-lang="addZMonolingualString"
				@change="setZMonolingualString"
			></z-multilingual-string>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	mapState = require( 'vuex' ).mapState,
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	ZMultilingualString = require( './ZMultilingualString.vue' );

module.exports = {
	components: {
		'z-object-selector': ZObjectSelector,
		'z-multilingual-string': ZMultilingualString
	},
	props: {
		zobject: {
			type: Object,
			default: function () {
				return {};
			}
		},
		viewmode: {
			type: Boolean,
			required: true
		}
	},
	computed: $.extend( mapGetters( {
		nextKey: 'getNextKey',
		zLang: 'zLang'
	} ),
	mapState( {
		zArgument: function ( state ) {
			return state.zKeys[ Constants.Z_ARGUMENT ];
		}
	} ),
	{
		Constants: function () {
			return Constants;
		},
		argumentType: {
			get: function () {
				return this.zobject[ Constants.Z_ARGUMENT_TYPE ];
			},
			set: function ( zId ) {
				this.$emit( 'update', {
					key: Constants.Z_ARGUMENT_TYPE,
					value: zId
				} );
			}
		},
		argumentKey: {
			get: function () {
				if ( this.zobject[ Constants.Z_ARGUMENT_KEY ] ) {
					return this.zobject[ Constants.Z_ARGUMENT_KEY ][ Constants.Z_STRING_VALUE ];
				} else {
					return '';
				}
			},
			set: function ( key ) {
				this.$emit( 'update', {
					key: Constants.Z_ARGUMENT_KEY,
					value: {
						Z1K1: Constants.Z_STRING,
						Z6K1: key
					}
				} );
			}
		},
		argumentLabels: {
			get: function () {
				return this.zobject[ Constants.Z_ARGUMENT_LABEL ];
			},
			set: function ( labels ) {
				this.$emit( 'update', {
					key: Constants.Z_ARGUMENT_LABEL,
					value: labels
				} );
			}
		},
		zArgumentKeys: function () {
			if ( this.zArgument ) {
				return this.zArgument[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];
			}

			return [];
		},
		zArgumentKeyLabels: function () {
			var labels = {};

			this.zArgumentKeys.forEach( function ( keyObject ) {
				var key = keyObject[ Constants.Z_KEY_ID ][ Constants.Z_STRING_VALUE ];
				labels[ key ] = keyObject[
					Constants.Z_KEY_LABEL ][
					Constants.Z_MULTILINGUALSTRING_VALUE ][
					0 ][
					Constants.Z_MONOLINGUALSTRING_VALUE ];
			} );

			return labels;
		},
		typeLabel: function () {
			return this.zArgumentKeyLabels[ Constants.Z_ARGUMENT_TYPE ];
		},
		labelsLabel: function () {
			return this.zArgumentKeyLabels[ Constants.Z_ARGUMENT_LABEL ];
		}
	} ),
	methods: $.extend( mapActions( [ 'fetchZKeys' ] ), {
		typeHandler: function ( zid ) {
			this.argumentType = zid;
		},
		// Handlers for ZMultilingualString events

		/**
		 * Removes a language entry from a Multilingual string.
		 *
		 * @param {number} index
		 */
		deleteZMonolingualString: function ( index ) {
			if ( this.argumentLabels[ Constants.Z_MULTILINGUALSTRING_VALUE ] ) {
				this.argumentLabels[ Constants.Z_MULTILINGUALSTRING_VALUE ].splice( index, 1 );
			}
		},

		/**
		 * Adds a new Monolingual String to the Multilingual String
		 * values array.
		 *
		 * @param {string} lang
		 */
		addZMonolingualString: function ( lang ) {
			var monolingualString = {};

			// Create new ZMonolingual String
			monolingualString[ Constants.Z_OBJECT_TYPE ] = Constants.Z_MONOLINGUALSTRING;
			monolingualString[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] = lang;
			monolingualString[ Constants.Z_MONOLINGUALSTRING_VALUE ] = '';

			// Add it to the value array in the ZMultilingual String
			this.argumentLabels[ Constants.Z_MULTILINGUALSTRING_VALUE ].push( monolingualString );

			this.$emit( 'update', { key: 'Z17K3', value: this.argumentLabels } );
		},

		/**
		 * Sets the value of an existing Monolingual String from the Multilingual
		 * String values array.
		 *
		 * @param {Object} item
		 */
		setZMonolingualString: function ( item ) {
			if ( this.argumentLabels[ Constants.Z_MULTILINGUALSTRING_VALUE ] ) {
				this.argumentLabels[
					Constants.Z_MULTILINGUALSTRING_VALUE ][
					item.index ][
					Constants.Z_MONOLINGUALSTRING_VALUE ] = item.value;
			}
		}
	} ),
	mounted: function () {
		this.fetchZKeys( {
			zids: [ Constants.Z_ARGUMENT ],
			zlangs: [ this.zLang ]
		} );

		if ( !this.argumentKey ) {
			this.argumentKey = Constants.Z_NEW_KEY_ROOT + this.nextKey;
		}
		if ( !this.argumentLabels ) {
			this.argumentLabels = { Z1K1: Constants.Z_MULTILINGUALSTRING, Z12K1: [] };
		}
	}
};
</script>
