<!--
	WikiLambda Vue component for the Abstract Content preview (single language block).

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-app-abstract-preview">
		<template #header>
			{{ i18n( 'wikilambda-abstract-preview-in-language' ).text() }}
		</template>
		<template #header-action>
			<wl-z-object-selector
				class="ext-wikilambda-app-abstract-preview__language-selector"
				:selected-zid="previewLanguageZid"
				:exclude-zids="excludedLanguageZids"
				:type="naturalLanguageType"
				@select-item="onPreviewLanguageSelect"
			></wl-z-object-selector>
		</template>
		<template #main>
			<!-- The scroller gets its own scrollbar, so it needs the keyboard
			focus and an accessible name. The body inside it must stay at its
			full height, because the highlight overlay is positioned in it. -->
			<div
				class="ext-wikilambda-app-abstract-preview__scroller"
				role="group"
				tabindex="0"
				:aria-label="i18n( 'wikilambda-abstract-preview-in-language' ).text()"
			>
				<div
					ref="bodyRef"
					class="ext-wikilambda-app-abstract-preview__body"
					:lang="previewLanguageLabelData.langCode"
					:dir="previewLanguageLabelData.langDir"
				>
					<wl-abstract-preview-section
						v-for="section in sections"
						:key="`${section.index}-${section.qid}-${previewLanguageZid}`"
						:section="section"
						:language="previewLanguageZid"
						class="ext-wikilambda-app-abstract-preview__section"
					></wl-abstract-preview-section>
					<wl-abstract-preview-highlight-layer></wl-abstract-preview-highlight-layer>
				</div>
			</div>
		</template>
	</wl-widget-base>
</template>

<script>
const { computed, defineComponent, inject, provide, ref, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useFragmentHighlightRegistry = require( '../../composables/useFragmentHighlightRegistry.js' );
const useMainStore = require( '../../store/index.js' );

// Abstract components
const AbstractPreviewSection = require( './AbstractPreviewSection.vue' );
const AbstractPreviewHighlightLayer = require( './AbstractPreviewHighlightLayer.vue' );
// Base components
const WidgetBase = require( '../base/WidgetBase.vue' );
const ZObjectSelector = require( '../base/ZObjectSelector.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-preview',
	components: {
		'wl-widget-base': WidgetBase,
		'wl-abstract-preview-section': AbstractPreviewSection,
		'wl-abstract-preview-highlight-layer': AbstractPreviewHighlightLayer,
		'wl-z-object-selector': ZObjectSelector
	},
	setup() {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const bodyRef = ref( null );
		const fragmentHighlightRegistry = useFragmentHighlightRegistry();

		provide( 'fragmentHighlightRegistry', fragmentHighlightRegistry );
		provide( 'previewBodyRef', bodyRef );

		/**
		 * @return {Array}
		 */
		const sections = computed( () => store.getAbstractContentSections );

		// Preview language
		/**
		 * @return {string}
		 */
		const previewLanguageZid = computed( () => store.getPreviewLanguageZid );

		/**
		 * @return {LabelData}
		 */
		const previewLanguageLabelData = computed( () => store.getLabelDataForLangCode( previewLanguageZid.value ) );
		/**
		 * Exclude the currently selected preview language from the selector.
		 *
		 * @return {Array<string>}
		 */
		const excludedLanguageZids = computed( () => [ store.getPreviewLanguageZid ] );

		/**
		 * Handle the selection of a new preview language.
		 *
		 * @param {string} zid
		 */
		function onPreviewLanguageSelect( zid ) {
			store.setPreviewLanguageZid( zid );
		}

		// Ensure the topic item's label is available in the selected preview language:
		// item labels are otherwise only ever fetched in the interface language, so the
		// lede title would keep showing that language regardless of the preview language
		// picked here.
		watch( previewLanguageZid, ( languageZid ) => {
			store.fetchItemLabelInLanguage( {
				id: store.getAbstractWikiId,
				langCode: store.getLanguageIsoCodeOfZLang( languageZid )
			} );
		}, { immediate: false } );

		return {
			i18n,
			excludedLanguageZids,
			naturalLanguageType: Constants.Z_NATURAL_LANGUAGE,
			previewLanguageZid,
			previewLanguageLabelData,
			sections,
			bodyRef,
			onPreviewLanguageSelect
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-preview {
	position: sticky;
	top: @spacing-50;
	// The preview must not be taller than the screen. A taller preview sticks
	// at the top offset, and then its bottom part stays below the screen for
	// as long as the preview is sticky. The user cannot read it. To prevent
	// this, keep the preview inside the screen and let the scroller inside it
	// move its own content. See T429214.
	display: flex;
	flex-direction: column;
	// The widget has a border and padding, and MediaWiki has no global
	// `border-box` rule. Without `box-sizing`, the maximum height applies to
	// the content box only, and the widget gets taller than the screen again.
	box-sizing: border-box;
	max-height: calc( 100vh - @spacing-100 );

	// Let the scroller use all the height that the header does not use.
	// `min-height: 0` is necessary, or the flex items refuse to get smaller
	// than their content and the scroller never gets a scrollbar.
	.ext-wikilambda-app-widget-base__main {
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.ext-wikilambda-app-abstract-preview__scroller {
		min-height: 0;
		// The scroller goes to the border of the widget. The scrollbar then
		// stays in the padding of the widget, and does not cover the text or
		// the reload button. The padding keeps the content in its position.
		margin-right: -@spacing-75;
		padding-right: @spacing-75;
		// This also makes a block formatting context, which keeps the floats
		// in the generated text inside the preview.
		overflow-y: auto;
	}

	// The grid stacks the two columns below the desktop breakpoint. The
	// preview is then a full-width block below the content, so it must scroll
	// with the page and must not have a scrollbar of its own.
	@media screen and ( max-width: @max-width-breakpoint-tablet ) {
		position: static;
		top: 0;
		// Clear the float after the preview
		display: flow-root;
		max-height: none;

		.ext-wikilambda-app-widget-base__main {
			display: block;
		}

		.ext-wikilambda-app-abstract-preview__scroller {
			margin-right: 0;
			padding-right: 0;
			overflow-y: visible;
		}
	}

	.ext-wikilambda-app-abstract-preview__body {
		position: relative;
	}
}
</style>
