<!--
	WikiLambda Vue component for the Abstract Content preview.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-app-abstract-preview">
		<template #header>
			<!-- FIXME not sure if we want title -->
			<!-- FIXME if we do, do we want the language? -->
			<!-- FIXME internationalize -->
			Preview in {{ languageLabelData.label }}
		</template>
		<template #header-action>
			<!-- TODO (T411694): Add a select language button,
				or a select language field that we can change? -->
		</template>
		<template #main>
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
		</template>
	</wl-widget-base>
</template>

<script>
const { computed, defineComponent } = require( 'vue' );

const useMainStore = require( '../../store/index.js' );

// Abstract components
const AbstractPreviewFragment = require( './AbstractPreviewFragment.vue' );
// Base components
const WidgetBase = require( '../base/WidgetBase.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-preview',
	components: {
		'wl-widget-base': WidgetBase,
		'wl-abstract-preview-fragment': AbstractPreviewFragment
	},
	props: {},
	setup() {
		const store = useMainStore();

		/**
		 * @return {Array}
		 */
		const sections = computed( () => store.getAbstractContentSections );

		/**
		 * @return {LabelData}
		 */
		const abstractTitle = computed( () => store.getItemLabelData( store.getAbstractWikiId ) );

		/**
		 * @return {LabelData}
		 */
		const languageLabelData = computed( () => store.getLabelData( 'Z1002' ) );

		return {
			abstractTitle,
			languageLabelData,
			sections
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-preview {
	/* something */
}
</style>
