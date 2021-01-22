<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zobject">
		<span>{{ z1k1label }} ({{ Constants.Z_OBJECT_TYPE }}): </span>
		<span v-if="persistent">
			<a v-if="type !== zobjectId && viewmode" :href="'./ZObject:' + type">
				<span>{{ typeLabel }} ({{ type }})</span>
			</a>
			<span v-else>{{ typeLabel }} ({{ type }})</span>
			<ul><li> {{ z2k1label }} ({{ Constants.Z_PERSISTENTOBJECT_ID }}): {{ zobjectId }} </li></ul>
		</span>
		<span v-else>
			<span v-if="viewmode"> {{ typeLabel }} ({{ type }})</span>
			<z-object-selector v-else
				:viewmode="viewmode"
				:type="Constants.Z_TYPE"
				:placeholder="$i18n( 'wikilambda-typeselector-label' )"
				:selected-id="type"
				@input="updateType($event)"
			></z-object-selector>
		</span>
		<z-object-key-list :zobject="zobject"
			:viewmode="viewmode"
			ref="otherKeys"
			@input="updateZobject"
		></z-object-key-list>
	</div>
</template>

<script>
var Constants = require( '../Constants.js' ),
	ZObjectSelector = require( './ZObjectSelector.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapState = require( 'vuex' ).mapState;

module.exports = {
	name: 'ZObject',
	components: {
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
			Constants: Constants
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
			type: {
				get: function () {
					return this.zobject[ Constants.Z_OBJECT_TYPE ];
				}
			},
			typeLabel: {
				get: function () {
					return this.zKeyLabels[ this.type ];
				}
			},
			zobjectId: {
				get: function () {
					return this.zobject[ Constants.Z_PERSISTENTOBJECT_ID ];
				},
				set: function ( newValue ) {
					this.zobject[ Constants.Z_PERSISTENTOBJECT_ID ] = newValue;
					this.$emit( 'input', this.zobject );
				}
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
			updateZobject: function ( newZobject ) {
				this.zobject = newZobject;
				this.$emit( 'input', this.zobject );
			},
			updateType: function ( newType ) {
				var api = new mw.Api(),
					thisComponent = this,
					keys;

				api.get( {
					action: 'wikilambda_fetch',
					format: 'json',
					zids: newType
				} ).done( function ( data ) {
					keys = JSON.parse( data[ newType ].wikilambda_fetch )[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];
					keys.forEach( function ( key ) {
						thisComponent.$refs.otherKeys.addNewKey( key[ Constants.Z_KEY_ID ] );
					} );
					thisComponent.zobject[ Constants.Z_OBJECT_TYPE ] = newType;
					thisComponent.$emit( 'input', thisComponent.zobject );
				} );
			}
		}
	),
	beforeCreate: function () { // Need to delay require of ZObjectKeyList to avoid loop
		this.$options.components[ 'z-object-key-list' ] = require( './ZObjectKeyList.vue' );
	},
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
	}
};
</script>

<style lang="less">
.ext-wikilambda-zobject {
	background: #fff;
	outline: 2px dashed #808080;
	padding: 1em;
}
</style>
