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
			:class="{ 'ext-wikilambda-edit-text-input__chipped': hasChip }"
			:aria-label="ariaLabel"
			:placeholder="placeholder"
			:disabled="disabled"
			v-bind="$attrs"
			data-testid="text-input"
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
				if ( this.value && this.value.length > this.maxChars ) {
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
	min-height: @min-size-interactive-pointer;
	display: flex;
	flex-direction: row;
	align-items: center;

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
		z-index: 3;
		left: @spacing-50;
		min-width: calc( 36px - 16px );
	}
}
</style>
