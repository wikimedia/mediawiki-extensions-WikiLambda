<!--
	WikiLambda Vue component for Localized Label

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<label class="ext-wikilambda-app-localized-label" data-testid="localized-label">
		<span
			v-if="labelData.langCode && !isUserLang"
			class="ext-wikilambda-app-localized-label__chip"
		>{{ labelData.langCode }}</span><span
			:lang="labelData.langCode"
			:dir="labelData.langDir"
		>{{ labelData.label }}</span>
	</label>
</template>

<script>
const { defineComponent } = require( 'vue' );
const LabelData = require( '../../store/classes/LabelData.js' ),
	useMainStore = require( '../../store/index.js' ),
	{ mapState } = require( 'pinia' );

module.exports = exports = defineComponent( {
	name: 'wl-localized-label',
	props: {
		labelData: {
			type: LabelData,
			required: true
		}
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getUserLangZid'
	] ), {
		/**
		 * Returns whether the label is in the user preferred language
		 *
		 * @return {boolean}
		 */
		isUserLang: function () {
			return this.getUserLangZid === this.labelData.lang;
		}
	} )
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-localized-label {
	.ext-wikilambda-app-localized-label__chip {
		font-size: 1em;
		font-weight: @font-weight-normal;
		line-height: 1.4;
		color: @color-base;
		border: 1px solid @border-color-base;
		border-radius: @border-radius-pill;
		min-width: 36px;
		padding: 0 5px;
		text-align: center;
		display: inline-block;
		box-sizing: border-box;
		height: 22px;
		min-height: 22px;
		margin-right: @spacing-25;

		&:empty {
			width: 36px;
			height: 22px;
			min-width: 36px;
			border: 1px dashed @border-color-base;
		}

		@media screen and ( max-width: @max-width-breakpoint-mobile ) {
			font-size: 0.875em;
		}
	}
}
</style>
