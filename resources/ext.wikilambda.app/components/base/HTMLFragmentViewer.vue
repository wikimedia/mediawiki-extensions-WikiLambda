<!-- eslint-disable vue/no-v-html -->
<!--
	WikiLambda Vue base component for displaying HTML fragments with toggle between rendered and raw views.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-html-fragment-viewer">
		<code-editor
			v-if="!showRendered"
			class="ext-wikilambda-app-html-fragment-viewer__code-editor"
			mode="html"
			:read-only="true"
			:disabled="true"
			:value="html"
		></code-editor>
		<div
			v-else
			class="ext-wikilambda-app-html-fragment-viewer__rendered"
		>
			<cdx-progress-indicator v-if="isSanitising">
				{{ i18n( 'wikilambda-loading' ).text() }}
			</cdx-progress-indicator>
			<!-- eslint-disable-next-line vue/no-v-html -->
			<div
				v-else
				ref="contentRef"
				v-html="sanitisedHtml"></div>
		</div>
		<div class="ext-wikilambda-app-html-fragment-viewer__toggle-container">
			<cdx-toggle-switch
				class="ext-wikilambda-app-html-fragment-viewer__toggle"
				:model-value="showRendered"
				@update:model-value="showRendered = $event"
			>
				{{ toggleLabel }}
			</cdx-toggle-switch>
		</div>
	</div>
</template>

<script>
const { defineComponent, inject, ref, watch } = require( 'vue' );
const CodeEditor = require( './CodeEditor.vue' );
const useInitReferences = require( '../../composables/useInitReferences.js' );
const useMainStore = require( '../../store/index.js' );
const { CdxToggleSwitch, CdxProgressIndicator } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-html-fragment-viewer',
	components: {
		'code-editor': CodeEditor,
		'cdx-toggle-switch': CdxToggleSwitch,
		'cdx-progress-indicator': CdxProgressIndicator
	},
	props: {
		/**
		 * The raw HTML content to display.
		 *
		 * @type {string}
		 */
		html: {
			type: String,
			required: true
		},
		/**
		 * Label text for the toggle switch.
		 *
		 * @type {string}
		 */
		toggleLabel: {
			type: String,
			required: true
		}
	},
	setup( props ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const showRendered = ref( true );
		const sanitisedHtml = ref( '' );
		const isSanitising = ref( false );
		const { contentRef, initReferences } = useInitReferences();

		/**
		 * Sanitises the HTML fragment value for safe rendering.
		 * Uses cached sanitization to avoid redundant API calls.
		 *
		 * @param {string} html - The raw HTML to sanitise
		 */
		function sanitiseHtml( html ) {
			isSanitising.value = true;
			store.sanitiseHtml( html ).then( ( sanitised ) => {
				sanitisedHtml.value = sanitised;
				isSanitising.value = false;
				// Initialize references after HTML is rendered
				initReferences();
			} ).catch( () => {
				sanitisedHtml.value = '';
				isSanitising.value = false;
			} );
		}

		// Watch for HTML changes and sanitise when showing rendered view
		watch( () => props.html, () => {
			if ( showRendered.value && props.html ) {
				sanitiseHtml( props.html );
			}
		}, { immediate: true } );

		// Watch showRendered to sanitise when switching to rendered view
		watch( showRendered, ( newValue ) => {
			if ( newValue && props.html ) {
				sanitiseHtml( props.html );
			}
		} );

		return {
			i18n,
			isSanitising,
			sanitisedHtml,
			showRendered,
			contentRef
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-html-fragment-viewer {
	.ext-wikilambda-app-html-fragment-viewer__toggle-container {
		margin-top: @spacing-50;
	}
}
</style>
