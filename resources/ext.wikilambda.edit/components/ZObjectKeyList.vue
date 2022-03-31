<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<ul class="ext-wikilambda-zobject-key-list">
		<li v-for="( value, key ) in zObjectWithoutPersistent" :key="key">
			<cdx-button
				v-if="!( viewmode || readonly )"
				:title="tooltipRemoveZObjectKey"
				:destructive="true"
				@click="removeKey( value.id )"
			>
				{{ $i18n( 'wikilambda-editor-removeitem' ).text() }}
			</cdx-button>
			<z-object-key
				:z-key="value.key"
				:zobject-id="value.id"
				:parent-type="zObjectType"
				:readonly="readonly"
			>
			</z-object-key>
		</li>
	</ul>
</template>

<script>
var Constants = require( '../Constants.js' ),
	typeUtils = require( '../mixins/typeUtils.js' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	mapMutations = require( 'vuex' ).mapMutations,
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'z-object-key-list',
	components: {
		'cdx-button': CdxButton
	},
	mixins: [ typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	computed: $.extend( {},
		mapGetters( [
			'getZObjectChildrenById',
			'getZObjectTypeById'
		] ),
		{
			tooltipRemoveZObjectKey: function () {
				return this.$i18n( 'wikilambda-editor-zobject-removekey-tooltip' ).text();
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
			},
			zObjectType: function () {
				return this.getZObjectTypeById( this.zobjectId );
			}
		}
	),
	methods: $.extend( {},
		mapActions( [
			'addZObject',
			'removeZObjectChildren'
		] ),
		mapMutations( [ 'addAllZKeyLabels' ] ),
		{
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
			}
		}
	),

	beforeCreate: function () {
		// Need to delay require of ZObjectKey to avoid loop
		this.$options.components[ 'z-object-key' ] = require( './ZObjectKey.vue' );
	}
};
</script>
