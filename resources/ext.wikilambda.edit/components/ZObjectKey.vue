<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zobject-key">
		<!-- zKey label -->
		<span>{{ zKeyLabel }} ({{ zKey }}):</span>

		<!-- If type isn't selected, show type selector -->
		<z-object-selector
			v-if="!zType"
			:viewmode="viewmode"
			:type="Constants.Z_TYPE"
			:placeholder="$i18n( 'wikilambda-typeselector-label' )"
			@input="onTypeChange"
		></z-object-selector>

		<!-- If there's a type, we render the appropriate component -->
		<template v-else>
			<span>{{ zTypeLabel }} ({{ zType }})</span>
			<z-object
				:zobject-id="zobjectId"
				:viewmode="viewmode"
				:persistent="false"
			></z-object>
		</template>
	</div>
</template>

<script>
var Constants = require( '../Constants.js' ),
	ZObjectSelector = require( './ZObjectSelector.vue' ),
	ZReference = require( './types/ZReference.vue' ),
	mapState = require( 'vuex' ).mapState,
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	name: 'ZObjectKey',
	components: {
		'z-object-selector': ZObjectSelector,
		'z-reference': ZReference
	},
	props: {
		viewmode: {
			type: Boolean,
			required: true
		},
		zKey: {
			type: String,
			required: true
		},
		zobjectId: {
			type: Number,
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
			'zKeyLabels'
		] ),
		mapGetters( [
			'getZObjectChildrenById',
			'getZObjectTypeById'
		] ),
		{
			zType: function () {
				return this.getZObjectTypeById( this.zobjectId );
			},
			zKeyLabel: function () {
				return this.zKeyLabels[ this.zKey ];
			},
			zTypeLabel: function () {
				return this.zKeyLabels[ this.zType ];
			},
			zObject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
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
			 */
			onTypeChange: function ( type ) {
				var payload = {
					id: this.zobjectId,
					type: type
				};
				this.fetchZKeys( {
					zids: [ type ],
					zlangs: [ this.zLang ]
				} );
				this.changeType( payload );
			}
		} ),
	beforeCreate: function () {
		this.$options.components[ 'z-object' ] = require( './ZObject.vue' );
	}
};
</script>

<style lang="less">
.ext-wikilambda-zobject-key {
	display: inline-block;
	vertical-align: top;
}

.ext-wikilambda-zobject-key > span {
	display: inline-block;
	vertical-align: top;
	margin-top: 5px;
}
</style>
