<template>
	<!--
		WikiLambda Vue component for setting the output of a ZFunction in the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-output">
		<div class="ext-wikilambda-function-definition-output_label">
			<label class="ext-wikilambda-app__text-regular">
				{{ $i18n( 'wikilambda-function-definition-output-label' ) }}
			</label>
			<tooltip
				v-if="isEditing && tooltipMessage"
				:content="tooltipMessage"
			>
				<cdx-icon v-if="tooltipIcon" :icon="tooltipIcon"></cdx-icon>
			</tooltip>
		</div>
		<z-object-selector
			:type="Constants.Z_TYPE"
			class="ext-wikilambda-function-definition-output__selector"
			:placeholder="$i18n( 'wikilambda-function-definition-output-selector' )"
			:selected-id="zReturnType.value"
			@input="setReturnType"
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
		isEditing: {
			type: Boolean
		},
		tooltipIcon: {
			type: [ String, Object ],
			default: null,
			required: false
		},
		tooltipMessage: {
			type: String,
			default: null
		}
	},
	computed: $.extend( mapGetters( [
		'getNestedZObjectById'
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
		}
	} )
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-definition-output {
	display: flex;
	margin-bottom: 26px;

	& > div {
		width: 153px;
	}

	&__selector {
		height: 32px;
		margin-right: 6px;
	}

	&_label {
		display: flex;
	}
}
</style>
