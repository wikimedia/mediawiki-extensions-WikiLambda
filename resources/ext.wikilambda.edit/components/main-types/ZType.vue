<template>
	<!--
		WikiLambda Vue interface module for ZType manipulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div :class="classZObjectKey">
		<!-- VIEW MODE -->
		<wl-z-object-generic
			v-if="viewmode"
			:zobject-id="zobjectId"
			:type="type"
			:persistent="persistent"
			:readonly="readonly"
			:parent-type="parentType"
		></wl-z-object-generic>
		<!-- EDIT MODE -->
		<template v-else>
			<template
				v-if="isChildOfPersistentObject"
			>
				<span>
					<label>{{ zTypeKeylabel }}</label>
					<wl-z-object
						:zobject-id="zObjectKeysId"
						:readonly="readonly"
						:persistent="false"
					></wl-z-object>
				</span>
				<span>
					<label>{{ zTypeValidatorlabel }}</label>
					<wl-z-object
						:zobject-id="zTypeValidatorId"
						:readonly="readonly"
						:persistent="false"
					></wl-z-object>
				</span>
			</template>
			<wl-z-object-selector
				v-else
				:type="Constants.Z_TYPE"
				:placeholder="$i18n( 'wikilambda-typeselector-label' ).text()"
				@input="onTypeChange"
			></wl-z-object-selector>
		</template>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	ZObjectGeneric = require( '../ZObjectGeneric.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	mapState = require( 'vuex' ).mapState,
	typeUtils = require( '../../mixins/typeUtils.js' );

// @vue/component
module.exports = exports = {
	name: 'wl-z-type',
	components: {
		'wl-z-object-selector': ZObjectSelector,
		'wl-z-object-generic': ZObjectGeneric
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
		},
		parentType: {
			type: String,
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
			'fetchingZKeys'
		] ),
		mapGetters( [
			'getZObjectChildrenById',
			'getZkeyLabels'
		] ),
		{
			classZObjectKey: function () {
				return {
					'ext-wikilambda-ztype-main': true,
					'ext-wikilambda-ztype-main__no-border': this.readonly || !this.isChildOfPersistentObject
				};
			},
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
			},
			isChildOfPersistentObject: function () {
				return this.parentType === Constants.Z_PERSISTENTOBJECT;
			}
		}
	),
	methods: $.extend( {},
		mapActions( [
			'fetchZKeys',
			'changeType'
		] ),
		{
			/**
			 * Sets the type of a ZObject key.
			 *
			 * @param {string} type
			 * @param {number} id
			 */
			onTypeChange: function ( type ) {
				this.changeType( {
					type: Constants.Z_REFERENCE,
					id: this.zobjectId,
					value: type
				} );
			}
		}
	),
	mounted: function () {
		if ( this.type !== 'root' ) {
			this.fetchZKeys( { zids: [ this.type ] } );
		}
	},
	beforeCreate: function () {
		this.$options.components[ 'wl-z-object' ] = require( '../ZObject.vue' );
	}
};

</script>

<style lang="less">
.ext-wikilambda-ztype-main {
	background: #fff;
	outline: 2px dashed #808080;
	padding: 1em;
}

.ext-wikilambda-ztype-main__no-border {
	outline: 0;
}
</style>
