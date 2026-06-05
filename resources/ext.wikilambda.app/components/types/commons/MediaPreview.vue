<!--
	WikiLambda Vue component that displays a Commons media file thumbnail preview.

	Renders the same <figure class="ext-wikilambda-image"> structure as the PHP image
	renderer, reusing its shared styles from ext.wikilambda.image.less.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<figure
		ref="figureRef"
		class="ext-wikilambda-image ext-wikilambda-app-commons-media-preview"
	>
		<a
			v-if="descriptionUrl"
			:href="descriptionUrl"
			target="_blank"
			rel="noopener noreferrer"
		>
			<img
				:src="url"
				:alt="title"
				:width="thumbWidth"
				:height="thumbHeight"
			>
		</a>
		<img
			v-else
			:src="url"
			:alt="title"
			:width="thumbWidth"
			:height="thumbHeight"
		>
		<figcaption class="ext-wikilambda-app-commons-media-preview__title">
			{{ title }}
		</figcaption>
	</figure>
</template>

<script>
const { defineComponent, nextTick, ref, watch } = require( 'vue' );

const useInitImages = require( '../../../composables/useInitImages.js' );

module.exports = exports = defineComponent( {
	name: 'wl-commons-media-preview',
	props: {
		url: {
			type: String,
			required: true
		},
		title: {
			type: String,
			required: true
		},
		descriptionUrl: {
			type: String,
			default: null
		},
		thumbWidth: {
			type: Number,
			default: undefined
		},
		thumbHeight: {
			type: Number,
			default: undefined
		}
	},
	setup( props ) {
		const figureRef = ref( null );
		const { initImages } = useInitImages( figureRef );

		// Bind the broken-image error handler whenever a new src is rendered.
		// The ext.wikilambda.image init.js guards re-binding via data-wl-img-init,
		// so re-firing on every url change is idempotent. Also covers the
		// descriptionUrl toggle, which swaps which <img> sits in the DOM.
		watch( () => [ props.url, props.descriptionUrl ], () => {
			nextTick( () => initImages() );
		}, { immediate: true } );

		return {
			figureRef
		};
	}
} );
</script>
