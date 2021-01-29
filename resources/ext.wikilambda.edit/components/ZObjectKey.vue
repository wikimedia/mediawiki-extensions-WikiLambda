<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020 WikiLambda team; see AUTHORS.txt
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

			<!-- Depending on the type, the key will render a different component -->
			<z-string
				v-if="zType === Constants.Z_STRING"
				:value="zobject"
				:viewmode="viewmode"
				@input="updateKey"
			></z-string>

			<z-object-selector
				v-else-if="zType === Constants.Z_REFERENCE"
				:selected-id="zobject"
				:placeholder="$i18n( 'wikilambda-zobjectselector-label' )"
				:viewmode="viewmode"
				@input="updateKey"
			></z-object-selector>

			<z-list
				v-else-if="zType === Constants.Z_LIST"
				:list="zobject"
				:viewmode="viewmode"
				@input="updateKey"
			></z-list>

			<z-multilingual-string
				v-else-if="zType === Constants.Z_MULTILINGUALSTRING"
				:mls-object="zobject"
				:viewmode="viewmode"
				@input="updateKey"
			></z-multilingual-string>

			<z-object
				v-else
				:zobject="zobject"
				:persistent="false"
				:viewmode="viewmode"
				@input="updateKey"
			></z-object>
		</template>
	</div>
</template>

<script>
var Constants = require( '../Constants.js' ),
	ZObject = require( './ZObject.vue' ),
	ZObjectSelector = require( './ZObjectSelector.vue' ),
	ZList = require( './types/ZList.vue' ),
	ZMultilingualString = require( './types/ZMultilingualString.vue' ),
	ZString = require( './types/ZString.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapState = require( 'vuex' ).mapState;

module.exports = {
	name: 'ZObjectKey',
	components: {
		'z-object': ZObject,
		'z-object-selector': ZObjectSelector,
		'z-list': ZList,
		'z-multilingual-string': ZMultilingualString,
		'z-string': ZString
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
	methods: $.extend( {},
		mapActions( [ 'fetchZKeys' ] ),
		{
			/**
			 * Fires a typeChange event with the new type of this key.
			 *
			 * @param {string} newType
			 * @fires typeChange
			 */
			setKeyType: function ( newType ) {
				this.$emit( 'type-change', newType );
			},

			/**
			 * Fires an input event with the updated value
			 * of the key.
			 *
			 * @param {string} value
			 * @fires input
			 */
			updateKey: function ( value ) {
				this.$emit( 'input', value );
			}
		}
	),

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
</style>
