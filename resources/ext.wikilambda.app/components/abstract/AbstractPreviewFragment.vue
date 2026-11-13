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
		@pointerenter="onPointerEnter"
		@pointerleave="unsetHighlight"
		@focusin="onFocusIn"
		@focusout="onFocusOut"
		@click="onClick"
	>
		<!-- Missing, loading or failed -->
		<wl-abstract-fragment-status
			v-if="status !== 'html'"
			ref="statusRef"
			:key-path="keyPath"
			:fragment-hash="fragmentHash"
			@retry="retryPreview"
		></wl-abstract-fragment-status>
		<!-- eslint-disable vue/no-v-html -->
		<div
			v-else
			ref="contentRef"
			class="ext-wikilambda-app-abstract-preview-fragment-html"
			v-html="fragmentPreview.html"
		></div>
		<!-- eslint-enable vue/no-v-html -->

		<!-- Provenance popover, opened from the fragment menu (T441583) -->
		<wl-abstract-preview-provenance
			v-if="!hideProvenance && isProvenanceOpen && provenanceAnchor"
			:open="isProvenanceOpen"
			:anchor="provenanceAnchor"
			:fragment-preview="fragmentPreview"
			:fresh-request="freshRequest"
			@update:open="onProvenanceOpenUpdate"
			@request-fresh="$emit( 'request-fresh' )"
		></wl-abstract-preview-provenance>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onUnmounted, ref, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useFragmentPreview = require( '../../composables/useFragmentPreview.js' );
const useFragmentProvenance = require( '../../composables/useFragmentProvenance.js' );
const useFragmentSelection = require( '../../composables/useFragmentSelection.js' );
const useInitReferences = require( '../../composables/useInitReferences.js' );
const useInitImages = require( '../../composables/useInitImages.js' );
const useVisibleTimeout = require( '../../composables/useVisibleTimeout.js' );
const useMainStore = require( '../../store/index.js' );

// Abstract components
const AbstractFragmentStatus = require( './AbstractFragmentStatus.vue' );
const AbstractPreviewProvenance = require( './AbstractPreviewProvenance.vue' );

// Time (ms) between retries of a fragment that failed because the rendering service is busy
const UNAVAILABLE_FRAGMENT_RETRY_DELAY = Constants.UNAVAILABLE_FRAGMENT_RETRY_MINUTES * 60 * 1000;

module.exports = exports = defineComponent( {
	name: 'wl-abstract-preview-fragment',
	components: {
		'wl-abstract-fragment-status': AbstractFragmentStatus,
		'wl-abstract-preview-provenance': AbstractPreviewProvenance
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
		},
		/**
		 * Whether this fragment hides the provenance popover. When the columns
		 * are stacked, the generated text under the fragment shows it.
		 */
		hideProvenance: {
			type: Boolean,
			default: false
		}
	},
	emits: [ 'retry', 'request-fresh' ],
	setup( props, { emit } ) {
		const store = useMainStore();

		// Fragment Preview Status
		// =======================

		const { status, fragmentPreview } = useFragmentPreview( () => props.keyPath, () => props.fragmentHash );

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
		const statusRef = ref( null );

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
		 * Select the fragment on a click on its text. A click on a link or a
		 * button, such as a reference marker, does the action of that control only.
		 *
		 * @param {MouseEvent} event
		 */
		function onClick( event ) {
			if ( event.target.closest( 'a, button' ) ) {
				return;
			}
			selectFragment();
		}

		/**
		 * Highlight the fragment when a mouse or a pen moves over it. A touch
		 * screen has no hover: a tap also sends this event, but must not highlight.
		 *
		 * @param {PointerEvent} event
		 */
		function onPointerEnter( event ) {
			if ( event.pointerType === 'touch' ) {
				return;
			}
			setHighlight();
		}

		/**
		 * Highlight the fragment and select it when the keyboard moves the
		 * focus into it, so that the definition follows the focus. A click or a
		 * tap on a link or a button also moves the focus, but does not do this.
		 *
		 * @param {FocusEvent} event
		 */
		function onFocusIn( event ) {
			if ( !isFocusVisible( event.target ) ) {
				return;
			}
			setHighlight();
			selectFragment();
		}

		/**
		 * Returns whether the browser shows the focus of the element, as it
		 * does for the keyboard. A browser without :focus-visible shows it.
		 *
		 * @param {HTMLElement} element
		 * @return {boolean}
		 */
		function isFocusVisible( element ) {
			try {
				return element.matches( ':focus-visible' );
			} catch ( error ) {
				return true;
			}
		}

		/**
		 * Remove the highlight when the focus leaves the fragment. Keep it while
		 * the mouse is on the fragment, e.g. when a reference popover takes the focus.
		 */
		function onFocusOut() {
			if ( rootRef.value && rootRef.value.matches( ':hover' ) ) {
				return;
			}
			unsetHighlight();
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
			if ( status.value === 'error' && statusRef.value ) {
				fragmentHighlightRegistry.registerFragmentNodes( props.keyPath, [ statusRef.value.$el ] );
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

		const {
			isProvenanceOpen,
			freshRequest,
			onProvenanceOpenUpdate
		} = useFragmentProvenance( () => props.keyPath, () => props.fragmentHash );

		/**
		 * Returns the element that the provenance popover points at. The fragment's
		 * root is inline, so that text fragments flow as running text. An inline
		 * element around a block or a float, such as an infobox or an image, has no
		 * width of its own, so point at the first element inside it that has one.
		 *
		 * @return {HTMLElement|null}
		 */
		function findProvenanceAnchor() {
			const root = rootRef.value;
			if ( !root || root.getBoundingClientRect().width > 0 ) {
				return root;
			}
			return Array.from( root.querySelectorAll( '*' ) )
				.find( ( element ) => element.getBoundingClientRect().width > 0 ) || root;
		}

		// Find the anchor after the page shows the fragment, and again when its
		// generated text changes, e.g. after "Run with latest data", which replaces
		// the element that the popover pointed at.
		const provenanceAnchor = ref( null );
		watch(
			[ isProvenanceOpen, rootRef, () => fragmentPreview.value.html ],
			() => {
				provenanceAnchor.value = isProvenanceOpen.value ? findProvenanceAnchor() : null;
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
			fragmentPreview,
			freshRequest,
			contentRef,
			isProvenanceOpen,
			isSelected,
			onClick,
			onFocusIn,
			onFocusOut,
			onPointerEnter,
			onProvenanceOpenUpdate,
			provenanceAnchor,
			rootRef,
			status,
			statusRef,
			unsetHighlight
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-preview-fragment {
	display: unset;

	.ext-wikilambda-app-abstract-preview-fragment-html {
		display: unset;
	}
}
</style>
