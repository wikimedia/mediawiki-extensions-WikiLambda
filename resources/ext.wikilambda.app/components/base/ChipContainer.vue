<!--
	WikiLambda Vue component for a container for "Chips" / input tags

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-chip-container"
		:class="{ 'ext-wikilambda-app-chip-container--disabled': disabled }"
		@click="focusInput"
	>
		<wl-chip
			v-for="chip in chips"
			:key="chip.id"
			class="ext-wikilambda-app-chip-container__chip"
			:index="chip.id"
			:text="chip.value"
			:readonly="readonly"
			@edit-chip="editChip"
			@remove-chip="removeChip"
		></wl-chip>
		<input
			ref="chipInput"
			v-model="newText"
			class="ext-wikilambda-app-chip-container__input"
			data-testid="chip-input"
			:disabled="disabled"
			:aria-label="inputAriaLabel"
			:placeholder="!hasChips ? inputPlaceholder : ''"
			@keydown.enter="addChip"
		>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const Chip = require( './Chip.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-chip-container',
	components: {
		'wl-chip': Chip
	},
	props: {
		chips: {
			type: Array,
			required: true,
			default: function () {
				return [];
			}
		},
		disabled: { // disabled field, no edits
			type: Boolean,
			required: false,
			default: false
		},
		canAdd: {
			type: Boolean, // can add a chip to the collection
			required: false,
			// eslint-disable-next-line vue/no-boolean-default
			default: true
		},
		readonly: {
			type: Boolean, // can edit an existing chip
			required: false,
			// eslint-disable-next-line vue/no-boolean-default
			default: true
		},
		inputPlaceholder: {
			type: String,
			required: false,
			default: null
		},
		inputAriaLabel: {
			type: String,
			required: false,
			default: null
		}
	},
	data: function () {
		return {
			newText: ''
		};
	},
	computed: {
		hasChips: function () {
			return this.chips.length > 0;
		}
	},
	methods: {
		editChip: function ( id, name ) {
			this.$emit( 'edit-chip', id, name );
		},
		addChip: function () {
			if ( this.newText ) {
				this.$emit( 'add-chip', this.newText );
				this.newText = '';
			}
		},
		removeChip: function ( id ) {
			if ( !this.disabled ) {
				this.$emit( 'remove-chip', id );
			}
		},
		focusInput: function () {
			if ( this.canAdd && !this.disabled ) {
				this.$refs.chipInput.focus();
			}
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-chip-container {
	display: flex;
	flex: 1 auto;
	flex-flow: wrap;
	gap: @spacing-25;
	border-radius: @border-radius-base;
	padding: @spacing-25 @spacing-50;
	border-width: @border-width-base;
	border-style: @border-style-base;
	border-color: @border-color-base;
	box-shadow: @box-shadow-inset-small transparent;
	min-width: 256px;
	box-sizing: border-box;

	&--disabled {
		background-color: #eaecf0;
		color: #72777d;
		-webkit-text-fill-color: #72777d;
		border-color: #c8ccd1;
	}

	.ext-wikilambda-app-chip-container__input {
		flex-grow: inherit;
		padding: 0;
		border: 0;
		outline: 0;
		font-family: inherit;
		font-size: inherit;
		height: @spacing-150;
	}

	.ext-wikilambda-app-chip-container__chip {
		margin: 0;
	}
}
</style>
