<template>
	<!--
		WikiLambda Vue component for viewing a function name in different languages.

		@copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-viewer-names">
		<function-viewer-sidebar
			:list="getFunctionNames"
			:z-lang="getUserZlangZID"
			:button-type="buttonType"
			:button-text="buttonText"
			:button-icon="buttonIcon"
			@change-show-langs="showAllLangs = !showAllLangs"
		></function-viewer-sidebar>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	icons = require( '../../../../lib/icons.json' ),
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	FunctionViewerSidebar = require( '../partials/function-viewer-sidebar.vue' );

// @vue/component
module.exports = exports = {
	name: 'function-viewer-about-names',
	components: {
		'function-viewer-sidebar': FunctionViewerSidebar
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			default: 0
		}
	},
	data: function () {
		return {
			showAllLangs: false
		};
	},
	computed: $.extend( mapGetters( [
		'getZObjectAsJsonById',
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getUserZlangZID',
		'getZkeyLabels'
	] ), {
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		getFunctionNameMultilingualId: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			] ).id;
		},
		getFunctionMonolingualNames: function () {
			return this.getZObjectChildrenById( this.getFunctionNameMultilingualId );
		},
		getFunctionNames: function () {
			var allLabels = [];

			if ( this.showAllLangs ) {
				for ( var index in this.getFunctionMonolingualNames ) {
					var labelObject = this.getFunctionMonolingualNames[ index ],
						language = this.getNestedZObjectById( labelObject.id, [
							Constants.Z_MONOLINGUALSTRING_LANGUAGE,
							Constants.Z_REFERENCE_ID
						] ).value;

					if ( language !== this.getUserZlangZID ) {
						var label = this.getNestedZObjectById( labelObject.id, [
							Constants.Z_MONOLINGUALSTRING_VALUE,
							Constants.Z_STRING_VALUE
						] ).value;

						if ( label ) {
							allLabels.push( {
								label,
								language,
								languageLabel: this.getZkeyLabels[ language ]
							} );
						}
					}
				}
			}
			return allLabels;
		},
		buttonText: function () {
			if ( this.showAllLangs ) {
				return this.$i18n( 'wikilambda-function-viewer-aliases-hide-language-button' ).text();
			}
			return this.$i18n( 'wikilambda-function-viewer-names-show-languages-button' ).text();
		},
		buttonType: function () {
			if ( this.showAllLangs ) {
				return 'quiet';
			}
			return 'normal';
		},
		buttonIcon: function () {
			if ( this.showAllLangs ) {
				return icons.cdxIconCollapse;
			}
			return icons.cdxIconLanguage;
		}
	} )
};

</script>
