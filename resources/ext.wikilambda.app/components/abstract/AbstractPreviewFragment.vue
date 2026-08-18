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
		<!-- Fragment exists but was not initialized in this language -->
		<div
			v-if="isMissing"
			ref="contentRef"
			class="ext-wikilambda-app-abstract-preview-fragment-blank-wrapper"
		>
			<div class="ext-wikilambda-app-abstract-preview-fragment-blank">
				{{ missingLabel }}
				<button
					v-if="missingCanRetry"
					type="button"
					class="ext-wikilambda-app-button-reset
						ext-wikilambda-app-abstract-preview-fragment-retry"
					:aria-label="i18n( 'wikilambda-abstract-preview-fragment-retry' ).text()"
					@click.stop="retryPreview"
				>
					<cdx-icon :icon="iconRetry"></cdx-icon>
				</button>
			</div>
		</div>

		<!-- Fragment is loading (promise in flight) -->
		<cdx-progress-indicator
			v-else-if="fragmentPreview.isLoading"
			class="ext-wikilambda-app-abstract-preview-fragment-loading"
		>
			{{ i18n( 'wikilambda-loading' ).text() }}
		</cdx-progress-indicator>

		<!-- Fragment is available (error or success) -->
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
</template>

<script>
const { computed, defineComponent, inject, onUnmounted, ref, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useInitReferences = require( '../../composables/useInitReferences.js' );
const useInitImages = require( '../../composables/useInitImages.js' );
const useMainStore = require( '../../store/index.js' );
const icons = require( '../../../lib/icons.json' );

// Codex components
const { CdxMessage, CdxIcon, CdxProgressIndicator } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-preview-fragment',
	components: {
		'cdx-message': CdxMessage,
		'cdx-icon': CdxIcon,
		'cdx-progress-indicator': CdxProgressIndicator
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		fragmentHash: {
			type: String,
			required: false,
			default: null
		}
	},
	emits: [ 'retry' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const iconRetry = icons.cdxIconReload;

		// Fragment Preview Status
		// =======================

		// Fragment preview as cached by the fragmentHash:languageZid key
		const fragmentPreview = computed( () => {
			const storedPreview = store.getFragmentPreview(
				props.fragmentHash,
				store.getPreviewLanguageZid
			);
			return storedPreview || {
				isLoading: false,
				isBlank: true
			};
		} );

		// The fragment is missing so the editor should see a missing state
		const isMissing = computed( () => {
			if ( fragmentPreview.value.isLoading ) {
				return false;
			}
			return fragmentPreview.value.isBlank || fragmentPreview.value.isPending;
		} );

		// The fragment is missing and can be requested again, show retry button
		const missingCanRetry = computed( () => (
			fragmentPreview.value.isBlank ||
			fragmentPreview.value.isPending
		) );

		// Label of the missing (blank or pending) block
		const missingLabel = computed( () => ( fragmentPreview.value.isPending ?
			i18n( 'wikilambda-abstract-preview-fragment-pending' ).text() :
			i18n( 'wikilambda-abstract-preview-fragment-missing' ).text() ) );

		// Observe fragmentPreview changes and request retry when no preview available.
		// Options:
		// * deep should be false, we only want to observe a change in the object reference.
		// * immediate should be false, to not cause fragment-level requests on mount
		//   or when requesting a new language; in thas case, it's the section-level
		//   component who should make a block sectionr request for initialization.
		watch( fragmentPreview, ( newPreview ) => {
			if ( newPreview.isBlank ) {
				retryPreview();
			}
		}, { deep: false, immediate: false } );

		// Fragment error render information for the preview
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
		 */
		function retryPreview() {
			emit( 'retry' );
		}

		// Highlight fragments
		// ====================
		const contentRef = ref( null );
		const errorRef = ref( null );

		const { initReferences } = useInitReferences( contentRef );
		const { initImages } = useInitImages( contentRef );

		const fragmentHighlightRegistry = inject( 'fragmentHighlightRegistry', null );

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

		/**
		 * Update highlight overlay registration after DOM is in sync with preview state.
		 */
		function registerNodesForHighlight() {
			if ( !fragmentHighlightRegistry ) {
				return;
			}
			const preview = fragmentPreview.value;
			if ( preview.isBlank ) {
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
					initImages();
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
			retryPreview,
			fragmentError,
			fragmentPreview,
			contentRef,
			errorRef,
			isMissing,
			missingCanRetry,
			missingLabel,
			setHighlight,
			unsetHighlight,
			iconRetry,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-preview-fragment {
	display: unset;

	.ext-wikilambda-app-abstract-preview-fragment-blank-wrapper {
		display: inline-block;
	}

	.ext-wikilambda-app-abstract-preview-fragment-blank {
		display: inline-block;
		background-color: @background-color-neutral;
		border: @border-width-base @border-style-base @border-color-muted;
		border-radius: @border-radius-base;
		margin-right: @spacing-25;
		margin-bottom: @spacing-25;
		font-family: @font-family-base;
		font-weight: @font-weight-normal;
		font-size: @font-size-small;
		line-height: @line-height-x-small;
		color: @color-subtle;
		vertical-align: middle;
		padding: @spacing-12 @spacing-35;
	}

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
