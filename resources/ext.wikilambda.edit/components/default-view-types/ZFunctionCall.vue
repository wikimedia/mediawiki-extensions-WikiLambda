<!--
	WikiLambda Vue component for Z7/Function Call objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-call">
		<cdx-icon
			:icon="icon"
			:class="iconClass"
		></cdx-icon>
		<wl-z-object-to-string
			:row-id="rowId"
			data-testid="z-object-to-string"
			@expand="$emit( 'expand', true )"
		></wl-z-object-to-string>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	ZObjectToString = require( './ZObjectToString.vue' ),
	icons = require( '../../../lib/icons.json' ),
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = exports = defineComponent( {
	name: 'wl-z-function-call',
	components: {
		'wl-z-object-to-string': ZObjectToString,
		'cdx-icon': CdxIcon
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		}
	},
	data: function () {
		return {
			icon: icons.cdxIconFunction
		};
	},
	computed: Object.assign( mapGetters( [
		'getZFunctionCallFunctionId'
	] ), {
		/**
		 * Returns the value of the function call or undefined
		 *
		 * @return {string|undefined}
		 */
		value: function () {
			return this.getZFunctionCallFunctionId( this.rowId );
		},
		/**
		 * Returns a special class name when the function call is undefined
		 *
		 * @return {string}
		 */
		iconClass: function () {
			return !this.value ? 'ext-wikilambda-function-call-undefined' : '';
		}
	} )
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-function-call {
	display: flex;
	flex-direction: row;
	justify-content: flex-start;
	gap: @spacing-25;

	.cdx-icon {
		color: @color-progressive;

		&.ext-wikilambda-function-call-undefined {
			color: @color-error;
		}
	}
}
</style>
