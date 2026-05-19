<!--
	WikiLambda Vue component that displays a Commons media file thumbnail preview.

	Renders the same <figure class="ext-wikilambda-image"> structure as the PHP image
	renderer, reusing its shared styles from ext.wikilambda.image.less.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<figure class="ext-wikilambda-image ext-wikilambda-app-commons-media-preview">
		<a
			v-if="descriptionUrl"
			:href="descriptionUrl"
			target="_blank"
			rel="noopener noreferrer"
		>
			<cdx-image
				:src="url"
				:alt="title"
				:width="thumbWidth"
				:height="thumbHeight"
			></cdx-image>
		</a>
		<cdx-image
			v-else
			:src="url"
			:alt="title"
			:width="thumbWidth"
			:height="thumbHeight"
		></cdx-image>
		<figcaption class="ext-wikilambda-app-commons-media-preview__title">
			{{ title }}
		</figcaption>
	</figure>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { CdxImage } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-commons-media-preview',
	components: {
		CdxImage
	},
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
	}
} );
</script>
