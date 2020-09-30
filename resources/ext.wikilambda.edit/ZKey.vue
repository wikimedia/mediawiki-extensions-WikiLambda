<template>
	<!--
		WikiLambda Vue interface module for inputting a ZKey

		@copyright 2020 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<input
		v-model="zkey"
		class="ext-wikilambda-zkey"
		:class="{ 'ext-wikilambda-zkey-invalid': isInvalid }"
		@change="updateKey($event)"
	>
</template>

<script>

module.exports = {
	name: 'ZKey',
	props: [ 'zkey', 'isInvalid' ],
	methods: {
		// TODO: Type-ahead lookup with human strings.
		updateKey: function ( event ) {
			this.zkey = event.target.value;

			if ( this.zkey.match( /^Z\d+K\d+$/ ) ) {
				this.isInvalid = false;
				this.$emit( 'change', event );
			} else {
				this.isInvalid = true;
			}
		}
	},
	data: {
	}
};
</script>

<style lang="less">
.ext-wikilambda-zkey {
	background: #ffe;
}

.ext-wikilambda-zkey-invalid {
	background: #fee;
	border: 2px #f00 solid;
}
</style>
