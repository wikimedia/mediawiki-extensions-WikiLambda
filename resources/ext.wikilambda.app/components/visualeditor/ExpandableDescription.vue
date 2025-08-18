<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-expandable-description">
		<span
			ref="descriptionRef"
			class="ext-wikilambda-app-expandable-description__text"
			:class="{ 'ext-wikilambda-app-expandable-description__text--expanded': isExpanded }"
			:lang="description.langCode"
			:dir="description.langDir"
		>
			{{ description.label }}
		</span>
		<button
			v-if="isExpandable"
			type="button"
			class="ext-wikilambda-app-expandable-description__toggle-button"
			@click.stop="toggleExpanded"
		>
			{{ isExpanded ?
				$i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-read-less-description' ) :
				$i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-read-more-description' ) }}
		</button>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { throttle } = require( '../../utils/miscUtils.js' );
const LabelData = require( '../../store/classes/LabelData.js' );

module.exports = exports = defineComponent( {
	name: 'wl-expandable-description',
	props: {
		description: {
			type: LabelData,
			required: true
		}
	},
	data: function () {
		return {
			isExpanded: false,
			isExpandable: false,
			throttledResizeHandler: null
		};
	},
	methods: {
		/**
		 * Checks if the description is clamped and updates `isExpandable`.
		 */
		checkClamped: function () {
			const element = this.$refs.descriptionRef;
			this.isExpandable = element && element.scrollHeight > element.clientHeight;
		},
		/**
		 * Toggles the expanded state of the description.
		 */
		toggleExpanded: function () {
			this.isExpanded = !this.isExpanded;
		}
	},
	watch: {
		/**
		 * Re-checks clamping when the description changes.
		 * This is needed because on mounted the scrollHeight and clientHeight might be 0
		 */
		description: function () {
			this.checkClamped();
		}
	},
	/**
	 * Sets up resize handling and checks clamping on mount.
	 */
	mounted: function () {
		// Use a small delay to ensure the DOM is fully rendered
		setTimeout( () => {
			this.checkClamped();
		}, 10 );
		this.throttledResizeHandler = throttle( this.checkClamped, 200 );
		window.addEventListener( 'resize', this.throttledResizeHandler );
	},
	/**
	 * Cleans up resize handling before unmounting.
	 */
	beforeUnmount: function () {
		window.removeEventListener( 'resize', this.throttledResizeHandler );
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ext-wikilambda-app-expandable-description {
	position: relative;

	&__toggle-button {
		.cdx-mixin-link();
		background: var( --background-color-base );
		border: 0;
		padding: 0;
		position: absolute;
		right: 0;
		bottom: 0;
		line-height: var( --line-height-current );
		font-size: inherit;

		&::before {
			content: '';
			position: absolute;
			top: 0;
			left: -80px;
			width: 80px;
			height: 100%;
			background: linear-gradient( to right, transparent, var( --background-color-base ) );
		}
	}

	&__text {
		margin: 0;
		padding: 0;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		display: -webkit-box;
		line-height: var( --line-height-current );

		&--expanded {
			-webkit-line-clamp: unset;
			display: block;

			& + .ext-wikilambda-app-expandable-description__toggle-button {
				display: flex;
				margin-left: auto;
				position: initial;
			}
		}
	}
}
</style>
