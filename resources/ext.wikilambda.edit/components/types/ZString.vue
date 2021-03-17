<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zstring">
		<span>
			<span v-if="viewmode">{{ value }}</span>
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
var Constants = require( '../../Constants.js' );

module.exports = {
	name: 'ZString',
	props: {
		viewmode: {
			type: Boolean,
			required: true
		},
		zobject: {
			type: [ Object, String ],
			default: ''
		}
	},
	computed: {
		value: function () {
			if ( typeof this.zobject === 'string' ) {
				return this.zobject;
			} else {
				return this.zobject[ Constants.Z_STRING_VALUE ];
			}
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
	},
	created: function () {
		if ( !this.viewmode && ( typeof this.zobject === 'string' ) ) {
			this.$emit( 'input', this.zobject );
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-zstring {
	display: inline-block;
	margin-top: 3px;
}
</style>
