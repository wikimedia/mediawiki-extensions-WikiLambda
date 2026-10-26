<!--
	WikiLambda Vue component for the Abstract Content fragment preview.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		ref="rootRef"
		class="ext-wikilambda-app-abstract-preview-fragment"
		:aria-current="isSelected ? 'true' : undefined"
		@pointerenter="setHighlight"
		@pointerleave="unsetHighlight"
		@focusin="onFocusIn"
		@focusout="unsetHighlight"
		@click="selectFragment"
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

		<!-- Fragment is loading (promise in flight). A fragment that waits for a busy
		rendering service keeps its notice while it loads, so that the layout does not move. -->
		<cdx-progress-indicator
			v-else-if="fragmentPreview.isLoading && !fragmentPreview.isUnavailable"
			class="ext-wikilambda-app-abstract-preview-fragment-loading"
		>
			{{ i18n( 'wikilambda-loading' ).text() }}
		</cdx-progress-indicator>

		<!-- Fragment is available (error or success) -->
		<template v-else>
			<div
				v-if="fragmentPreview.hasError && fragmentError"
				ref="errorRef"
				class="ext-wikilambda-app-abstract-preview-fragment-error-wrapper"
			>
				<cdx-message
					class="ext-wikilambda-app-abstract-preview-fragment-error"
					:type="fragmentError.type"
				>
					<wl-safe-message :error="fragmentError.message"></wl-safe-message>
					<button
						v-if="fragmentError.retry"
						class="ext-wikilambda-app-button-reset
							ext-wikilambda-app-abstract-preview-fragment-retry"
						@click="retryPreview"
					>
						{{ i18n( 'wikilambda-abstract-preview-fragment-retry' ).text() }}
					</button>
					<div v-if="fragmentError.replicateLink">
						<a
							:href="fragmentError.replicateLink"
							target="_blank"
							class="ext-wikilambda-app-abstract-preview-fragment-replicate"
						>
							{{ i18n( 'wikilambda-abstract-preview-fragment-replicate' ).text() }}
						</a>
					</div>
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

		<!-- Provenance popover, opened from the fragment menu (T441583) -->
		<wl-abstract-preview-provenance
			v-if="isProvenanceOpen"
			:open="isProvenanceOpen"
			:anchor="rootRef"
			:fragment-preview="fragmentPreview"
			@update:open="onProvenanceOpenUpdate"
		></wl-abstract-preview-provenance>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onUnmounted, ref, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useFragmentSelection = require( '../../composables/useFragmentSelection.js' );
const useInitReferences = require( '../../composables/useInitReferences.js' );
const useInitImages = require( '../../composables/useInitImages.js' );
const useVisibleTimeout = require( '../../composables/useVisibleTimeout.js' );
const useMainStore = require( '../../store/index.js' );
const ErrorData = require( '../../store/classes/ErrorData.js' );
const icons = require( '../../../lib/icons.json' );

// Abstract components
const AbstractPreviewProvenance = require( './AbstractPreviewProvenance.vue' );
// Base components
const SafeMessage = require( '../base/SafeMessage.vue' );
// Codex components
const { CdxMessage, CdxIcon, CdxProgressIndicator } = require( '../../../codex.js' );

// Time (ms) between retries of a fragment that failed because the rendering service is busy
const UNAVAILABLE_FRAGMENT_RETRY_DELAY = Constants.UNAVAILABLE_FRAGMENT_RETRY_MINUTES * 60 * 1000;

