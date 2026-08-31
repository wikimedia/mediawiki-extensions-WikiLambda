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
				v-if="fragmentPreview.hasError && fragmentError"
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
	</div>
</template>

<script>
const { computed, defineComponent, inject, onUnmounted, ref, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useFragmentSelection = require( '../../composables/useFragmentSelection.js' );
const useInitReferences = require( '../../composables/useInitReferences.js' );
const useInitImages = require( '../../composables/useInitImages.js' );
const useMainStore = require( '../../store/index.js' );
const urlUtils = require( '../../utils/urlUtils.js' );
const { hybridToCanonical } = require( '../../utils/schemata.js' );
const { walkAndTransformZObject, createParserCall } = require( '../../utils/zobjectUtils.js' );
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
					error.text,
				replicateLink: getFragmentReplicateLink()
			} );
		} );

		/**
		 * Creates a link to replicate the fragment function call in
		 * Wikifunctions, shown when rendering a fragment error message.
		 * Returns null when fragment is not available or fragment is not
		 * defined by a simple call to a function reference (no page to
		 * redirect to)
		 *
		 * @return {string|null}
		 */
		function getFragmentReplicateLink() {
			// Get the fragment from the store; we could pass it down the props but
			// we only need it once in the (hopefully) exceptional case of an error.
			let fragment = hybridToCanonical( store.getZObjectByKeyPath( props.keyPath.split( '.' ) ) );
			if ( typeof fragment !== 'object' ) {
				return null;
			}

			// 1. Replace arguments with their literal values
			const isArgReference = ( obj, key ) => (
				( Constants.Z_ARGUMENT_REFERENCE_KEY in obj ) &&
				( obj[ Constants.Z_ARGUMENT_REFERENCE_KEY ] === key )
			);

			// 1.a. Transform Z18(Z825K1) into Z6091(qid)
			fragment = walkAndTransformZObject(
				fragment,
				( node ) => isArgReference( node, Constants.Z_ABSTRACT_RENDER_FUNCTION_QID ),
				() => ( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_WIKIDATA_REFERENCE_ITEM,
					[ Constants.Z_WIKIDATA_REFERENCE_ITEM_ID ]: store.getAbstractWikiId
				} )
			);

			// 1.b. Transform Z18(Z825K2) into Z9(previewlang)
			fragment = walkAndTransformZObject(
				fragment,
				( node ) => isArgReference( node, Constants.Z_ABSTRACT_RENDER_FUNCTION_LANGUAGE ),
				() => store.getPreviewLanguageZid
			);

			// 1.c. Transform Z18(Z825K3) into a date parser call
			const today = new Date().toISOString().slice( 0, 10 );
			fragment = walkAndTransformZObject(
				fragment,
				( node ) => isArgReference( node, Constants.Z_ABSTRACT_RENDER_FUNCTION_DATE ),
				() => createParserCall( {
					parserZid: Constants.Z_DATE_PARSER,
					zobject: today,
					zlang: store.getPreviewLanguageZid
				} )
			);

			// If function call function is a reference, create the link to the
			// function page. Else, return blank string.
			if ( typeof fragment[ Constants.Z_FUNCTION_CALL_FUNCTION ] !== 'string' ) {
				return null;
			}

			return urlUtils.generateViewUrl( {
				langCode: store.getUserLangCode,
				zid: fragment[ Constants.Z_FUNCTION_CALL_FUNCTION ],
				params: { call: JSON.stringify( fragment ) }
			} );
		}

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
			isSelected,
			missingCanRetry,
			missingLabel,
			onFocusIn,
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
