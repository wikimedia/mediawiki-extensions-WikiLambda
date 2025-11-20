<!--
	WikiLambda Vue component for Z6/String objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-string" data-testid="z-string">
		<p
			v-if="!edit"
			class="ext-wikilambda-app-string__value"
			data-testid="view-only-string">
			"{{ value }}"
		</p>
		<cdx-text-input
			v-else
			:model-value="value"
			aria-label=""
			placeholder=""
			data-testid="text-input"
			:disabled="disabled"
			@update:model-value="setValue"
		></cdx-text-input>
	</div>
</template>

<script>
const { defineComponent, computed } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useZObject = require( '../../composables/useZObject.js' );

// Codex components
const { CdxTextInput } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-string',
	components: {
		'cdx-text-input': CdxTextInput
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: [ Object, String ],
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	emits: [ 'set-value' ],
	setup( props, { emit } ) {
		// Use ZObject utilities composable
		const { getZStringTerminalValue, key } = useZObject( { keyPath: props.keyPath } );

		/**
		 * Returns the terminal value of the string represented
		 * in this component.
		 *
		 * @return {string}
		 */
		const value = computed( () => getZStringTerminalValue( props.objectValue ) );

		/**
		 * Sets the value by emitting a setValue event.
		 * Only the ZObjectKeyValue responds to the 'setValue' emitted event
		 * so only the ZObjectKeyValue is doing operations to transform
		 * the state data. This is so that we don't duplicate state mutation
		 * logic all over the components, and builtin components are just
		 * visual representations and have zero logic.
		 *
		 * @param {string} newValue
		 */
		function setValue( newValue ) {
			const keyPath = key.value !== Constants.Z_STRING_VALUE ? [ Constants.Z_STRING_VALUE ] : [];
			emit( 'set-value', { keyPath, value: newValue } );
		}

		return {
			setValue,
			value
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-string {
	.ext-wikilambda-app-string__value {
		margin: 0;
		color: @color-base;
		word-break: break-word;
	}
}
</style>
