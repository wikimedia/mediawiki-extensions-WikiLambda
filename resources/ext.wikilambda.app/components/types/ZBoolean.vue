<!--
	WikiLambda Vue component for boolean values

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-boolean" data-testid="z-boolean">
		<template v-if="!edit">
			<a
				class="ext-wikilambda-app-link"
				:href="valueUrl"
				:lang="valueLabelData.langCode"
				:dir="valueLabelData.langDir"
			>{{ valueLabelData.label }}</a>
		</template>
		<template v-else>
			<cdx-radio
				v-for="radio in radioChoices"
				:key="`radio-${ radio.value }`"
				v-model="value"
				:name="keyPath"
				:input-value="radio.value"
				:inline="true"
				:disabled="disabled"
			>
				<span
					:lang="radio.labelData.langCode"
					:dir="radio.labelData.langDir"
				>{{ radio.labelData.label }}</span>
			</cdx-radio>
		</template>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const zobjectMixin = require( '../../mixins/zobjectMixin.js' );
const useMainStore = require( '../../store/index.js' );
const urlUtils = require( '../../utils/urlUtils.js' );

// Codex components
const { CdxRadio } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-boolean',
	components: {
		'cdx-radio': CdxRadio
	},
	mixins: [ zobjectMixin ],
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLabelData',
		'getUserLangCode'
	] ), {
		value: {
			get: function () {
				return this.getZBooleanValue( this.objectValue );
			},
			set: function ( value ) {
				this.$emit( 'set-value', {
					keyPath: [
						Constants.Z_BOOLEAN_IDENTITY,
						Constants.Z_REFERENCE_ID
					],
					value
				} );
			}
		},
		/**
		 * Returns the LabelData object for the selected value of the boolean
		 *
		 * @return {LabelData}
		 */
		valueLabelData: function () {
			return this.getLabelData( this.value );
		},
		/**
		 * Returns the url for the selected boolean value
		 *
		 * @return {string}
		 */
		valueUrl: function () {
			return urlUtils.generateViewUrl( {
				langCode: this.getUserLangCode,
				zid: this.value
			} );
		},
		/**
		 * Returns the radio choices for True and False, with their value
		 * and their LabelData object
		 *
		 * @return {Array}
		 */
		radioChoices: function () {
			return [
				{
					labelData: this.getLabelData( Constants.Z_BOOLEAN_TRUE ),
					value: Constants.Z_BOOLEAN_TRUE
				},
				{
					labelData: this.getLabelData( Constants.Z_BOOLEAN_FALSE ),
					value: Constants.Z_BOOLEAN_FALSE
				}
			];
		}
	} )
} );
</script>
