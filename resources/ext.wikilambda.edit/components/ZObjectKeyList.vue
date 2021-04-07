<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<ul class="ext-wikilambda-zobject-key-list">
		<li v-for="( value, key ) in zObjectWithoutPersistent" :key="key">
			<button v-if="!viewmode"
				:title="tooltipRemoveZObjectKey"
				@click="removeKey( value.id )"
			>
				{{ $i18n( 'wikilambda-editor-removeitem' ) }}
			</button>
			<z-object-key
				:viewmode="viewmode"
				:z-key="value.key"
				:zobject-id="value.id"
			>
			</z-object-key>
		</li>

		<!-- Add new key -->
		<li v-if="!viewmode">
			<z-object-key-input @change="addKey"></z-object-key-input>
		</li>
	</ul>
</template>

<script>
var Constants = require( '../Constants.js' ),
	typeUtils = require( '../mixins/typeUtils.js' ),
	ZObjectKeyInput = require( './ZObjectKeyInput.vue' ),
	mapState = require( 'vuex' ).mapState,
	mapMutations = require( 'vuex' ).mapMutations,
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	name: 'ZObjectKeyList',
	components: {
		'z-object-key-input': ZObjectKeyInput
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		viewmode: {
			type: Boolean,
			required: true
		}
	},
	computed: $.extend( {},
		mapState( [
			'fetchingZKeys',
			'zLangs',
			'zKeys',
			'zKeyLabels'
		] ),
		mapGetters( [
			'getZObjectChildrenById'
		] ),
		{
			tooltipRemoveZObjectKey: function () {
				return this.$i18n( 'wikilambda-editor-zobject-removekey-tooltip' );
			},
			zObject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zObjectWithoutPersistent: function () {
				return this.zObject.filter( function ( item ) {
					var isObjectType = item.key === Constants.Z_OBJECT_TYPE,
						isPersistentObjectId = item.key === Constants.Z_PERSISTENTOBJECT_ID;

					return !isObjectType && !isPersistentObjectId;
				} );
			}
		}
	),
	methods: $.extend( {},
		mapActions( [
			'addZObject',
			'removeZObject',
			'removeZObjectChildren'
		] ),
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
				var payload = {
						key: key,
						parent: this.zobjectId
					},
					keyExist = false;

				// Check if this key is already set in the zobject
				keyExist = this.findKeyInArray( key, this.zObject ) !== false;

				if ( !keyExist ) {
					this.addZObject( payload );
				}
			},

			/**
			 * Removes one key from the ZObject key list.
			 * Fires the event `delete` so that ZObject can update
			 * its data.
			 *
			 * @param {number} objectId
			 */
			removeKey: function ( objectId ) {
				this.removeZObjectChildren( objectId );
				this.removeZObject( objectId );
			}
		}
	),

	beforeCreate: function () {
		// Need to delay require of ZObjectKey to avoid loop
		this.$options.components[ 'z-object-key' ] = require( './ZObjectKey.vue' );
	}
};
</script>
