<!--
	WikiLambda Vue component for the Abstract Content preview highlight overlay.

	The overlay renders geometry-based highlight rectangles over the preview
	fragments whose keyPath matches the currently highlighted fragment in the
	store. It does not alter the layout or display of the preview HTML.
-->
<template>
	<div
		class="ext-wikilambda-app-abstract-preview__highlight-layer"
		aria-hidden="true"
	>
		<div
			v-for="( rect, index ) in rects"
			:key="index"
			class="ext-wikilambda-app-abstract-preview__highlight-layer-rect"
			:style="{
				top: rect.top,
				left: rect.left,
				width: rect.width,
				height: rect.height
			}"
		></div>
	</div>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const useFragmentHighlightRects = require( '../../composables/useFragmentHighlightRects.js' );
const useMainStore = require( '../../store/index.js' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-preview-highlight-layer',
	setup() {
		const store = useMainStore();
		const registry = inject( 'fragmentHighlightRegistry', null );
		const containerRef = inject( 'previewBodyRef', null );

		const highlightedKeyPath = computed( () => store.getHighlightedFragment );

		function getFragmentNodes( keyPath ) {
			if ( !registry || !registry.getFragmentNodes ) {
				return null;
			}
			return registry.getFragmentNodes( keyPath );
		}

		const { rects } = useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		);

		return {
			rects
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-preview__highlight-layer {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	pointer-events: none;
	z-index: 1;
}

.ext-wikilambda-app-abstract-preview__highlight-layer-rect {
	position: absolute;
	// TODO (T417770): Use the correct background color for the highlight layer from the design system
	// These values come from the overlay that Visual Editor uses and is hardcoded in their codebase
	background: rgba( 109, 169, 247, 0.15 ); // #6da9f7
	box-shadow: inset 0 0 0 1px rgba( 76, 118, 172, 0.15 ); // #4c76ac
}
</style>
