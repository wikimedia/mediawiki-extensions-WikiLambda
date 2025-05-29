<!--
	WikiLambda Vue component for Z7/Function Call objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-call" data-testid="z-function-call">
		<cdx-icon
			:icon="icon"
			class="ext-wikilambda-app-function-call__icon"
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
const { CdxIcon } = require( '../../../codex.js' );
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );

const icons = require( '../../../lib/icons.json' );
const useMainStore = require( '../../store/index.js' );
const ZObjectToString = require( './ZObjectToString.vue' );

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
	computed: Object.assign( {}, mapState( useMainStore, [
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
			return !this.value ? 'ext-wikilambda-app-function-call__icon--undefined' : '';
		}
	} )
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-call {
	display: flex;
	flex-direction: row;
	justify-content: flex-start;
	gap: @spacing-25;

	.ext-wikilambda-app-function-call__icon {
		color: @color-progressive;
		flex: none;
		margin-top: @size-25;

		&--undefined {
			color: @color-error;
		}
	}
}
</style>
