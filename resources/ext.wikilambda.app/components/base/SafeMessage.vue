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
	<!-- eslint-disable vue/no-v-html -->
	<span
		v-else-if="hasHtml"
		class="ext-wikilambda-app-safe-error"
		v-html="sanitisedMessage"></span>
	<!-- eslint-enable vue/no-v-html -->
	<span
		v-else
		class="ext-wikilambda-app-safe-error">{{ error.errorMessage }}</span>
</template>

<script>
const { defineComponent, ref, watch } = require( 'vue' );

const ErrorData = require( '../../store/classes/ErrorData.js' );
const useMainStore = require( '../../store/index.js' );
const { escapeHtml } = require( '../../utils/errorUtils.js' );

module.exports = exports = defineComponent( {
	name: 'wl-safe-message',
	props: {
		error: {
			type: ErrorData,
			required: true
		}
	},
	setup( props ) {
		const store = useMainStore();

		// Holds the sanitised version of a raw error message that contains HTML.
		const sanitisedMessage = ref( '' );
		// Whether the current raw message contains HTML markup that needs to be
		// sanitised before being injected with v-html. i18n messages built
		// through mw.message().parse() are handled by error.isSafeForHtml and
		// don't reach this branch; plain-text raw messages are rendered as text.
		const hasHtml = ref( false );

		/**
		 * Detects whether a raw message contains HTML markup. Server-generated
		 * error messages can embed HTML (e.g. the Z509/list of errors <ul>
		 * markup), but that HTML can't be trusted and must be sanitised.
		 *
		 * @param {string} message
		 * @return {boolean}
		 */
		function containsHtml( message ) {
			return typeof message === 'string' && /<[a-z!/][^>]*>/i.test( message );
		}

		/**
		 * Sanitises a raw HTML error message for safe rendering. Falls back to
		 * an escaped version of the message if sanitisation fails or returns
		 * nothing, so the error text is never silently lost.
		 *
		 * @param {string} message
		 */
		function sanitise( message ) {
			store.sanitiseHtml( message ).then( ( sanitised ) => {
				sanitisedMessage.value = sanitised || escapeHtml( message );
			} ).catch( () => {
				sanitisedMessage.value = escapeHtml( message );
			} );
		}

		watch( () => props.error, ( error ) => {
			hasHtml.value = !error.isSafeForHtml && containsHtml( error.errorMessage );
			if ( hasHtml.value ) {
				sanitise( error.errorMessage );
			} else {
				sanitisedMessage.value = '';
			}
		}, { immediate: true } );

		return {
			hasHtml,
			sanitisedMessage
		};
	}
} );
</script>
