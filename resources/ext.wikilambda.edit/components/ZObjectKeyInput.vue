<template>
	<!--
		WikiLambda Vue interface module for inputting a ZKey

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<span>
		{{ $i18n( 'wikilambda-editor-zobject-addkey' ) }}
		<input
			v-model="zkey"
			class="ext-wikilambda-zkey-input"
			:class="{ 'ext-wikilambda-zkey-input-invalid': isInvalid }"
			@change="updateKey"
		>
		<cdx-message
			v-if="isInvalid"
			:inline="true"
			type="error"
		>
			{{ $i18n( 'wikilambda-invalidzobject' ) }}
		</cdx-message>
	</span>
</template>

<script>
var CdxMessage = require( '@wikimedia/codex' ).CdxMessage;

// @vue/component
module.exports = exports = {
	name: 'z-object-key-input',
	components: {
		'cdx-message': CdxMessage
	},
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
