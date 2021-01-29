<template>
	<!--
		WikiLambda Vue interface module for inputting a ZKey

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<input
		v-model="zkey"
		class="ext-wikilambda-zkey-input"
		:class="{ 'ext-wikilambda-zkey-input-invalid': isInvalid }"
		@change="updateKey"
	>
</template>

<script>

module.exports = {
	name: 'ZObjectKeyInput',
	data: function () {
		return {
			zkey: '',
			isInvalid: false
		};
	},
	methods: {
		// TODO: Type-ahead lookup with human strings.
		updateKey: function () {
			if ( this.zkey.match( /^Z\d+K\d+$/ ) ) {
				this.isInvalid = false;
				this.$emit( 'change', this.zkey );
				this.zkey = null;
			} else {
				this.isInvalid = !!this.zkey;
			}
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-zkey-input {
	background: #ffe;
}

.ext-wikilambda-zkey-input-invalid {
	background: #fee;
	border: 2px #f00 solid;
}
</style>
