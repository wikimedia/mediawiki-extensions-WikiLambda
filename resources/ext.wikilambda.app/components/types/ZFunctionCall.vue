<!--
	WikiLambda Vue component for Z7/Function Call objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-call" data-testid="z-function-call">
		<cdx-icon
			class="ext-wikilambda-app-function-call__icon"
			:icon="icon"
			:class="iconClass"
		></cdx-icon>
		<wl-z-object-to-string
			:key-path="keyPath"
			:object-value="objectValue"
			:edit="edit"
			data-testid="z-object-to-string"
			@expand="$emit( 'expand', true )"
		></wl-z-object-to-string>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );

const icons = require( '../../../lib/icons.json' );
const zobjectMixin = require( '../../mixins/zobjectMixin.js' );

// Type components
const ZObjectToString = require( './ZObjectToString.vue' );
// Codex components
const { CdxIcon } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-function-call',
	components: {
		'wl-z-object-to-string': ZObjectToString,
		'cdx-icon': CdxIcon
	},
	mixins: [ zobjectMixin ],
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			icon: icons.cdxIconFunction
		};
	},
	computed: {
		/**
		 * Returns the value of the function call or undefined
		 *
		 * @return {string|undefined}
		 */
		value: function () {
			return this.getZFunctionCallFunctionId( this.objectValue );
		},
		/**
		 * Returns a special class name when the function call is undefined
		 *
		 * @return {string}
		 */
		iconClass: function () {
			return !this.value ? 'ext-wikilambda-app-function-call__icon--undefined' : '';
		}
	}
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
