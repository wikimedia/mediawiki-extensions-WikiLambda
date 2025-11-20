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
				:model-value="value"
				:name="keyPath"
				:input-value="radio.value"
				:inline="true"
				:disabled="disabled"
				@update:model-value="setValue"
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
const { defineComponent, computed } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useZObject = require( '../../composables/useZObject.js' );
const useMainStore = require( '../../store/index.js' );
const urlUtils = require( '../../utils/urlUtils.js' );

// Codex components
const { CdxRadio } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-boolean',
	components: {
		'cdx-radio': CdxRadio
	},
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
	emits: [ 'set-value' ],
	setup( props, { emit } ) {
		// Use ZObject utilities composable
		const { getZBooleanValue } = useZObject( { keyPath: props.keyPath } );

		// Use main store
		const store = useMainStore();

		// Computed properties
		/**
		 * Returns the boolean value from the object.
		 *
		 * @return {string}
		 */
		const value = computed( () => getZBooleanValue( props.objectValue ) );

		/**
		 * Sets the boolean value by emitting a setValue event.
		 *
		 * @param {string} newValue
		 */
		function setValue( newValue ) {
			emit( 'set-value', {
				keyPath: [
					Constants.Z_BOOLEAN_IDENTITY,
					Constants.Z_REFERENCE_ID
				],
				value: newValue
			} );
		}

		/**
		 * Returns the LabelData object for the selected value of the boolean
		 *
		 * @return {LabelData}
		 */
		const valueLabelData = computed( () => store.getLabelData( value.value ) );

		/**
		 * Returns the url for the selected boolean value
		 *
		 * @return {string}
		 */
		const valueUrl = computed( () => urlUtils.generateViewUrl( {
			langCode: store.getUserLangCode,
			zid: value.value
		} ) );

		/**
		 * Returns the radio choices for True and False, with their value
		 * and their LabelData object
		 *
		 * @return {Array}
		 */
		const radioChoices = computed( () => [
			{
				labelData: store.getLabelData( Constants.Z_BOOLEAN_TRUE ),
				value: Constants.Z_BOOLEAN_TRUE
			},
			{
				labelData: store.getLabelData( Constants.Z_BOOLEAN_FALSE ),
				value: Constants.Z_BOOLEAN_FALSE
			}
		] );

		return {
			radioChoices,
			setValue,
			value,
			valueLabelData,
			valueUrl
		};
	}
} );
</script>
