<!--
	WikiLambda Vue component for the Abstract Content fragment preview.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-abstract-preview-fragment"
		:class="{ 'ext-wikilambda-app-abstract-preview-fragment__highlight': isHighlighted }"
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
			<cdx-message
				v-if="fragmentPreview.error"
				class="ext-wikilambda-app-abstract-preview-fragment-error"
				type="error"
			>
				{{ fragmentPreview.html }}
			</cdx-message>
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
const { computed, defineComponent, inject, onMounted, onUnmounted, watch } = require( 'vue' );

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

		// Date for today in dd-mm-yyyy format
		const dateForToday = computed( () => {
			const today = new Date();
			const d = today.getDate();
			const m = today.getMonth() + 1;
			const yyyy = today.getFullYear();
			return `${ d }-${ m }-${ yyyy }`;
		} );

		const { contentRef, initReferences } = useInitReferences();
		const fragmentPreview = computed( () => store.getFragmentPreview( props.keyPath ) );
		const fragmentDirty = computed( () => fragmentPreview.value && fragmentPreview.value.isDirty );

		// Highlight state for fragment and preview
		const isHighlighted = computed( () => store.getHighlightedFragment === props.keyPath );

		/**
		 * Renders the preview of the given fragment for the
		 * current preview language: qid, language and today's date
		 */
		function renderPreview() {
			store.renderFragmentPreview( {
				keyPath: props.keyPath,
				fragment: props.fragment,
				qid: store.getAbstractWikiId,
				date: dateForToday.value,
				language: store.getPreviewLanguageZid
			} );
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

		// Watch when fragment preview is set to dirty and rerender
		watch( fragmentDirty, ( isDirty ) => {
			if ( isDirty ) {
				renderPreview();
			}
		} );

		// Watch when fragment preview is unset and rerender
		watch( fragmentPreview, ( preview ) => {
			if ( !preview ) {
				renderPreview();
			}
		}, { immediate: true } );

		// Watch when fragment HTML is ready – init references (store mutates in place, so watch the property)
		watch( () => fragmentPreview.value && fragmentPreview.value.html, ( html ) => {
			if ( html ) {
				initReferences();
			}
		}, { immediate: true } );

		// On mount, render preview
		onMounted( () => {
			renderPreview();
		} );

		// On unmount, remove highlight state
		onUnmounted( () => {
			unsetHighlight();
		} );

		return {
			fragmentPreview,
			contentRef,
			isHighlighted,
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
	transition: background-color @transition-duration-base @transition-timing-function-system;

	&.ext-wikilambda-app-abstract-preview-fragment__highlight {
		background-color: @background-color-progressive-subtle--hover;
	}

	.ext-wikilambda-app-abstract-preview-fragment-loading {
		margin: 0 @spacing-25;
	}

	.ext-wikilambda-app-abstract-preview-fragment-error {
		margin: @spacing-25 0;
	}

	.ext-wikilambda-app-abstract-preview-fragment-html {
		display: unset;
	}
}
</style>
