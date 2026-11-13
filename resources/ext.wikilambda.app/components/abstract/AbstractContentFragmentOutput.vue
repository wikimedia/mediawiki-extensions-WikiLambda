<!--
	WikiLambda Vue component for the generated text under an Abstract Content
	fragment, on screens where the generated text column is not next to it.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div ref="rootRef" class="ext-wikilambda-app-abstract-content-fragment-output">
		<!-- Missing, loading or failed -->
		<wl-abstract-fragment-status
			v-if="status !== 'html'"
			:key-path="keyPath"
			:fragment-hash="fragmentHash"
			@retry="retryPreview"
		></wl-abstract-fragment-status>

		<div
			v-else-if="fragmentPreview.html"
			class="ext-wikilambda-app-abstract-content-fragment-output-box"
			:class="{ 'ext-wikilambda-app-abstract-content-fragment-output-box--selected': selected }"
		>
			<!-- A long output shows its first lines only, so that one fragment
			does not push the other fragments off the screen. A link in the
			hidden lines can take the focus, so the focus in the text shows all
			lines. -->
			<div
				class="ext-wikilambda-app-abstract-content-fragment-output-clip"
				:class="{
					'ext-wikilambda-app-abstract-content-fragment-output-clip--collapsed': !isExpanded,
					'ext-wikilambda-app-abstract-content-fragment-output-clip--truncated': isTruncated
				}"
				@focusin="isExpanded = true"
			>
				<!-- eslint-disable vue/no-v-html -->
				<div
					ref="contentRef"
					class="ext-wikilambda-app-abstract-content-fragment-output-html"
					tabindex="-1"
					v-html="fragmentPreview.html"
				></div>
				<!-- eslint-enable vue/no-v-html -->
			</div>
			<button
				v-if="isTruncated"
				type="button"
				class="ext-wikilambda-app-button-reset
					ext-wikilambda-app-abstract-content-fragment-output-show-more"
				@click="showMore"
			>
				{{ i18n( 'wikilambda-abstract-fragment-output-show-more' ).text() }}
			</button>
		</div>

		<!-- Provenance popover, opened from the fragment menu (T441583) -->
		<wl-abstract-preview-provenance
			v-if="isProvenanceOpen && rootRef"
			:open="isProvenanceOpen"
			:anchor="rootRef"
			:fragment-preview="fragmentPreview"
			:fresh-request="freshRequest"
			@update:open="onProvenanceOpenUpdate"
			@request-fresh="requestFreshPreview"
		></wl-abstract-preview-provenance>
	</div>
</template>

<script>
const { computed, defineComponent, inject, nextTick, onUnmounted, ref, watch } = require( 'vue' );

const useFragmentPreview = require( '../../composables/useFragmentPreview.js' );
const useFragmentProvenance = require( '../../composables/useFragmentProvenance.js' );
const useInitImages = require( '../../composables/useInitImages.js' );
const useInitReferences = require( '../../composables/useInitReferences.js' );
const useMainStore = require( '../../store/index.js' );

