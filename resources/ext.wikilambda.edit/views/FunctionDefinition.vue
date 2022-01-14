<template>
	<!--
		WikiLambda Vue component for the definition tab in the ZFunction Editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<main class="ext-wikilambda-function-definition">
		<function-definition-name></function-definition-name>
		<function-definition-aliases></function-definition-aliases>
		<function-definition-inputs></function-definition-inputs>
		<function-definition-output></function-definition-output>
		<toast
			v-if="showToast"
			:icon="toastIcon"
			:intent="toastIntent"
			:timeout="toastTimeout"
			:message="currentToast"
			@toast-close="closeToast"
		></toast>
		<function-definition-footer
			@publish-successful="publishSuccessful"
		></function-definition-footer>
	</main>
</template>

<script>
var FunctionDefinitionName = require( '../components/function/definition/function-definition-name.vue' );
var FunctionDefinitionAliases = require( '../components/function/definition/function-definition-aliases.vue' );
var FunctionDefinitionInputs = require( '../components/function/definition/function-definition-inputs.vue' );
var FunctionDefinitionOutput = require( '../components/function/definition/function-definition-output.vue' );
var FunctionDefinitionFooter = require( '../components/function/definition/function-definition-footer.vue' );
var Toast = require( '../components/base/Toast.vue' );
var mapGetters = require( 'vuex' ).mapGetters;
var icons = require( './../../../lib/icons.js' );

// @vue/component
module.exports = {
	name: 'FunctionDefinition',
	components: {
		'function-definition-name': FunctionDefinitionName,
		'function-definition-aliases': FunctionDefinitionAliases,
		'function-definition-inputs': FunctionDefinitionInputs,
		'function-definition-output': FunctionDefinitionOutput,
		'function-definition-footer': FunctionDefinitionFooter,
		toast: Toast
	},
	data: function () {
		return {
			currentToast: null
		};
	},
	computed: $.extend( mapGetters( [
		'currentZFunctionHasInputs',
		'currentZFunctionHasOutput'
	] ),
	{
		ableToPublish: function () {
			if ( this.currentZFunctionHasInputs && this.currentZFunctionHasOutput ) {
				return true;
			}
			return false;
		},
		toastIcon: function () {
			return icons.sdIconCheck;
		},
		toastIntent: function () {
			return 'SUCCESS';
		},
		toastTimeout: function () {
			return 2000;
		},
		showToast: function () {
			return this.currentToast !== null;
		}
	} ),
	methods: {
		publishSuccessful: function ( toastMessage ) {
			this.currentToast = toastMessage;
		},
		closeToast: function () {
			this.currentToast = null;
		}
	},
	watch: {
		ableToPublish: {
			immediate: true,
			handler: function ( status ) {
				if ( status ) {
					this.currentToast = this.$i18n( 'wikilambda-function-definition-can-publish-message' ).text();
				}
			}
		}
	}
};
</script>

<style lang="less">
@import './../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-definition {
	padding-top: 20px;
	padding-left: 27px;
	border: 1px solid @wmui-color-base80;
	min-height: 450px;
}
</style>
