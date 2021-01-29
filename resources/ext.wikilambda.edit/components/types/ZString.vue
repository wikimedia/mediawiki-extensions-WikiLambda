<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zstring">
		<span>
			<span v-if="viewmode">
				<a v-if="value.match(/^Z\d+$/)" :href="'./ZObject:' + value">
					{{ value }}
				</a>
				<template v-else>{{ value }}</template>
			</span>
			<input
				v-else
				class="ext-wikilambda-zstring"
				:value="value"
				@change="onInput"
			>
		</span>
	</div>
</template>

<script>
module.exports = {
	name: 'ZString',
	props: {
		viewmode: {
			type: Boolean,
			required: true
		},
		value: {
			type: String,
			default: ''
		}
	},
	methods: {
		/**
		 * Fires the `input` event with the value of the input field
		 *
		 * @param {Object} event
		 * @fires input
		 */
		onInput: function ( event ) {
			this.$emit( 'input', event.target.value );
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-zstring {
	display: inline-block;
}
</style>
