<!--
	WikiLambda Vue component wrapper for Codex Select component, to make it wrap its content
	and animate into a full width on focus

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-select
		:id="id"
		v-model:selected="value"
		class="ext-wikilambda-edit-select"
		:menu-items="menuItems"
		:disabled="disabled"
		:default-label="defaultLabel"
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
		menuItems: {
			type: Array,
			required: true
		},
		defaultLabel: {
			type: String,
			required: false,
			default: ''
		}
	},
	computed: {
		/**
		 * Computed wrapper for selected
		 */
		value: {
			get() { return this.selected; },
			set( value ) { this.$emit( 'update:selected', value ); }
		}
	}
};
</script>
