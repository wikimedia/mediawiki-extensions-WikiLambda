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
		<input
			v-else
			v-model="value"
			:class=stringInputClass
			type="text"
			@focus="setInputClassActive"
			@focusout="removeInputClassActive">
	</div>
</template>

<script>
var
	Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'z-string',
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
			stringInputClass: 'ext-wikilambda-string__input'
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
	),
	methods: {
		setInputClassActive: function () {
			this.stringInputClass = 'ext-wikilambda-string__input-active';
		},

		removeInputClassActive: function () {
			this.stringInputClass = 'ext-wikilambda-string__input';
		}
	}
};

</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-string {
	p {
		margin: 0;
	}

	&__input-active {
		width: 100%;

		@media screen and ( min-width: @width-breakpoint-tablet ) {
			width: 50%;
		}
	}
}
</style>
