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
			<label id="ext-wikilambda-app-function-editor-output__label-id">
				{{ i18n( 'wikilambda-function-definition-output-label' ).text() }}
			</label>
		</template>
		<template #description>
			{{ i18n( 'wikilambda-function-definition-output-description' ).text() }}
			<a :href="listObjectsUrl" target="_blank">
				{{ i18n( 'wikilambda-function-definition-output-types' ).text() }}
			</a>
		</template>
		<template #body>
			<wl-type-selector
				v-if="!!outputType"
				class="ext-wikilambda-app-function-editor-output__field"
				data-testid="function-editor-output-type"
				:key-path="outputTypeKeyPath"
				:object-value="outputType"
				aria-labelledby="ext-wikilambda-app-function-editor-output__label-id"
				:disabled="!canEdit"
				:label-data="outputTypeLabel"
				:placeholder="i18n( 'wikilambda-function-definition-output-selector' ).text()"
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
		 * Returns the title of the "Type" column for the output field
		 *
		 * @return {LabelData}
		 */
		const outputTypeLabel = computed( () => LabelData.fromString(
			i18n( 'wikilambda-function-definition-output-type-label' ).text()
		) );

		/**
		 * Returns the URL to the Special page List Object by Type
		 *
		 * @return {string}
		 */
		const listObjectsUrl = computed( () => new mw.Title( Constants.PATHS.LIST_OBJECTS_BY_TYPE_TYPE )
			.getUrl( { uselang: store.getUserLangCode } ) );

		return {
			listObjectsUrl,
			i18n,
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
