<!--
	WikiLambda Vue component for setting the output of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-function-editor-field
		class="ext-wikilambda-app-function-editor-output"
		:tooltip-message="tooltipMessage"
		:tooltip-icon="tooltipIcon"
		:show-tooltip="tooltipMessage && !canEdit">
		<template #label>
			<label :id="outputFieldId">
				{{ outputLabel }}
			</label>
		</template>
		<template #description>
			{{ outputFieldDescription }}
			<a :href="listObjectsUrl" target="_blank">{{ listObjectsLink }}</a>
		</template>
		<template #body>
			<wl-type-selector
				v-if="!!outputType"
				class="ext-wikilambda-app-function-editor-output__field"
				data-testid="function-editor-output-type"
				:key-path="outputTypeKeyPath"
				:object-value="outputType"
				:aria-labelledby="outputFieldId"
				:disabled="!canEdit"
				:label-data="outputTypeLabel"
				:placeholder="outputFieldPlaceholder"
			></wl-type-selector>
		</template>
	</wl-function-editor-field>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const FunctionEditorField = require( './FunctionEditorField.vue' );
const LabelData = require( '../../../store/classes/LabelData.js' );
const TypeSelector = require( '../../base/TypeSelector.vue' );
const useMainStore = require( '../../../store/index.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-output',
	components: {
		'wl-type-selector': TypeSelector,
		'wl-function-editor-field': FunctionEditorField
	},
	props: {
		/**
		 * if a user has permission to edit a function
		 */
		canEdit: {
			type: Boolean,
			default: false
		},
		/**
		 * icon that will display a tooltip
		 */
		tooltipIcon: {
			type: [ String, Object ],
			default: null,
			required: false
		},
		/**
		 * message the tooltip displays
		 */
		tooltipMessage: {
			type: String,
			default: null
		}
	},
	setup() {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const outputTypeKeyPath = [
			Constants.STORED_OBJECTS.MAIN,
			Constants.Z_PERSISTENTOBJECT_VALUE,
			Constants.Z_FUNCTION_RETURN_TYPE
		].join( '.' );

		/**
		 * Returns the output type of the function
		 *
		 * @return {Object}
		 */
		const outputType = computed( () => store.getZFunctionOutput );

		/**
		 * Returns the label for the output field
		 *
		 * TODO (T335583): Replace i18n message with key label
		 *
		 * @return {string}
		 */
		const outputLabel = computed( () => i18n( 'wikilambda-function-definition-output-label' ).text() );

		/**
		 * Returns the title of the "Type" column for the output field
		 *
		 * @return {LabelData}
		 */
		const outputTypeLabel = computed( () => LabelData.fromString(
			i18n( 'wikilambda-function-definition-output-type-label' ).text()
		) );

		/**
		 * Returns the id for the output field
		 *
		 * @return {string}
		 */
		const outputFieldId = computed( () => 'ext-wikilambda-app-function-editor-output__label-id' );

		/**
		 * Returns the description for the output field
		 *
		 * @return {string}
		 */
		const outputFieldDescription = computed( () => i18n( 'wikilambda-function-definition-output-description' ).text() );

		/**
		 * Returns the placeholder for the output field
		 *
		 * @return {string}
		 */
		const outputFieldPlaceholder = computed( () => i18n( 'wikilambda-function-definition-output-selector' ).text() );

		/**
		 * Returns the URL to the Special page List Object by Type
		 *
		 * @return {string}
		 */
		const listObjectsUrl = computed( () => new mw.Title( Constants.PATHS.LIST_OBJECTS_BY_TYPE_TYPE )
			.getUrl( { uselang: store.getUserLangCode } ) );

		/**
		 * Returns the text for the link to the Special page List Object by Type
		 *
		 * @return {string}
		 */
		const listObjectsLink = computed( () => i18n( 'wikilambda-function-definition-output-types' ).text() );

		return {
			listObjectsLink,
			listObjectsUrl,
			outputFieldDescription,
			outputFieldId,
			outputFieldPlaceholder,
			outputLabel,
			outputType,
			outputTypeKeyPath,
			outputTypeLabel
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-editor-output {
	.ext-wikilambda-app-function-editor-output__field {
		border-radius: @border-radius-base;
		border: @border-subtle;
		padding: @spacing-75;

		.cdx-label__label__text {
			font-weight: @font-weight-normal;
		}
	}
}
</style>
