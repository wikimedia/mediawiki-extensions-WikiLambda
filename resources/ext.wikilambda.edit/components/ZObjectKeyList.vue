<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<ul class="ext-wikilambda-zobject-key-list">
		<li v-for="( value, key ) in keyFields" :key="key">
			<button v-if="!viewmode"
				:title="tooltipRemoveZObjectKey"
				@click="removeKey( key )"
			>
				{{ $i18n( 'wikilambda-editor-removeitem' ) }}
			</button>
			<z-object-key
				:viewmode="viewmode"
				:z-key="key"
				:z-type="value"
				:zobject="zobject[ key ]"
				@type-change="onTypeChange( $event, key )"
				@input="onValueChange( $event, key )"
			>
			</z-object-key>
		</li>

		<!-- Add new key -->
		<li v-if="!viewmode">
			{{ $i18n( 'wikilambda-editor-zobject-addkey' ) }}
			<z-object-key-input @change="addKey"></z-object-key-input>
		</li>
	</ul>
</template>

<script>
var Constants = require( '../Constants.js' ),
	ZObjectKeyInput = require( './ZObjectKeyInput.vue' ),
	mapState = require( 'vuex' ).mapState,
	mapMutations = require( 'vuex' ).mapMutations,
	mapActions = require( 'vuex' ).mapActions;

module.exports = {
	name: 'ZObjectKeyList',
	components: {
		'z-object-key-input': ZObjectKeyInput
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
	data: function () {
		return {
			keyFields: {}
		};
	},
	computed: $.extend( {},
		mapState( [
			'fetchingZKeys',
			'zLangs',
			'zKeys',
			'zKeyLabels'
		] ),
		{
			tooltipRemoveZObjectKey: function () {
				return this.$i18n( 'wikilambda-editor-zobject-removekey-tooltip' );
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'fetchZKeys' ] ),
		mapMutations( [ 'addZKeyLabel' ] ),
		{
			/**
			 * Checks if the given key should be presented on the key field list.
			 * The keys excluded are `Z1K1` (Object type) and `Z2K1` (Persistent
			 * object ID).
			 *
			 * @param {string} key
			 * @return {boolean}
			 */
			isKeyField: function ( key ) {
				return (
					( key.substring( 0, 3 ) !== Constants.Z_OBJECT_TYPE.substring( 0, 3 ) ) &&
					( key !== Constants.Z_PERSISTENTOBJECT_ID )
				);
			},

			/**
			 * Adds a new key field to the list.
			 *
			 * @param {string} key
			 */
			addKey: function ( key ) {
				// Check if this key is already set in the zobject
				if ( !( key in this.keyFields ) ) {
					this.$set( this.keyFields, key, '' );
				}
			},

			/**
			 * Returns the initial value for a given ZType.
			 *
			 * @param {string} type
			 * @return {Object|Array|string}
			 */
			getInitialValue: function ( type ) {
				var initialValue;

				if ( type === Constants.Z_STRING ) {
					initialValue = '';
				} else if ( type === Constants.Z_LIST ) {
					initialValue = [];
				} else {
					initialValue = {};
					initialValue[ Constants.Z_OBJECT_TYPE ] = type;
				}
				return initialValue;
			},

			/**
			 * Sets the type of a ZObject key.
			 * Fires the event `change` with key and initial
			 * value for that type so that ZObject updates
			 * its data.
			 *
			 * @param {string} newType
			 * @param {string} key
			 * @fires change
			 */
			onTypeChange: function ( newType, key ) {
				// Set the type in the keyFields object
				this.$set( this.keyFields, key, newType );

				// Emit update to the parent
				this.$emit( 'change', {
					key: key,
					value: this.getInitialValue( newType )
				} );
			},

			/**
			 * Once the value of a ZObject key changes, it
			 * fires the event `change` with the key and new
			 * value of the given key, so that ZObject can update
			 * its data.
			 *
			 * @param {Object|Array|string} newValue
			 * @param {string} key
			 * @fires change
			 */
			onValueChange: function ( newValue, key ) {
				this.$emit( 'change', {
					key: key,
					value: newValue
				} );
			},

			/**
			 * Removes one key from the ZObject key list.
			 * Fires the event `delete` so that ZObject can update
			 * its data.
			 *
			 * @param {string} key
			 * @fires delete
			 */
			removeKey: function ( key ) {
				this.$delete( this.keyFields, key );
				this.$emit( 'delete', key );
			},

			/**
			 * Gets the key type given its initial value.
			 *
			 * @param {Object|Array|string} value
			 * @return {string}
			 */
			getKeyType: function ( value ) {
				if ( typeof ( value ) === 'object' ) {
					if ( Array.isArray( value ) ) {
						return Constants.Z_LIST;
					} else if ( Constants.Z_OBJECT_TYPE in value ) {
						return value[ Constants.Z_OBJECT_TYPE ];
					} else {
						return Constants.Z_OBJECT;
					}
				} else {
					return Constants.Z_STRING;
				}
			},

			/**
			 * Looks inside the zobject and fetches the necessary
			 * ZID to find the labels of its keys and their types.
			 *
			 * @return {Array}
			 */
			getUnknownZKeys: function () {
				var unknownZKeys = [],
					key,
					zid,
					type;

				for ( key in this.keyFields ) {
					// We fetch only the zids that
					// are not yet available in the state nor
					// are being fetched currently
					zid = key.match( /(Z\d+)/ )[ 1 ];
					if (
						( !( zid in this.zKeys ) ) &&
						( this.fetchingZKeys.indexOf( zid ) === -1 ) &&
						( unknownZKeys.indexOf( zid ) === -1 )
					) {
						unknownZKeys.push( zid );
					}
					// We also include the assigned zids of the
					// existing keys that have not yet been fetched
					if (
						( type = this.keyFields[ key ] ) &&
						( !( type in this.zKeys ) ) &&
						( this.fetchingZKeys.indexOf( type ) === -1 ) &&
						( unknownZKeys.indexOf( type ) === -1 )
					) {
						unknownZKeys.push( this.keyFields[ key ] );
					}
				}
				return unknownZKeys;
			}
		}
	),

	beforeCreate: function () {
		// Need to delay require of ZObjectKey to avoid loop
		this.$options.components[ 'z-object-key' ] = require( './ZObjectKey.vue' );
	},

	created: function () {
		var key;
		// We compile all the key fields IDs and types
		for ( key in this.zobject ) {
			if ( this.isKeyField( key ) ) {
				this.$set( this.keyFields, key, this.getKeyType( this.zobject[ key ] ) );
			}
		}
	},

	mounted: function () {
		var unknownZKeys = this.getUnknownZKeys();
		// Call the store action to fetch the ZIds if there are any
		if ( unknownZKeys.length > 0 ) {
			this.fetchZKeys( {
				zids: unknownZKeys,
				zlangs: this.zLangs
			} );
		}
	}
};
</script>
