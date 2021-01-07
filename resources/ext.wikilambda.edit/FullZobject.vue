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
			<type-selector v-else
				:type="type"
				@change="updateType"
			></type-selector>
		</span>
		<other-keys :zobject="zobject"
			:viewmode="viewmode"
			@input="updateZobject"
		></other-keys>
	</div>
</template>

<script>
var Constants = require( './Constants.js' ),
	TypeSelector = require( './TypeSelector.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapState = require( 'vuex' ).mapState;

module.exports = {
	name: 'FullZobject',
	components: {
		'type-selector': TypeSelector
	},
	props: [ 'zobject', 'persistent', 'viewmode' ],
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
					var ztypes = mw.config.get( 'extWikilambdaEditingData' ).ztypes;
					return ztypes[ this.type ];
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
				this.zobject[ Constants.Z_OBJECT_TYPE ] = newType;
				this.$emit( 'input', this.zobject );
			}
		}
	),
	beforeCreate: function () { // Need to delay require of OtherKeys to avoid loop
		this.$options.components[ 'other-keys' ] = require( './OtherKeys.vue' );
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
