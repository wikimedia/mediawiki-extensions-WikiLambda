<template>
	<!--
		WikiLambda Vue component wrapper for Codex Text Input component, to make it wrap it's content
		and animate into a full width on focus

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-edit-text-input">
		<span
			v-if="hasChip"
			class="ext-wikilambda-lang-chip"
		>{{ chip }}</span>
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
		></cdx-text-input>
	</div>
</template>

<script>
var CdxTextInput = require( '@wikimedia/codex' ).CdxTextInput;

// @vue/component
module.exports = exports = {
	name: 'wl-text-input',
	components: {
		'cdx-text-input': CdxTextInput
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
		}
	},
	data: function () {
		return {
			active: false
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
		 * TODO: Because this is a not a monospace font, the larger the word is, the
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
				// Two extra characters to account for inner padding
				chars = this.modelValue.length + 3;
			} else if ( this.placeholder && ( this.placeholder.length > 0 ) ) {
				chars = this.placeholder.length;
			}
			// Subtract 10% to accomodate a fixed width font
			chars = Math.ceil( chars - chars * 0.1 );
			// Add 5 chars if it has language chip
			if ( this.hasChip ) {
				chars = chars + 5;
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
		inputClasses: function () {
			const classes = [];
			if ( this.fitWidth ) {
				classes.push( 'ext-wikilambda-edit-text-input__fitted' );
			}
			if ( this.hasChip ) {
				classes.push( 'ext-wikilambda-edit-text-input__chipped' );
				if ( this.chip.length > 2 ) {
					classes.push( 'ext-wikilambda-edit-text-input__chipped__lg' );
				} else {
					classes.push( 'ext-wikilambda-edit-text-input__chipped__sm' );
				}
			}
			return classes;
		}
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

		&__lg {
			.cdx-text-input__input {
				padding-left: calc( 8px + 40px + 8px );
			}
		}

		&__sm {
			.cdx-text-input__input {
				padding-left: calc( 8px + 36px + 8px );
			}
		}
	}

	span.ext-wikilambda-lang-chip {
		position: relative;
		z-index: 3;
		left: @spacing-50;
	}
}
</style>
