<template>
	<!--
		WikiLambda Vue component for Z11/Monolingual String objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-monolingual-string">
		<div v-if="!edit">
			<p><span class="ext-wikilambda-lang-chip">{{ langIso }}</span> {{ text }}</p>
		</div>
		<div
			v-else
			class="ext-wikilambda-monolingual-string__edit-mode">
			<wl-text-input
				v-model="text"
				:fit-width="true"
				:chip="langIso"
				placeholder="Enter text"
				class="ext-wikilambda-monolingual-string__input">
			</wl-text-input>
		</div>
	</div>
</template>

<script>
var TextInput = require( '../base/TextInput.vue' ),
	Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-monolingual-string',
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
	computed: $.extend(
		mapGetters( [
			'getLabel',
			'getLanguageIsoCodeOfZLang',
			'getZMonolingualTextValue',
			'getZMonolingualLangValue'
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
			text: {
				/**
				 * Returns the terminal value of the string represented
				 * in this component.
				 *
				 * @return {string}
				 */
				get: function () {
					return this.getZMonolingualTextValue( this.rowId );
				},
				/**
				 * Emits a setValue event with the new value for the string
				 * and the key path information depending on the object key.
				 *
				 * @param {string} value
				 */
				set: function ( value ) {
					this.$emit( 'set-value', {
						keyPath: [
							Constants.Z_MONOLINGUALSTRING_VALUE,
							Constants.Z_STRING_VALUE
						],
						value
					} );
				}
			},

			/**
			 * Returns the language Zid of the Monolingual string
			 * object represented in this component, or the language code
			 * if lang is a literal.
			 *
			 * @return {string}
			 */
			lang: function () {
				return this.getZMonolingualLangValue( this.rowId );
			},

			/**
			 * Return the text that identifies the language in which
			 * this Monolingual String is written.
			 *
			 * @return {string}
			 */
			langIso: function () {
				return this.getLanguageIsoCodeOfZLang( this.lang ) || '';
			}
		}
	)
};

</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-monolingual-string {
	p {
		margin: 0;
		color: @color-base;
		display: flex;
		flex-direction: row;
		align-items: center;

		.ext-wikilambda-lang-chip {
			margin-right: @spacing-50;
		}
	}

	&__edit-mode {
		position: relative;
		height: @size-200;
	}
}

</style>
