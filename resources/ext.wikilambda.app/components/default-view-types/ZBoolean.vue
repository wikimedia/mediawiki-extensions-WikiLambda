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
				:key="'radio-' + radio.value"
				v-model="value"
				:input-value="radio.value"
				:name="'boolean-radios-' + rowId"
				:inline="true"
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
const { CdxRadio } = require( '@wikimedia/codex' );
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-boolean',
	components: {
		'cdx-radio': CdxRadio
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLabelData',
		'getZBooleanValue',
		'getUserLangCode'
	] ),
	{
		value: {
			get: function () {
				return this.getZBooleanValue( this.rowId );
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
			return '/view/' + this.getUserLangCode + '/' + this.value;
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
