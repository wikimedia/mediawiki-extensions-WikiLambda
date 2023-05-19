<template>
	<!--
		WikiLambda Vue component for displaying and modifying ZTesters.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<label id="ext-wikilambda-ztester_function-label">{{ functionLabel }}:</label>
		<wl-z-reference
			aria-labelledby="ext-wikilambda-ztester_function-label"
			:search-type="Constants.Z_FUNCTION"
			:zobject-id="zFunction.id"
		></wl-z-reference>
		<span class="ext-wikilambda-is-tester-associated">
			<cdx-icon :icon="associatedIcon()"></cdx-icon>
			({{ isTesterAttached ?
				$i18n( 'wikilambda-function-is-approved' ).text() :
				$i18n( 'wikilambda-function-is-not-approved' ).text()
			}})
		</span>
		<label id="ext-wikilambda-ztester_call-label">{{ callLabel }}:</label>
		<wl-z-function-call
			aria-labelledby="ext-wikilambda-ztester_call-label"
			:zobject-id="zCall.id"
			hide-call-button
		></wl-z-function-call>
		<label id="ext-wikilambda-ztester_validator-label">{{ validatorLabel }}:</label>
		<wl-z-function-call
			aria-labelledby="ext-wikilambda-ztester_validator-label"
			:zobject-id="zValidation.id"
			hide-first-argument
			hide-call-button
		></wl-z-function-call>
		<wl-function-report-widget
			:z-function-id="zFunctionId"
			:z-tester-id="zTesterId"
			:report-type="Constants.Z_TESTER"
		>
			<template #run-testers="{ click }">
				<cdx-button @click="click">
					{{ $i18n( 'wikilambda-tester-run-tester' ).text() }}
				</cdx-button>
			</template>
		</wl-function-report-widget>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../lib/icons.json' ),
	ZFunctionCall = require( './ZFunctionCall.vue' ),
	ZReference = require( './ZReference.vue' ),
	FunctionReportWidget = require( '../widgets/FunctionReport.vue' );

// @vue/component
module.exports = exports = {
	components: {
		'wl-z-function-call': ZFunctionCall,
		'wl-z-reference': ZReference,
		'wl-function-report-widget': FunctionReportWidget,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		}
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getZkeyLabels',
		'getZkeys',
		'getNestedZObjectById',
		'getZObjectById'
	] ),
	{
		Constants: function () {
			return Constants;
		},
		functionLabel: function () {
			return this.getZkeyLabels[ Constants.Z_TESTER_FUNCTION ];
		},
		callLabel: function () {
			return this.getZkeyLabels[ Constants.Z_TESTER_CALL ];
		},
		validatorLabel: function () {
			return this.getZkeyLabels[ Constants.Z_TESTER_VALIDATION ];
		},
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		zFunction: function () {
			return this.findKeyInArray( Constants.Z_TESTER_FUNCTION, this.zobject );
		},
		zCall: function () {
			return this.findKeyInArray( Constants.Z_TESTER_CALL, this.zobject );
		},
		zValidation: function () {
			return this.findKeyInArray( Constants.Z_TESTER_VALIDATION, this.zobject );
		},
		zFunctionId: function () {
			return this.getNestedZObjectById( this.zFunction.id, [
				Constants.Z_REFERENCE_ID
			] ).value || '';
		},
		selectedFunctionJson: function () {
			return this.getZkeys[ this.zFunctionId ];
		},
		zTesterId: function () {
			return this.getNestedZObjectById( this.getZObjectById( this.zobjectId ).parent, [
				Constants.Z_PERSISTENTOBJECT_ID,
				Constants.Z_STRING_VALUE
			] ).value;
		},
		isTesterAttached: function () {
			return this.selectedFunctionJson && this.selectedFunctionJson.Z2K2.Z8K3.filter( function ( zid ) {
				return zid === this.zTesterId;
			}.bind( this ) ).length > 0;
		}
	} ),
	methods: {
		associatedIcon: function () {
			return ( this.isTesterAttached ) ? icons.cdxIconLink : icons.cdxIconUnLink;
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-is-tester-associated {
	font-size: 0.8em;
	font-style: italic;
	margin-left: 0.2em;
}
</style>
