<template>
	<!--
		WikiLambda Vue component for Localized Label

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<label>
		<span
			v-if="!isUserLang"
			class="ext-wikilambda-lang-chip">{{ labelLanguageIso }}</span>
		{{ labelText }}
	</label>
</template>

<script>
var LabelData = require( '../../store/classes/LabelData.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-localized-label',
	props: {
		labelData: {
			type: LabelData,
			required: true
		}
	},
	computed: $.extend(
		mapGetters( [
			'getLabel',
			'getLanguageIsoCodeOfZLang',
			'getUserZlangZID'
		] ),
		{
			/**
			 * Returns the string value of this label
			 *
			 * @return {string}
			 */
			labelText: function () {
				return this.labelData.label;
			},

			/**
			 * Returns the ISO code of the language of this label
			 *
			 * @return {string}
			 */
			labelLanguageIso: function () {
				return this.getLanguageIsoCodeOfZLang( this.labelData.lang );
			},

			/**
			 * Returns the name of the language of this label
			 *
			 * TODO (T329103): This is currently not used, but are we showing the
			 * language name when we hover over the language ISO code chip? If so,
			 * this is the string that should be shown
			 *
			 * @return {string}
			 */
			labelLanguageName: function () {
				return this.getLabel( this.labelData.lang );
			},

			/**
			 * Returns whether the label is in the user preferred language
			 *
			 * @return {boolean}
			 */
			isUserLang: function () {
				return this.getUserZlangZID === this.labelData.lang;
			}
		}
	)
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

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
</style>
