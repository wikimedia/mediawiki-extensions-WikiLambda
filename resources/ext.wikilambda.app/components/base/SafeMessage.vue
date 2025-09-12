<!--
	WikiLambda Vue template component for safely rendering an error message

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<!-- eslint-disable vue/no-v-html -->
	<span
		v-if="error.isSafeForHtml"
		class="ext-wikilambda-app-safe-error"
		v-html="error.errorMessage"></span>
	<!-- eslint-enable vue/no-v-html -->
	<span
		v-else
		class="ext-wikilambda-app-safe-error">{{ error.errorMessage }}</span>
</template>

<script>
const { defineComponent } = require( 'vue' );

const ErrorData = require( '../../store/classes/ErrorData.js' );

module.exports = exports = defineComponent( {
	name: 'wl-safe-message',
	props: {
		error: {
			type: ErrorData,
			required: true
		}
	}
} );
</script>
