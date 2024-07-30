<!--
	WikiLambda Vue component for setting the output of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-definition-output">
		<div class="ext-wikilambda-function-block__label">
			<label id="ext-wikilambda-function-definition-output__label-id">
				{{ outputLabel }}
			</label>
			<wl-tooltip
				v-if="tooltipMessage && !canEdit"
				:content="tooltipMessage"
			>
				<cdx-icon
					v-if="tooltipIcon"
					class="ext-wikilambda-function-block__label__tooltip-icon"
					:icon="tooltipIcon">
				</cdx-icon>
			</wl-tooltip>
			<span class="ext-wikilambda-function-block__label__description">
				{{ outputFieldDescription }}
				<a :href="listObjectsUrl" target="_blank">{{ listObjectsLink }}</a>
			</span>
		</div>
		<div class="ext-wikilambda-function-block__body">
			<wl-type-selector
				v-if="!!outputTypeRowId"
				class="ext-wikilambda-function-definition-output__field"
				data-testid="function-editor-output-type"
				aria-labelledby="ext-wikilambda-function-definition-output__label-id"
				:row-id="outputTypeRowId"
				:disabled="!canEdit"
				:label="outputTypeLabel"
				:placeholder="outputFieldPlaceholder"
				:type="typeZid"
			></wl-type-selector>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const Constants = require( '../../../Constants.js' ),
	TypeSelector = require( '../../base/TypeSelector.vue' ),
	Tooltip = require( '../../base/Tooltip.vue' ),
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-output',
	components: {
		'wl-tooltip': Tooltip,
		'wl-type-selector': TypeSelector,
		'cdx-icon': CdxIcon
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
	data: function () {
		return {
			typeZid: Constants.Z_TYPE
		};
	},
	computed: Object.assign( mapGetters( [
		'getUserLangCode',
		'getZFunctionOutput'
	] ), {
		/**
		 * Returns the row object of the output type
		 * of the function, or undefined if not found.
		 *
		 * @return {Object|undefined}
		 */
		outputTypeRow: function () {
			return this.getZFunctionOutput();
		},
		/**
		 * Returns the row id of the output type
		 * of the function, or undefined if not found.
		 *
		 * @return {number|undefined}
		 */
		outputTypeRowId: function () {
			return this.outputTypeRow ? this.outputTypeRow.id : undefined;
		},
		/**
		 * Returns the label for the output field
		 *
		 * @return {string}
		 */
		outputLabel: function () {
			// TODO (T335583): Replace i18n message with key label
			// return this.getLabelData( Constants.Z_FUNCTION_RETURN_TYPE );
			return this.$i18n( 'wikilambda-function-definition-output-label' ).text();
		},
		/**
		 * Returns the title of the "Type" column for the output field
		 *
		 * @return {string}
		 */
		outputTypeLabel: function () {
			return this.$i18n( 'wikilambda-function-definition-output-type-label' ).text();
		},
		/**
		 * Returns the id for the output field
		 *
		 * @return {string}
		 */
		outputFieldId: function () {
			return 'ext-wikilambda-function-definition-output__label-id';
		},
		/**
		 * Returns the description for the output field
		 *
		 * @return {string}
		 */
		outputFieldDescription: function () {
			return this.$i18n( 'wikilambda-function-definition-output-description' ).text();
		},
		/**
		 * Returns the placeholder for the output field
		 *
		 * @return {string}
		 */
		outputFieldPlaceholder: function () {
			return this.$i18n( 'wikilambda-function-definition-output-selector' ).text();
		},
		/**
		 * Returns the URL to the Special page List Object by Type
		 *
		 * @return {string}
		 */
		listObjectsUrl: function () {
			return new mw.Title( Constants.PATHS.LIST_OBJECTS_BY_TYPE_TYPE )
				.getUrl( { uselang: this.getUserLangCode } );
		},
		/**
		 * Returns the text for the link to the Special page List Object by Type
		 *
		 * @return {string}
		 */
		listObjectsLink: function () {
			return this.$i18n( 'wikilambda-function-definition-output-types' ).text();
		}
	} )
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-function-definition-output {
	&__field {
		border-radius: @border-radius-base;
		border: @border-subtle;
		padding: @spacing-75;

		.cdx-label__label__text {
			font-weight: @font-weight-normal;
		}
	}
}
</style>
