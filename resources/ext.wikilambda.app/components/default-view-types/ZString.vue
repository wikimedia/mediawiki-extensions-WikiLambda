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
			v-model="value"
			aria-label=""
			placeholder=""
			data-testid="text-input"
		></cdx-text-input>
	</div>
</template>

<script>
const { CdxTextInput } = require( '@wikimedia/codex' );
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-string',
	components: {
		'cdx-text-input': CdxTextInput
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
		};
	},
	computed: Object.assign(
		mapState( useMainStore, [
			'getZObjectKeyByRowId',
			'getZStringTerminalValue'
		] ),
		{
			/**
			 * Computed value:
			 * 1. Getter gets the value from the state.
			 * 2. Setter informs the ZObjectKeyValue of the change.
			 * Only the ZObjectKeyValue responds to the 'setValue' emitted event
			 * so only the ZObjectKeyValue is doing operations to transform
			 * the state data. This is so that we don't duplicate state mutation
			 * logic all over the components, and builtin components are just
			 * visual representations and have zero logic.
			 */
			value: {
				/**
				 * Returns the terminal value of the string represented
				 * in this component.
				 *
				 * @return {string}
				 */
				get: function () {
					return this.getZStringTerminalValue( this.rowId );
				},
				/**
				 * Emits a setValue event with the new value for the string
				 * and the key path information depending on the object key.
				 *
				 * @param {string} value
				 */
				set: function ( value ) {
					const keyPath = ( this.key !== Constants.Z_STRING_VALUE ) ?
						[ Constants.Z_STRING_VALUE ] :
						[];
					this.$emit( 'set-value', { keyPath, value } );
				}
			},
			/**
			 * Returns the key that contains the string value
			 * represented in this component.
			 *
			 * @return {string}
			 */
			key: function () {
				return this.getZObjectKeyByRowId( this.rowId );
			}
		}
	)
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
