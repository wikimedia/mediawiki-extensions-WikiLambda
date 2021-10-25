<template>
	<!--
		WikiLambda Vue interface module for ZType manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-ztype">
		<!-- VIEW MODE -->

		<!-- EDIT MODE -->
		<span>
			<label>{{ zTypeKeylabel }}</label>
			<z-list :zobject-id="zObjectKeysId" :readonly="readonly"></z-list>
		</span>
		<span>
			<label>{{ zTypeValidatorlabel }}</label>
			<z-object :zobject-id="zTypeValidatorId"
				:readonly="readonly"
				:persistent="false"></z-object>
		</span>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZList = require( './ZList.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	mapState = require( 'vuex' ).mapState,
	typeUtils = require( '../../mixins/typeUtils.js' );

module.exports = {
	name: 'ZType',
	components: {
		'z-list': ZList
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
		type: {
			type: String,
			required: true
		},
		persistent: {
			type: Boolean,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			Constants: Constants
		};
	},
	computed: $.extend( {},
		mapState( [
			'fetchingZKeys'
		] ),
		mapGetters( [
			'getZObjectChildrenById',
			'getCurrentZObjectId',
			'getZkeyLabels'
		] ),
		{
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zTypeKeylabel: function () {
				return this.getZkeyLabels[ Constants.Z_TYPE_KEYS ];
			},
			zObjectKeysId: function () {
				return this.findKeyInArray( Constants.Z_TYPE_KEYS, this.zobject ).id;
			},
			zTypeValidatorlabel: function () {
				return this.getZkeyLabels[ Constants.Z_TYPE_VALIDATOR ];
			},
			zTypeValidatorId: function () {
				return this.findKeyInArray( Constants.Z_TYPE_VALIDATOR, this.zobject ).id;
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'fetchZKeys', 'changeType' ] ),
		{
			/**
			 * Sets the type of a ZObject key.
			 *
			 * @param {string} type
			 * @param {number} id
			 */
			onTypeChange: function ( type ) {
				var payload = {
					id: this.zobjectId,
					type: type
				};
				this.changeType( payload );
			}
		}
	),
	mounted: function () {
		if ( this.type !== 'root' ) {
			this.fetchZKeys( [ this.type ] );
		}
	},
	beforeCreate: function () {
		this.$options.components[ 'z-object' ] = require( '../ZObject.vue' );
	}
};

</script>

<style lang="less">
.ext-wikilambda-ztype {
	background: #fff;
	outline: 2px dashed #808080;
	padding: 1em;
}
</style>
