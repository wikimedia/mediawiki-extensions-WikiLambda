<template>
	<!--
		WikiLambda Vue component wrapper for Codex Select component, to make it wrap it's content
		and animate into a full width on focus

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<!-- eslint-disable vue/no-v-model-argument -->
	<!-- eslint-disable vue/no-unsupported-features -->
	<cdx-select
		:id="id"
		v-model:selected="value"
		class="ext-wikilambda-edit-select"
		:class="{ 'ext-wikilambda-edit-select__fitted': fitWidth }"
		:style="{ width: fieldWidth }"
		:menu-items="menuItems"
		:disabled="disabled"
		v-bind="$attrs"
	></cdx-select>
</template>

<script>
var CdxSelect = require( '@wikimedia/codex' ).CdxSelect;

// @vue/component
module.exports = exports = {
	name: 'wl-select',
	components: {
		'cdx-select': CdxSelect
	},
	inheritAttrs: false,
	props: {
		selected: {
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
		fitWidth: {
			type: Boolean,
			default: false
		},
		menuItems: {
			type: Array,
			required: true
		}
	},
	computed: {
		/**
		 * Computed wrapper for selected
		 */
		value: {
			get() { return this.selected; },
			set( value ) { this.$emit( 'update:selected', value ); }
		},
		/**
		 * Returns the width of the field depending on the fitWidth property.
		 * Because the field has min-width:fit-width css property, we can return the
		 * minimum width possible (0ch) and this will transition from fit-width to 100%
		 *
		 * @return {string}
		 */
		fieldWidth: function () {
			if ( !this.fitWidth ) {
				return 'auto';
			}
			return '0ch';
		}
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-edit-select {
	&__fitted {
		&.cdx-select {
			transition: @wl-transition-field-expand;
			min-width: fit-content;

			.cdx-select__handle {
				min-width: auto;
			}

			&--expanded {
				/* stylelint-disable declaration-no-important */
				width: 100% !important;
			}
		}
	}
}
</style>
