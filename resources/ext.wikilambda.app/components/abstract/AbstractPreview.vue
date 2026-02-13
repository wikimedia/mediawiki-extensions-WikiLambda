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
			<div
				ref="bodyRef"
				class="ext-wikilambda-app-abstract-preview__body"
			>
				<h1>{{ abstractTitle.label }}</h1>
				<div
					v-for="section in sections"
					:key="`${section.index}-${section.qid}`"
					class="ext-wikilambda-app-abstract-preview__section"
				>
					<h2 v-if="!section.isLede">
						{{ section.labelData.label }}
					</h2>
					<wl-abstract-preview-fragment
						v-for="( fragment, index ) in section.fragments.slice( 1 )"
						:key="`${section.index}-${section.qid}-${index}`"
						:key-path="`${ section.fragmentsPath }.${ index + 1 }`"
						:fragment="fragment"
					></wl-abstract-preview-fragment>
				</div>
				<wl-abstract-preview-highlight-layer></wl-abstract-preview-highlight-layer>
			</div>
		</template>
	</wl-widget-base>
</template>

<script>
const { computed, defineComponent, inject, provide, ref } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useFragmentHighlightRegistry = require( '../../composables/useFragmentHighlightRegistry.js' );
const useMainStore = require( '../../store/index.js' );

// Abstract components
const AbstractPreviewFragment = require( './AbstractPreviewFragment.vue' );
const AbstractPreviewHighlightLayer = require( './AbstractPreviewHighlightLayer.vue' );
// Base components
const WidgetBase = require( '../base/WidgetBase.vue' );
const ZObjectSelector = require( '../base/ZObjectSelector.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-preview',
	components: {
		'wl-widget-base': WidgetBase,
		'wl-abstract-preview-fragment': AbstractPreviewFragment,
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

		/**
		 * @return {LabelData}
		 */
		const abstractTitle = computed( () => store.getItemLabelData( store.getAbstractWikiId ) );

		// Preview language
		/**
		 * @return {string}
		 */
		const previewLanguageZid = computed( () => store.getPreviewLanguageZid );

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

		return {
			i18n,
			abstractTitle,
			excludedLanguageZids,
			naturalLanguageType: Constants.Z_NATURAL_LANGUAGE,
			previewLanguageZid,
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

	@media screen and ( max-width: @max-width-breakpoint-mobile ) {
		position: static;
		top: 0;
	}

	.ext-wikilambda-app-abstract-preview__body {
		position: relative;
	}
}
</style>
