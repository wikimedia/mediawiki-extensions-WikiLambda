<template>
	<!--
		WikiLambda Vue component for Z6/String objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-string">
		<p v-if="!edit">
			{{ value }}
		</p>
		<wl-text-input
			v-else
			v-model="value"
			:fit-width="true"
			aria-label=""
			placeholder=""
		></wl-text-input>
	</div>
</template>

<script>
var TextInput = require( '../base/TextInput.vue' ),
	Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'z-string',
	components: {
		'wl-text-input': TextInput
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
	computed: $.extend(
		mapGetters( [
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
};

</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-string {
	p {
		margin: 0;
		color: @color-base;
	}
}
</style>
