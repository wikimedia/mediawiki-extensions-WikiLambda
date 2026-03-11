<!--
	WikiLambda Vue component for the Abstract Content fragment preview.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-abstract-preview-fragment"
		@pointerenter="setHighlight"
		@pointerleave="unsetHighlight"
		@focus="setHighlight"
		@blur="unsetHighlight"
	>
		<cdx-progress-indicator
			v-if="!fragmentPreview || fragmentPreview.isLoading"
			class="ext-wikilambda-app-abstract-preview-fragment-loading"
		>
			{{ i18n( 'wikilambda-loading' ).text() }}
		</cdx-progress-indicator>
		<template v-else>
			<div
				v-if="fragmentPreview.hasError"
				ref="errorRef"
				class="ext-wikilambda-app-abstract-preview-fragment-error-wrapper"
			>
				<cdx-message
					class="ext-wikilambda-app-abstract-preview-fragment-error"
					:type="fragmentError.type"
				>
					{{ fragmentError.text }}
					<button
						v-if="fragmentError.retry"
						class="ext-wikilambda-app-button-reset
							ext-wikilambda-app-abstract-preview-fragment-retry"
						@click="retryPreview"
					>
						{{ i18n( 'wikilambda-abstract-preview-fragment-retry' ).text() }}
					</button>
				</cdx-message>
			</div>
			<!-- eslint-disable vue/no-v-html -->
			<div
				v-else
				ref="contentRef"
				class="ext-wikilambda-app-abstract-preview-fragment-html"
				v-html="fragmentPreview.html"
			></div>
			<!-- eslint-enable vue/no-v-html -->
		</template>
	</div>
	<span>&nbsp;</span>
</template>

<script>
const { computed, defineComponent, inject, onUnmounted, ref, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useInitReferences = require( '../../composables/useInitReferences.js' );
const useMainStore = require( '../../store/index.js' );

// Codex components
const { CdxMessage, CdxProgressIndicator } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-preview-fragment',
	components: {
		'cdx-message': CdxMessage,
		'cdx-progress-indicator': CdxProgressIndicator
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		fragment: {
			type: Object,
			required: true
		}
	},
	setup( props ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();
		const fragmentHighlightRegistry = inject( 'fragmentHighlightRegistry', null );

		// Date for today in a standard format that can be
		// parsed by the default date reading function:
		// See: https://www.wikifunctions.org/view/en/Z23997
		const dateForToday = computed( () => new Date().toISOString().slice( 0, 10 ) );

		const { contentRef, initReferences } = useInitReferences();
		const errorRef = ref( null );

		const fragmentPreview = computed( () => store.getFragmentPreview( props.keyPath ) );
		const fragmentDirty = computed( () => fragmentPreview.value && fragmentPreview.value.isDirty );
		const fragmentError = computed( () => {
			if ( !fragmentPreview.value.hasError ) {
				return null;
			}
			const error = fragmentPreview.value.error;
			return Object.assign( {}, error, {
				type: error.type || Constants.ERROR_TYPES.ERROR,
				text: error.code ?
					i18n( error.code, store.getLabelData( error.zid ).label ).text() :
					error.text
			} );
		} );

		/**
		 * Renders the preview of the given fragment for the
		 * current preview language: qid, language and today's date
		 *
		 * @param {boolean} isBulk
		 */
		function renderPreview( isBulk = false ) {
			store.renderFragmentPreview( {
				keyPath: props.keyPath,
				fragment: props.fragment,
				qid: store.getAbstractWikiId,
				date: dateForToday.value,
				language: store.getPreviewLanguageZid,
				isAsync: isBulk
			} );
		}

		/**
		 * Sets a fragment as dirty so that it triggers
		 * a fresh render attempt.
		 */
		function retryPreview() {
			store.setDirtyFragment( props.keyPath, true );
		}

		/**
		 * Add highlight to fragment
		 */
		function setHighlight() {
			store.setHighlightedFragment( props.keyPath );
		}

		/**
		 * Remove highlight from fragment
		 */
		function unsetHighlight() {
			store.setHighlightedFragment( undefined );
		}

		// Watch when fragment preview is set to dirty and rerender synchonously
		watch( fragmentDirty, ( isDirty, oldDirty ) => {
			if ( oldDirty === false && isDirty === true ) {
				renderPreview();
			}
		} );

		// Watch when fragment preview is fully unset, rerender asynchronously
		watch( fragmentPreview, ( preview ) => {
			if ( !preview ) {
				renderPreview( true );
			}
		}, { immediate: true } );

		/**
		 * Update highlight overlay registration after DOM is in sync with preview state.
		 */
		function registerNodesForHighlight() {
			if ( !fragmentHighlightRegistry ) {
				return;
			}
			const preview = fragmentPreview.value;
			if ( !preview ) {
				fragmentHighlightRegistry.unregisterFragmentNodes( props.keyPath );
				return;
			}
			if ( preview.hasError && errorRef.value ) {
				fragmentHighlightRegistry.registerFragmentNodes( props.keyPath, [ errorRef.value ] );
				return;
			}
			if ( preview.html && contentRef.value ) {
				fragmentHighlightRegistry.registerFragmentNodes(
					props.keyPath,
					Array.from( contentRef.value.childNodes || [] )
				);
				return;
			}
			fragmentHighlightRegistry.unregisterFragmentNodes( props.keyPath );
		}

		// Watch fragment preview to initialize references and register nodes for highlight
		watch(
			() => fragmentPreview.value && {
				hasError: fragmentPreview.value.hasError,
				html: fragmentPreview.value.html
			},
			( state ) => {
				if ( state && state.html && !state.hasError ) {
					initReferences();
				}
				// Register nodes for highlight after references are initialized
				registerNodesForHighlight();
			},
			{ immediate: true, flush: 'post' }
		);

		// On unmount, remove highlight state
		onUnmounted( () => {
			unsetHighlight();
			if ( fragmentHighlightRegistry ) {
				fragmentHighlightRegistry.unregisterFragmentNodes( props.keyPath );
			}
		} );

		return {
			fragmentError,
			fragmentPreview,
			contentRef,
			errorRef,
			retryPreview,
			setHighlight,
			unsetHighlight,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-preview-fragment {
	display: unset;

	.ext-wikilambda-app-abstract-preview-fragment-loading {
		margin: 0 @spacing-25;
	}

	.ext-wikilambda-app-abstract-preview-fragment-error {
		margin: @spacing-25 0;
	}

	.ext-wikilambda-app-abstract-preview-fragment-retry {
		.cdx-mixin-link();
	}

	.ext-wikilambda-app-abstract-preview-fragment-html {
		display: unset;
	}
}
</style>
