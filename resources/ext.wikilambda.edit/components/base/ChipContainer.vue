<template>
	<!--
		WikiLambda Vue component for a container for "Chips" / input tags

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-chip-container">
		<chip
			v-for="chip in chips"
			:key="chip.id"
			:index="chip.id"
			width=".5em"
			height=".5em"
			:text="chip.value"
			:readonly="readonly"
			@edit-chip="editChip"
			@remove-chip="removeChip"
		></chip>
		<input
			v-if="canAdd"
			v-model="newText"
			class="ext-wikilambda-chip-container__input"
			:aria-label="inputAriaLabel"
			:placeholder="inputPlaceholder"
			@keydown.enter="addChip"
		>
	</div>
</template>

<script>
var Chip = require( './Chip.vue' );

// @vue/component
module.exports = {
	name: 'chip-container',
	components: {
		chip: Chip
	},
	props: {
		chips: {
			type: Array,
			required: true,
			// eslint-disable-next-line vue/require-valid-default-prop
			default: []
		},
		canAdd: {
			type: Boolean, // can add a chip to the collection
			required: false,
			default: true
		},
		readonly: {
			type: Boolean, // can edit an existing chip
			required: false,
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
	methods: {
		editChip: function ( index, name ) {
			this.$emit( 'edit-chip', index, name );
		},
		addChip: function () {
			this.$emit( 'add-chip', this.newText );
			this.newText = '';
		},
		removeChip: function ( index ) {
			this.$emit( 'remove-chip', index );
		}
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-chip-container {
	display: flex;

	&__input {
		border: 1px solid transparent;
		width: 300px;
	}

	input:focus {
		border-left: 0;
		border-top: 0;
		border-bottom: 0;
		outline: 0;
	}
}
</style>