// Abstract components
const AbstractFragmentStatus = require( './AbstractFragmentStatus.vue' );
const AbstractPreviewProvenance = require( './AbstractPreviewProvenance.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-content-fragment-output',
	components: {
		'wl-abstract-fragment-status': AbstractFragmentStatus,
		'wl-abstract-preview-provenance': AbstractPreviewProvenance
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		fragment: {
			type: Object,
			required: true
		},
		fragmentHash: {
			type: String,
			required: false,
			default: null
		},
		selected: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	setup( props ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const { status, fragmentPreview } = useFragmentPreview(
			() => props.keyPath,
			() => props.fragmentHash
		);

		/**
		 * Returns the request to render this fragment in the preview language
		 *
		 * @return {Object}
		 */
		function getRenderPayload() {
			return {
				qid: store.getAbstractWikiId,
				fragment: props.fragment,
				fragmentHash: props.fragmentHash,
				language: store.getPreviewLanguageZid
			};
		}

		/**
		 * Render the fragment again. A fragment without a hash is new, and has
		 * no content to render yet.
		 */
		function retryPreview() {
			if ( !props.fragmentHash ) {
				return;
			}
			store.renderFragmentPreview( getRenderPayload() );
		}

		// Provenance popover
		// ==================

		const rootRef = ref( null );
		const {
			isProvenanceOpen,
			freshRequest,
			onProvenanceOpenUpdate
		} = useFragmentProvenance( () => props.keyPath, () => props.fragmentHash );

		/**
		 * Render the fragment again with the latest data, when the user asks
		 * for it in the provenance popover (T441584)
		 */
		function requestFreshPreview() {
			store.requestFreshFragmentPreview( getRenderPayload() );
		}

		// Generated text
		// ==============

		const contentRef = ref( null );
		const { initReferences } = useInitReferences( contentRef );
		const { initImages } = useInitImages( contentRef );

		const isExpanded = ref( false );
		const contentHeight = ref( 0 );
		const clipHeight = ref( 0 );

		// The output is longer than the collapsed box
		const isTruncated = computed( () => !isExpanded.value && contentHeight.value > clipHeight.value );

		/**
		 * Show all lines. The button goes away, so the focus goes to the text.
		 */
		function showMore() {
			isExpanded.value = true;
			nextTick( () => {
				if ( contentRef.value ) {
					contentRef.value.focus();
				}
			} );
		}

		/**
		 * Measure the generated text and the box that clips it.
		 */
		function measure() {
			const content = contentRef.value;
			contentHeight.value = content ? content.offsetHeight : 0;
			clipHeight.value = content ? content.parentElement.clientHeight : 0;
		}

		// The generated text changes its height when its images load, or when
		// the screen changes its width
		let resizeObserver = null;
		watch( contentRef, ( content ) => {
			if ( resizeObserver ) {
				resizeObserver.disconnect();
				resizeObserver = null;
			}
			if ( content && typeof ResizeObserver === 'function' ) {
				resizeObserver = new ResizeObserver( measure );
				resizeObserver.observe( content );
			}
		} );

		// The box shows when the generated text is ready, and the generated text
		// can change while the box shows
		watch( [ contentRef, () => fragmentPreview.value.html ], ( [ content ] ) => {
			if ( content ) {
				initReferences();
				initImages();
			}
			measure();
		}, { flush: 'post' } );

		onUnmounted( () => {
			if ( resizeObserver ) {
				resizeObserver.disconnect();
			}
		} );

		return {
			contentRef,
			fragmentPreview,
			freshRequest,
			i18n,
			isExpanded,
			showMore,
			isProvenanceOpen,
			isTruncated,
			onProvenanceOpenUpdate,
			requestFreshPreview,
			retryPreview,
			rootRef,
			status
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

// The unit of @line-height-small depends on the skin, so the box sets its own
// line height (22px at 14px) and measures its lines in `em`
@wl-fragment-output-line-height: 1.5714285;
@wl-fragment-output-lines: 3;

.ext-wikilambda-app-abstract-content-fragment-output {
	// Keep the box apart from the next fragment, or the Add content button
	margin: @spacing-12 0 @spacing-50;

	.ext-wikilambda-app-abstract-content-fragment-output-show-more {
		.cdx-mixin-link();
	}

	.ext-wikilambda-app-abstract-content-fragment-output-box {
		padding: @spacing-25 @spacing-50;
		background-color: @background-color-interactive-subtle;
		border: @border-width-base @border-style-base @border-color-muted;
		border-radius: @border-radius-base;
		font-size: @font-size-small;
		line-height: @wl-fragment-output-line-height;
	}

	// The box stays white on the colored background of a selected fragment
	.ext-wikilambda-app-abstract-content-fragment-output-box--selected {
		background-color: @background-color-base;
		border-color: @border-color-subtle;
	}

	.ext-wikilambda-app-abstract-content-fragment-output-clip--collapsed {
		max-height: ( @wl-fragment-output-lines * @wl-fragment-output-line-height * 1em );
		overflow: hidden;
	}

	// Fade out the last line, to show that the text continues
	.ext-wikilambda-app-abstract-content-fragment-output-clip--truncated {
		@fade-start: ( ( @wl-fragment-output-lines - 1 ) * @wl-fragment-output-line-height * 1em );
		mask-image: linear-gradient( to bottom, @color-base @fade-start, transparent );
	}

	// Keep the floats of the generated text inside the box
	.ext-wikilambda-app-abstract-content-fragment-output-html {
		display: flow-root;

		> :first-child {
			margin-top: 0;
		}

		> :last-child {
			margin-bottom: 0;
		}
	}
}
</style>