module.exports = exports = defineComponent( {
	name: 'wl-abstract-preview-fragment',
	components: {
		'wl-abstract-preview-provenance': AbstractPreviewProvenance,
		'wl-safe-message': SafeMessage,
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
		// A fragment without a hash is new, and it has no content to render yet:
		// it shows the missing state. A move of fragments can give this position
		// such a fragment, and its render would only fail.
		watch( fragmentPreview, ( newPreview ) => {
			if ( newPreview.isBlank && props.fragmentHash ) {
				retryPreview();
			}
		}, { deep: false, immediate: false } );

		// Retry a fragment that waits for a busy rendering service
		// =========================================================
		// The fragment shows a notice. Request it again after the delay that the notice
		// states, but not while a request for it runs, nor while the page is hidden.
		const isWaitingForRetry = computed( () => (
			!!fragmentPreview.value.isUnavailable && !fragmentPreview.value.isLoading
		) );

		const { start: startRetryTimeout, stop: stopRetryTimeout } = useVisibleTimeout(
			retryWhileWaiting,
			UNAVAILABLE_FRAGMENT_RETRY_DELAY
		);

		/**
		 * Requests the fragment again. If the store starts no request for it (e.g. a
		 * section request already gets this fragment), tries again after the delay.
		 */
		function retryWhileWaiting() {
			retryPreview();
			if ( isWaitingForRetry.value ) {
				startRetryTimeout();
			}
		}

		// Start the delay when the fragment waits, and again when the fragment changes
		// (e.g. it moves or is edited). Stop it when the fragment does not wait any more.
		watch( [ isWaitingForRetry, () => props.fragmentHash ], ( [ isWaiting ] ) => {
			if ( isWaiting ) {
				startRetryTimeout();
			} else {
				stopRetryTimeout();
			}
		}, { immediate: true } );

		// Fragment error render information for the preview
		const fragmentError = computed( () => {
			if ( !fragmentPreview.value.hasError ) {
				return null;
			}
			const error = fragmentPreview.value.error;

			// Build best error message, in order of preference
			// 1. parseable error message obtained from Z50K3 and the error arguments
			// 2. if not available, use the error.code with error.params, or else the error type label, as parameter
			// 3. if not available, fall back to error.text
			let errorData;
			const parsedMessage = store.getHtmlErrorMessage( error.zid, error.zerror );
			if ( parsedMessage ) {
				errorData = ErrorData.buildErrorData( { errorMessage: parsedMessage } );
			} else if ( error.code ) {
				errorData = ErrorData.buildErrorData( {
					errorMessageKey: error.code,
					errorParams: error.params || [ store.getLabelData( error.zid ).label ]
				} );
			} else {
				errorData = ErrorData.buildErrorData( { errorMessage: error.text } );
			}

			return Object.assign( {}, error, {
				type: error.type || Constants.ERROR_TYPES.ERROR,
				message: errorData,
				// A busy service is not a problem with the fragment: no link to run it there
				replicateLink: fragmentPreview.value.isUnavailable ? null : store.getFunctionCallLink( props.keyPath )
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
		const rootRef = ref( null );
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

		// Fragment selection
		// ==================

		const { isSelected, selectFragment } = useFragmentSelection(
			() => props.keyPath,
			rootRef
		);

		/**
		 * Highlight the fragment and select it when the keyboard moves the
		 * focus into it, so that the definition follows the focus.
		 */
		function onFocusIn() {
			setHighlight();
			selectFragment();
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

		// Provenance popover
		// ==================

		const isProvenanceOpen = computed( () => store.getProvenanceFragment === props.keyPath );

		/**
		 * Close the provenance popover when Codex asks to, e.g. on a click
		 * outside it, the Escape key, or its close button.
		 *
		 * @param {boolean} open
		 */
		function onProvenanceOpenUpdate( open ) {
			if ( !open ) {
				store.setProvenanceFragment( undefined );
			}
		}

		// The popover describes one render of the fragment: when the fragment
		// changes, the render it described is gone, so close the popover.
		watch( () => props.fragmentHash, () => {
			if ( isProvenanceOpen.value ) {
				store.setProvenanceFragment( undefined );
			}
		} );

		// On unmount, remove highlight state
		onUnmounted( () => {
			unsetHighlight();
			if ( fragmentHighlightRegistry ) {
				fragmentHighlightRegistry.unregisterFragmentNodes( props.keyPath );
			}
			// A fragment that goes away must not keep its popover open
			if ( isProvenanceOpen.value ) {
				store.setProvenanceFragment( undefined );
			}
		} );

		return {
			retryPreview,
			fragmentError,
			fragmentPreview,
			contentRef,
			errorRef,
			isMissing,
			isProvenanceOpen,
			isSelected,
			missingCanRetry,
			missingLabel,
			onFocusIn,
			onProvenanceOpenUpdate,
			rootRef,
			selectFragment,
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
