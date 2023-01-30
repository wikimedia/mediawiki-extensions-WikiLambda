<template>
	<!--
		WikiLambda Vue component for a container for "Chips" / input tags

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-chip-container" @click="focusInput">
		<chip
			v-for="chip in chips"
			:key="chip.id"
			:index="chip.id"
			:text="chip.value"
			:readonly="readonly"
			class="ext-wikilambda-chip-container__item"
			@edit-chip="editChip"
			@remove-chip="removeChip"
		></chip>
		<input
			v-if="canAdd"
			ref="chipInput"
			v-model="newText"
			class="ext-wikilambda-chip-container__input"
			:aria-label="inputAriaLabel"
			:placeholder="!hasChips ? inputPlaceholder : ''"
			@keydown.enter="addChip"
		>
	</div>
</template>

<script>
var Chip = require( './Chip.vue' );

// @vue/component
module.exports = exports = {
	name: 'chip-container',
	components: {
		chip: Chip
	},
	props: {
		chips: {
			type: Array,
			required: true,

			default: function () {
				return [];
			}
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
			type: Object,
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
			this.$emit( 'remove-chip', id );
		},
		focusInput: function () {
			if ( this.canAdd ) {
				this.$refs.chipInput.focus();
			}
		}
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-chip-container {
	display: flex;
	flex: 1 auto;
	flex-flow: wrap;
	border-radius: @border-radius-base;
	padding: 0 @spacing-50;
	border-width: @border-width-base;
	border-style: @border-style-base;
	border-color: @border-color-base;
	box-shadow: @box-shadow-inset-small transparent;

	&__item {
		margin-right: 5px;
		margin-top: 3px;
		margin-bottom: 3px;
	}

	&__input {
		flex-grow: inherit;
		height: 26px;
		padding: 2px 0;
		border: 0;
		outline: 0;
		font-family: inherit;
		font-size: inherit;
		line-height: 1.43em;
	}
}
</style>
