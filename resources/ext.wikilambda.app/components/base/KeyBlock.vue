<template>
	<div
		class="ext-wikilambda-app-key-block"
		:class="{
			'ext-wikilambda-app-key-block--view': type === 'view',
			'ext-wikilambda-app-key-block--edit': type === 'edit',
			'ext-wikilambda-app-key-block--edit-disabled': type === 'edit-disabled',
			'ext-wikilambda-app-key-block--is-bold': keyBold
		}"
		data-testid="key-block">
		<slot></slot>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );

module.exports = exports = defineComponent( {
	name: 'wl-key-block',
	props: {
		keyBold: {
			type: Boolean,
			default: false
		},
		type: {
			type: String,
			default: undefined,
			validator( value ) {
				// Ensure that if 'type' is provided, it must be one of the allowed values
				return value === undefined || [ 'edit', 'view', 'edit-disabled' ].includes( value );
			}
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-key-block {
	padding: 0;
	display: flex;
	flex-direction: row;
	align-items: center;

	&--edit {
		color: @color-base;
	}

	&--edit-disabled {
		color: @color-disabled;
	}

	&--view {
		color: @color-subtle;
	}

	&--is-bold {
		font-weight: bold;
		color: @color-base;
	}
}

</style>
