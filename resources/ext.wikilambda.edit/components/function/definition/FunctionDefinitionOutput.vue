<template>
	<!--
		WikiLambda Vue component for setting the output of a ZFunction in the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-output">
		<div class="ext-wikilambda-function-definition-output__label">
			<label class="ext-wikilambda-app__text-regular">
				{{ $i18n( 'wikilambda-function-definition-output-label' ).text() }}
			</label>
			<tooltip
				v-if="tooltipMessage && !canEdit"
				:content="tooltipMessage"
			>
				<cdx-icon
					v-if="tooltipIcon"
					class="ext-wikilambda-function-definition-output_tooltip-icon"
					:icon="tooltipIcon">
				</cdx-icon>
			</tooltip>
		</div>
		<z-object-selector
			ref="typeSelector"
			:type="Constants.Z_TYPE"
			class="ext-wikilambda-function-definition-output__selector"
			:placeholder="$i18n( 'wikilambda-function-definition-output-selector' ).text()"
			:selected-id="zReturnType.value"
			:initial-selection-label="zReturnTypeLabel"
			:readonly="!canEdit"
			:zobject-id="zReturnTypeId"
			@input="setReturnType"
			@focus-out="clearIfUnset"
		></z-object-selector>
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
		}
	} )
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';
@import './../../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-definition-output {
	display: flex;
	flex-direction: column;

	&__selector {
		margin-right: 6px;
		width: auto;
	}

	&__label {
		display: flex;
		flex: none;
		width: 153px;
	}

	&_tooltip-icon {
		margin-left: 8px;
		width: 16px;
		height: 16px;
	}

	@media screen and ( min-width: @width-breakpoint-tablet ) {
		display: flex;
		flex-direction: row;

		&__selector {
			width: auto;
		}
	}
}
</style>
