<template>
	<!--
		WikiLambda Vue component wrapper for Codex Text Input component, to make it wrap it's content
		and animate into a full width on focus

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div
		class="ext-wikilambda-edit-text-input"
		:style="inputCssVariablesStyle"
	>
		<cdx-info-chip
			v-if="hasChip"
			ref="chipComponent"
			class="ext-wikilambda-lang-chip"
			:class="{ 'ext-wikilambda-lang-chip__empty': hasEmptyChip }"
		>
			{{ chip.toUpperCase() }}
		</cdx-info-chip>

		<cdx-text-input
			:id="id"
			v-model="value"
			class="ext-wikilambda-edit-text-input__field"
			:class="inputClasses"
			:style="{ width: fieldWidth }"
			:aria-label="ariaLabel"
			:placeholder="placeholder"
			:disabled="disabled"
			v-bind="$attrs"
			@focus="active = true"
			@blur="active = false"
			@input="onUpdate"
		></cdx-text-input>
	</div>
</template>

<script>
var CdxTextInput = require( '@wikimedia/codex' ).CdxTextInput;
var CdxInfoChip = require( '@wikimedia/codex' ).CdxInfoChip;

// @vue/component
module.exports = exports = {
	name: 'wl-text-input',
	components: {
		'cdx-text-input': CdxTextInput,
		'cdx-info-chip': CdxInfoChip
	},
	inheritAttrs: false,
	props: {
		modelValue: {
			type: String,
			default: ''
		},
		id: {
			type: String,
			required: false
		},
		disabled: {
			type: Boolean,
			default: false
		},
		placeholder: {
			type: String,
			default: ''
		},
		ariaLabel: {
			type: String,
			required: false
		},
		fitWidth: {
			type: Boolean,
			default: false
		},
		chip: {
			type: String,
			required: false
		},
		maxChars: {
			type: Number,
			required: false,
			default: undefined
		}
	},
	data: function () {
		return {
			active: false,
			chipComponent: null,
			chipWidth: 72
		};
	},
	computed: {
		/**
		 * Computed wrapper for modelValue
		 */
		value: {
			get() { return this.modelValue; },
			set( value ) { this.$emit( 'update:modelValue', value ); }
		},

		/**
		 * This computed property calculates the width of the field depending on its value
		 *
		 * Because this is a not a monospace font, the larger the word is, the
		 * less space it occupies in ch, so probably we should remove a %:
		 *
		 * > 1ch is usually wider than the average character width, usually by around 20-30%
		 *
		 * Refs:
		 * https://stackoverflow.com/questions/3392493/adjust-width-of-input-field-to-its-input
		 * https://meyerweb.com/eric/thoughts/2018/06/28/what-is-the-css-ch-unit/
		 *
		 * @return {string}
		 */
		fieldWidth: function () {
			if ( !this.fitWidth ) {
				return 'auto';
			}
			if ( this.active ) {
				return '100%';
			}
			// If no value or placeholder, default is 20 characters
			var chars = 20;
			if ( this.modelValue && ( this.modelValue.length > 0 ) ) {
				// Three extra characters to account for inner padding
				chars = this.modelValue.length + 3;
			} else if ( this.placeholder && ( this.placeholder.length > 0 ) ) {
				chars = this.placeholder.length;
			}
			// Subtract 10% to accomodate a fixed width font
			chars = Math.ceil( chars - chars * 0.1 );
			// Add 5 chars + chip.length (to make it larger if there's more text in the chip) if it has language chip
			if ( this.hasChip ) {
				chars = chars + ( this.chip.length + 5 );
				// An empty chip is like a 2 character chip
				if ( this.hasEmptyChip ) {
					chars = chars + 2;
				}
			}
			return `${chars}ch`;
		},

		/**
		 * Whether the text input has an embed language chip
		 *
		 * @return {boolean}
		 */
		hasChip: function () {
			return ( this.chip !== undefined );
		},

		/**
		 * Whether the text input has an embed language chip
		 * but the chip has an empty value
		 *
		 * @return {boolean}
		 */
		hasEmptyChip: function () {
			return ( this.chip === '' );
		},

		/**
		 * Returns the dynamically calculated width of the inner language chip
		 *
		 * @return {string}
		 */
		inputCssVariablesStyle: function () {
			return {
				'--chipWidthPx': `${this.chipWidth}px`
			};
		},

		/**
		 * Returns the css class names for the text input: "fitted" when the
		 * width needs to adapt on focus, and "chipped" when it contains an
		 * inner language chip inside the text field. These classes are not
		 * exclusive.
		 *
		 * @return {Array}
		 */
		inputClasses: function () {
			const classes = [];
			if ( this.fitWidth ) {
				classes.push( 'ext-wikilambda-edit-text-input__fitted' );
			}
			if ( this.hasChip ) {
				classes.push( 'ext-wikilambda-edit-text-input__chipped' );
			}
			return classes;
		}
	},
	methods: {
		getAndStoreChipWidth() {
			if ( !this.chipComponent ) {
				return;
			}

			this.chipWidth = this.chipComponent.$el.offsetWidth;
		},
		onUpdate: function () {
			if ( this.maxChars ) {
				if ( this.value.length > this.maxChars ) {
					this.value = this.value.slice( 0, Math.max( 0, this.maxChars ) );
				}
			}
		}
	},
	watch: {
		chip: {
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
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-edit-text-input {
	height: inherit;
	display: flex;
	flex-direction: row;
	align-items: center;

	&__fitted {
		transition: @wl-transition-field-expand;

		.cdx-text-input__input {
			min-width: auto;
		}
	}

	&__chipped {
		position: absolute;
		top: 0;

		.cdx-text-input__input {
			--spacing-50: @spacing-50;
			padding-left: ~'calc( var(--spacing-50) + var(--chipWidthPx) + var(--spacing-50) )';
		}
	}

	.ext-wikilambda-lang-chip {
		position: relative;
		top: 2px;
		z-index: 3;
		left: @spacing-50;
		min-width: calc( 36px - 16px );
	}
}
</style>
