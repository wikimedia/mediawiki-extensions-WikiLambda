<template>
	<!--
		WikiLambda Vue component for setting the output type inside the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<fn-editor-base>
		<template #title>
			{{ $i18n( 'wikilambda-editor-output-title' ) }}
		</template>

		<template #subtitle>
			{{ $i18n( 'wikilambda-editor-output-subtitle' ) }}
		</template>

		<div>
			<section class="ext-wikilambda-output-editor">
				<fn-editor-type-selector
					:type="Constants.Z_TYPE"
					:placeholder="$i18n( 'wikilambda-editor-output-placeholder' )"
					:selected-id="zReturnType.value"
					@input="setReturnType"
				></fn-editor-type-selector>
				<div class="description">
					{{ $i18n( 'wikilambda-editor-output-description' ) }}
				</div>
			</section>
		</div>
	</fn-editor-base>
</template>

<script>
var FnEditorBase = require( './FnEditorBase.vue' ),
	Constants = require( '../../Constants.js' ),
	FnEditorTypeSelector = require( './FnEditorTypeSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../../mixins/typeUtils.js' );

// @vue/component
module.exports = {
	components: {
		'fn-editor-base': FnEditorBase,
		'fn-editor-type-selector': FnEditorTypeSelector
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
.ext-wikilambda-output-editor {
	input.ext-wikilambda-text-input {
		margin-left: 10px;
	}
}
</style>
