<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020-2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zobject-generic">
		<span>{{ z1k1label }} ({{ Constants.Z_OBJECT_TYPE }}): </span>

		<span v-if="persistent">
			<a v-if="type !== zobjectId && viewmode" :href="'./ZObject:' + type">
				<span>{{ typeLabel }} ({{ type }})</span>
			</a>
			<span v-else>{{ typeLabel }} ({{ type }})</span>
			<ul><li> {{ z2k1label }} ({{ Constants.Z_PERSISTENTOBJECT_ID }}): {{ zobjectId }} </li></ul>
		</span>

		<span v-else>
			<span v-if="viewmode || type"> {{ typeLabel }} ({{ type }})</span>
			<z-object-selector
				v-else
				:viewmode="viewmode"
				:type="Constants.Z_TYPE"
				:placeholder="$i18n( 'wikilambda-typeselector-label' )"
				:selected-id="type"
				@input="updateType"
			></z-object-selector>
		</span>

		<z-object-key-list
			ref="keyList"
			:zobject="zobject"
			:viewmode="viewmode"
			@change="updateZObjectKey"
			@delete="deleteZObjectKey"
		></z-object-key-list>
	</div>
</template>

<script>
var Constants = require( '../Constants.js' ),
	ZObjectSelector = require( './ZObjectSelector.vue' ),
	ZObjectKeyList = require( './ZObjectKeyList.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapState = require( 'vuex' ).mapState;

module.exports = {
	name: 'ZObjectGeneric',
	components: {
		'z-object-key-list': ZObjectKeyList,
		'z-object-selector': ZObjectSelector
	},
	props: {
		zobject: {
			type: Object,
			default: function () {
				return {};
			}
		},
		persistent: {
			type: Boolean,
			required: true
		},
		viewmode: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			Constants: Constants,
			lastTypeKeys: []
		};
	},
	computed: $.extend( {},
		mapState( [
			'zLangs',
			'zKeyLabels',
			'zKeys',
			'fetchingZKeys'
		] ),
		{
			type: function () {
				return this.zobject[ Constants.Z_OBJECT_TYPE ];
			},
			keys: function () {
				// Given this.type, returns the expected keys
				return this.zKeys[ this.type ][ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];
			},
			typeLabel: function () {
				return this.zKeyLabels[ this.type ];
			},
			zobjectId: function () {
				return this.zobject[ Constants.Z_PERSISTENTOBJECT_ID ];
			},
			z1k1label: function () {
				return this.zKeyLabels[ Constants.Z_OBJECT_TYPE ];
			},
			z2k1label: function () {
				return this.zKeyLabels[ Constants.Z_PERSISTENTOBJECT_ID ];
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'fetchZKeys' ] ),
		{
			/**
			 * Updates zobject data with changes on the ZObject Key
			 * list. The event contains the key and the new value.
			 *
			 * @param {Object} newKey
			 */
			updateZObjectKey: function ( newKey ) {
				this.$emit( 'change-key', newKey );
			},

			/**
			 * Updates zobject data with the deletion of a ZObject
			 * Key list item. The event contains the key ID.
			 *
			 * @param {string} keyId
			 */
			deleteZObjectKey: function ( keyId ) {
				this.$delete( this.zobject, keyId );
			},

			/**
			 * Updates the keys in the ZObject Key List when the type
			 * is changed.
			 * TODO: disallow type change when type is already assigned
			 *
			 * @param {string} newType
			 */
			updateType: function ( newType ) {
				var self = this,
					newKeys;

				this.$emit( 'change-type', newType );

				this.lastTypeKeys.forEach( function ( lastTypeKey ) {
					self.$refs.keyList.removeKey( lastTypeKey );
				} );
				this.lastTypeKeys = [];

				this.fetchZKeys( {
					zids: [ newType ],
					zlangs: this.zLangs
				} ).done( function () {
					newKeys = self.zKeys[ newType ][ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];
					newKeys.forEach( function ( newKey ) {
						self.$refs.keyList.addKey( newKey[ Constants.Z_KEY_ID ] );
						self.lastTypeKeys.push( newKey[ Constants.Z_KEY_ID ] );
					} );
				} );
			}
		}
	),
	mounted: function () {
		// Fetch the information of the zid (and relevant
		// key labels) if it's not yet available.
		if (
			( !( this.type in this.zKeys ) ) &&
			( this.fetchingZKeys.indexOf( this.type ) === -1 )
		) {
			this.fetchZKeys( {
				zids: [ this.type ],
				zlangs: this.zLangs
			} );
		}

		if ( this.type !== Constants.Z_PERSISTENTOBJECT ) {
			this.updateType( this.type );
		}
	}
};

</script>

<style lang="less">
.ext-wikilambda-zobject-generic {
	background: #fff;
	outline: 2px dashed #808080;
	padding: 1em;
}
</style>
