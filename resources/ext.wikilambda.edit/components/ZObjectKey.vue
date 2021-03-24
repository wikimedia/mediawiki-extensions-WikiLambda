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
			:selected-id="zType"
			@input="setKeyType"
		></z-object-selector>

		<!-- If there's a type, we render the appropriate component -->
		<template v-else>
			<span>{{ zTypeLabel }} ({{ zType }})</span>
			<z-object
				:zobject="zobject"
				:viewmode="viewmode"
				:persistent="false"
				@change="updateValue"
			></z-object>
		</template>
	</div>
</template>

<script>
var Constants = require( '../Constants.js' ),
	ZObjectSelector = require( './ZObjectSelector.vue' ),
	ZKeyModeSelector = require( './ZKeyModeSelector.vue' ),
	mapState = require( 'vuex' ).mapState;

module.exports = {
	name: 'ZObjectKey',
	components: {
		'z-object-selector': ZObjectSelector,
		'z-key-mode-selector': ZKeyModeSelector
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
		zType: {
			type: String,
			default: ''
		},
		zobject: {
			type: [ String, Object, Array ],
			default: ''
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
		{
			zKeyLabel: function () {
				return this.zKeyLabels[ this.zKey ];
			},
			zTypeLabel: function () {
				return this.zKeyLabels[ this.zType ];
			}
		}
	),
	methods: {
		/**
		 * Fires a typeChange event with the new type of this key.
		 *
		 * @param {string} newType
		 * @fires typeChange
		 */
		setKeyType: function ( newType ) {
			this.$emit( 'change-type', newType );
		},

		/**
		 * Fires an input event with the updated value
		 * of the key.
		 *
		 * @param {string} value
		 * @fires input
		 */
		updateValue: function ( value ) {
			this.$emit( 'input', value );
		}
	},
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
