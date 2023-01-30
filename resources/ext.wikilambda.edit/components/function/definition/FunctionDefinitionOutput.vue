<template>
	<!--
		WikiLambda Vue component for setting the output of a ZFunction in the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-output">
		<div class="ext-wikilambda-function-definition-output__label">
			<div class="ext-wikilambda-function-definition-output__label-block">
				<label
					id="ext-wikilambda-function-definition-output__label-label"
					class="ext-wikilambda-app__text-regular">
					{{ $i18n( 'wikilambda-function-definition-output-label' ).text() }}
				</label>
				<tooltip
					v-if="tooltipMessage && !canEdit"
					:content="tooltipMessage"
				>
					<cdx-icon
						v-if="tooltipIcon"
						class="ext-wikilambda-function-definition-output__tooltip-icon"
						:icon="tooltipIcon">
					</cdx-icon>
				</tooltip>
			</div>
			<span class="ext-wikilambda-function-definition-output__description">
				{{ $i18n( 'wikilambda-function-definition-output-description' ).text() }}
				<a :href="getTypeUrl()"> {{ $i18n( 'wikilambda-function-definition-output-types' ).text() }} </a>
			</span>
		</div>
		<div class="ext-wikilambda-function-definition-output__body">
			<span class="ext-wikilambda-function-definition-output__body__entry-text">
				{{ $i18n( 'wikilambda-function-definition-output-type-label' ).text() }}
			</span>
			<z-object-selector
				ref="typeSelector"
				:type="Constants.Z_TYPE"
				class="
					ext-wikilambda-function-definition-output__body__entry-field
					ext-wikilambda-function-definition-output__selector"
				aria-labelledby="ext-wikilambda-function-definition-output__label-label"
				:placeholder="$i18n( 'wikilambda-function-definition-output-selector' ).text()"
				:selected-id="zReturnType.value"
				:initial-selection-label="zReturnTypeLabel"
				:readonly="!canEdit"
				:zobject-id="zReturnTypeId"
				@input="setReturnType"
				@focus-out="clearIfUnset"
			></z-object-selector>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	ZObjectSelector = require( '../../ZObjectSelector.vue' ),
	Tooltip = require( '../../base/Tooltip.vue' ),
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'function-definition-output',
	components: {
		'z-object-selector': ZObjectSelector,
		tooltip: Tooltip,
		'cdx-icon': CdxIcon
	},
	props: {
		zobjectId: {
			type: Number,
			default: 0
		},
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
	computed: $.extend( mapGetters( [
		'getNestedZObjectById',
		'getZkeyLabels'
	] ), {
		Constants: function () {
			return Constants;
		},
		zReturnTypeId: function () {
			return this.zReturnType.id;
		},
		zReturnType: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_RETURN_TYPE,
				Constants.Z_REFERENCE_ID
			] );
		},
		zReturnTypeLabel: function () {
			return this.zReturnType.value ? this.getZkeyLabels[ this.zReturnType.value ] : '';
		}
	} ),
	methods: $.extend( mapActions( [
		'setZObjectValue'
	] ), {
		setReturnType: function ( type ) {
			var payload = {
				id: this.zReturnTypeId,
				value: type
			};
			this.setZObjectValue( payload );
		},
		clearIfUnset: function () {
			if ( !this.zReturnType.value ) {
				this.$refs.typeSelector.clearResults();
			}
		},
		getTypeUrl: function () {
			return new mw.Title( Constants.PATHS.LIST_ZOBJECTS_BY_TYPE_TYPE ).getUrl();
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
