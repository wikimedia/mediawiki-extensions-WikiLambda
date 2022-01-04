<template>
	<!--
		WikiLambda Vue component for setting of ZTesters inside the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<fn-editor-base>
		<template #title>
			{{ $i18n( 'wikilambda-editor-behavior-title' ) }}
		</template>
		<template #subtitle>
			{{ $i18n( 'wikilambda-editor-behavior-subtitle' ) }}
		</template>

		<z-tester-list :zobject-id="zTesterId"></z-tester-list>

		<z-function-tester-report
			:z-function-id="zFunctionId"
		></z-function-tester-report>
	</fn-editor-base>
</template>

<script>
var FnEditorBase = require( './FnEditorBase.vue' ),
	Constants = require( '../../Constants.js' ),
	ZTesterList = require( '../function/ZTesterList.vue' ),
	ZFunctionTesterReport = require( '../function/ZFunctionTesterReport.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../../mixins/typeUtils.js' );

module.exports = {
	components: {
		'fn-editor-base': FnEditorBase,
		'z-tester-list': ZTesterList,
		'z-function-tester-report': ZFunctionTesterReport
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			default: 0
		}
	},
	computed: $.extend( mapGetters( [
		'getNestedZObjectById'
	] ), {
		zFunctionId: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IDENTITY,
				Constants.Z_REFERENCE_ID
			] ).value;
		},
		zTesterId: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_TESTERS
			] ).id;
		}
	} )
};
</script>
