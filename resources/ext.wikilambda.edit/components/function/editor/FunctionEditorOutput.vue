<!--
	WikiLambda Vue component for setting the output of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-definition-output">
		<div class="ext-wikilambda-function-definition-output__label">
			<div class="ext-wikilambda-function-definition-output__label-block">
				<label
					id="ext-wikilambda-function-definition-output__label-label"
					class="ext-wikilambda-app__text-regular"
				>
					{{ outputLabel }}
				</label>
				<wl-tooltip
					v-if="tooltipMessage && !canEdit"
					:content="tooltipMessage"
				>
					<cdx-icon
						v-if="tooltipIcon"
						class="ext-wikilambda-function-definition-output__tooltip-icon"
						:icon="tooltipIcon">
					</cdx-icon>
				</wl-tooltip>
			</div>
			<span class="ext-wikilambda-function-definition-output__description">
				{{ outputFieldDescription }}
				<a :href="listObjectsUrl" target="_blank">{{ listObjectsLink }}</a>
			</span>
		</div>
		<div class="ext-wikilambda-function-definition-output__body">
			<span class="ext-wikilambda-function-definition-output__body__entry-text">
				{{ outputTypeLabel }}
			</span>
			<wl-z-object-selector
				class="
					ext-wikilambda-function-definition-output__body__entry-field
					ext-wikilambda-function-definition-output__selector"
				aria-labelledby="ext-wikilambda-function-definition-output__label-label"
				:disabled="!canEdit"
				:placeholder="outputFieldPlaceholder"
				:row-id="outputTypeRowId"
				:selected-zid="outputType"
				:type="typeZid"
				@input="persistOutputType"
			></wl-z-object-selector>
		</div>
	</div>
</template>

<script>
const Constants = require( '../../../Constants.js' ),
	ZObjectSelector = require( '../../ZObjectSelector.vue' ),
	Tooltip = require( '../../base/Tooltip.vue' ),
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'wl-function-editor-output',
	components: {
		'wl-z-object-selector': ZObjectSelector,
		'wl-tooltip': Tooltip,
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
	computed: $.extend( mapGetters( [
		'getZLang',
		'getZFunctionOutput',
		'getZReferenceTerminalValue'
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
		 * Returns the string value of the output type
		 * of the function, or empty string if undefined.
		 *
		 * @return {string}
		 */
		outputType: function () {
			return this.outputTypeRow ? this.getZReferenceTerminalValue( this.outputTypeRow.id ) : '';
		},
		/**
		 * Returns the label for the output field
		 *
		 * @return {string}
		 */
		outputLabel: function () {
			// TODO (T335583): Replace i18n message with key label
			// return this.getLabel( Constants.Z_FUNCTION_RETURN_TYPE );
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
				.getUrl( { uselang: this.getZLang } );
		},
		/**
		 * Returns the text for the link to the Special page List Object by Type
		 *
		 * @return {string}
		 */
		listObjectsLink: function () {
			return this.$i18n( 'wikilambda-function-definition-input-types' ).text();
		}
	} ),
	methods: $.extend( mapActions( [
		'setValueByRowIdAndPath'
	] ), {
		/**
		 * Persist the new output type in the global store
		 *
		 * @param {string|null} value
		 */
		persistOutputType: function ( value ) {
			this.setValueByRowIdAndPath( {
				rowId: this.outputTypeRowId,
				keyPath: [ Constants.Z_REFERENCE_ID ],
				value: value || ''
			} );
		}
	} )
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-definition-output {
	display: flex;
	margin-bottom: @spacing-150;

	&__body {
		display: flex;
		flex-direction: column;

		&__entry-text {
			display: block;
			line-height: @size-200;
			font-weight: @font-weight-bold;
		}
	}

	&__label-block {
		display: flex;
		align-items: center;

		& > label {
			line-height: @size-200;
			font-weight: @font-weight-bold;
		}
	}

	&__label {
		display: flex;
		flex-direction: column;
		width: @wl-field-label-width;
		margin-right: @spacing-150;
	}

	&__tooltip-icon {
		margin-left: @spacing-50;
		width: @size-100;
		height: @size-100;
	}

	&__description {
		opacity: 0.8;
		color: @color-subtle;
		font-size: @wl-font-size-description;
		line-height: @wl-line-height-description;
		display: inline-block;
	}

	/* MOBILE styles */
	@media screen and ( max-width: @width-breakpoint-tablet ) {
		flex-direction: column;

		&__label {
			width: auto;

			& > label {
				line-height: inherit;
			}
		}

		&__description {
			font-size: @wl-font-size-description-mobile;
			line-height: @wl-line-height-description-mobile;
			letter-spacing: @wl-letter-spacing-description-mobile;
			margin-bottom: @spacing-50;
		}

		&__body {
			flex-direction: row;
			align-items: center;
			gap: @spacing-100;
		}
	}
}
</style>
