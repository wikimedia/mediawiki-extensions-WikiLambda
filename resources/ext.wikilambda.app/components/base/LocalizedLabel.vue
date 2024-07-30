<!--
	WikiLambda Vue component for Localized Label

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<label>
		<span
			v-if="labelData.langCode && !isUserLang"
			class="ext-wikilambda-lang-chip"
		>{{ labelData.langCode }}</span><span
			:lang="labelData.langCode"
			:dir="labelData.langDir"
		>{{ labelData.label }}</span>
	</label>
</template>

<script>
const { defineComponent } = require( 'vue' );
const LabelData = require( '../../store/classes/LabelData.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = exports = defineComponent( {
	name: 'wl-localized-label',
	props: {
		labelData: {
			type: LabelData,
			required: true
		}
	},
	computed: Object.assign( mapGetters( [
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

.ext-wikilambda-text-toggle-truncate {
	display: flex;
	align-items: center;
	justify-content: end;
	margin-top: @spacing-100;
	color: @color-base;
	font-weight: @font-weight-bold;

	&__icon {
		margin-left: @spacing-50;

		svg {
			width: @size-100;
			height: @size-100;
		}

		&__inverted {
			transform: rotate( 180deg );
		}
	}
}

/* stylelint-disable declaration-property-unit-disallowed-list */
span.ext-wikilambda-lang-chip {
	font-size: 1em;
	font-weight: @font-weight-normal;
	line-height: calc( 22.4px - 2px );
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
</style>
