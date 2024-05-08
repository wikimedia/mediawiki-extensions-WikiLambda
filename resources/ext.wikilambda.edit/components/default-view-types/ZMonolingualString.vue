<!--
	WikiLambda Vue component for Z11/Monolingual String objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-monolingual-string">
		<!-- Monolingual string on view mode -->
		<div
			v-if="!edit"
			class="ext-wikilambda-monolingual-string__view-mode"
		>
			<cdx-info-chip
				class="ext-wikilambda-lang-chip"
				:class="{ 'ext-wikilambda-lang-chip__empty': hasEmptyLang }"
			>
				{{ langIso.toUpperCase() }}
			</cdx-info-chip>
			{{ text }}
		</div>
		<!-- Monolingual string on edit mode -->
		<div
			v-else
			class="ext-wikilambda-monolingual-string__edit-mode"
			:style="inputCssVariablesStyle"
		>
			<cdx-info-chip
				ref="chipComponent"
				class="ext-wikilambda-lang-chip"
				:class="{ 'ext-wikilambda-lang-chip__empty': hasEmptyLang }"
			>
				{{ langIso.toUpperCase() }}
			</cdx-info-chip>
			<cdx-text-input
				v-model="text"
				placeholder="Enter text"
			>
			</cdx-text-input>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const CdxInfoChip = require( '@wikimedia/codex' ).CdxInfoChip,
	CdxTextInput = require( '@wikimedia/codex' ).CdxTextInput,
	Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = exports = defineComponent( {
	name: 'wl-z-monolingual-string',
	components: {
		'cdx-text-input': CdxTextInput,
		'cdx-info-chip': CdxInfoChip
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
			chipComponent: null,
			chipWidth: 72
		};
	},
	computed: $.extend(
		mapGetters( [
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
			},
			/**
			 * Returns the dynamically calculated width of the inner language chip
			 *
			 * @return {string}
			 */
			inputCssVariablesStyle: function () {
				return {
					'--chipWidthPx': `${ this.chipWidth }px`
				};
			},
			/**
			 * Whether the language is still not defined, so langIso is an empty string
			 *
			 * @return {boolean}
			 */
			hasEmptyLang: function () {
				return ( this.langIso === '' );
			}
		}
	),
	methods: {
		getAndStoreChipWidth() {
			if ( !this.chipComponent ) {
				return;
			}
			this.chipWidth = this.chipComponent.$el.offsetWidth;
		}
	},
	watch: {
		langIso: {
			handler: function () {
				this.getAndStoreChipWidth();
			},
			immediate: true,
			flush: 'post'
		}
	},
	mounted() {
		this.chipComponent = this.$refs.chipComponent;
		this.getAndStoreChipWidth();
	}
} );

</script>

<style lang="less">
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-monolingual-string {
	.ext-wikilambda-lang-chip {
		.cdx-info-chip--text {
			font-size: ~'14px';
		}

		&__empty {
			border: 1px dashed @border-color-base;

			.cdx-info-chip--text {
				height: 22px;
				min-width: 22px;
			}
		}
	}

	&__view-mode {
		margin: 0;
		color: @color-base;
		display: flex;
		flex-direction: row;
		align-items: flex-start;

		.ext-wikilambda-lang-chip {
			margin-right: @spacing-50;
		}
	}

	&__edit-mode {
		min-height: @min-size-interactive-pointer;
		display: flex;
		flex-direction: row;
		align-items: center;
		position: relative;
		z-index: 3;
		min-width: calc( 36px - 16px );

		.cdx-text-input__input {
			--spacing-50: @spacing-50;
			padding-left: ~'calc( var(--spacing-50) + var(--chipWidthPx) + var(--spacing-50) )';
		}

		.ext-wikilambda-lang-chip {
			position: absolute;
			z-index: 3;
			min-width: calc( 36px - 16px );
			left: @spacing-50;
		}
	}
}
</style>
