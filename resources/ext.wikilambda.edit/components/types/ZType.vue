<template>
	<!--
		WikiLambda Vue interface module for ZType manipulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div :class="classZObjectKey">
		<!-- VIEW MODE -->
		<z-object-generic
			v-if="viewmode"
			:zobject-id="zobjectId"
			:type="type"
			:persistent="persistent"
			:readonly="readonly"
			:parent-type="parentType">
		</z-object-generic>
		<!-- EDIT MODE -->
		<template v-else>
			<template
				v-if="isChildOfPersistentObject"
			>
				<span>
					<label>{{ zTypeKeylabel }}</label>
					<!-- ZType -> ZObject -> ZType -->
					<!-- eslint-disable vue/no-unregistered-components -->
					<z-object
						:zobject-id="zObjectKeysId"
						:readonly="readonly"
						:persistent="false"></z-object>
				</span>
				<span>
					<label>{{ zTypeValidatorlabel }}</label>
					<!-- ZType -> ZObject -> ZType -->
					<!-- eslint-disable vue/no-unregistered-components -->
					<z-object
						:zobject-id="zTypeValidatorId"
						:readonly="readonly"
						:persistent="false"></z-object>
				</span>
			</template>
			<z-object-selector
				v-else
				:type="Constants.Z_TYPE"
				:placeholder="$i18n( 'wikilambda-typeselector-label' )"
				@input="onTypeChange"
			></z-object-selector>
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
module.exports = {
	name: 'z-type',
	components: {
		'z-object-selector': ZObjectSelector,
		'z-object-generic': ZObjectGeneric
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
			'getCurrentZObjectId',
			'getZkeyLabels'
		] ),
		{
			classZObjectKey: function () {
				return {
					'ext-wikilambda-ztype': true,
					'ext-wikilambda-ztype__no-border': this.readonly || !this.isChildOfPersistentObject
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
		mapActions( [ 'fetchZKeys', 'addZReference' ] ),
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
					value: type
				};
				this.addZReference( payload );
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

.ext-wikilambda-ztype__no-border {
	outline: 0;
}
</style>
