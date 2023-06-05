<template>
	<!--
		WikiLambda Vue component for viewing a function name in different languages.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div v-if="getFunctionNames.length > 0" class="ext-wikilambda-function-viewer-names">
		<wl-function-viewer-sidebar
			:list="visibleFunctionNames"
			:z-lang="getUserZlangZID"
			:button-weight="buttonWeight"
			:button-text="buttonText"
			:button-icon="buttonIcon"
			@change-show-langs="showAllLangs = !showAllLangs"
		></wl-function-viewer-sidebar>
	</div>
</template>

<script>
var Constants = require( '../../../../Constants.js' ),
	icons = require( '../../../../../lib/icons.json' ),
	typeUtils = require( '../../../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	FunctionViewerSidebar = require( '../FunctionViewerSidebar.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-function-viewer-about-names',
	components: {
		'wl-function-viewer-sidebar': FunctionViewerSidebar
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
		'getAllItemsFromListById',
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getUserZlangZID',
		'getLabel',
		'getStoredObject'
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
			return this.getAllItemsFromListById( this.getFunctionNameMultilingualId );
		},
		getFunctionNames: function () {
			var allLabels = [];

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

					const langObject = this.getStoredObject( language );
					if ( label && langObject ) {
						var isoCode = langObject[
							Constants.Z_PERSISTENTOBJECT_VALUE
						][
							Constants.Z_NATURAL_LANGUAGE_ISO_CODE
						];

						allLabels.push( {
							label,
							language,
							languageLabel: this.getLabel( language ),
							isoCode
						} );
					}
				}
			}

			return allLabels;
		},
		visibleFunctionNames: function () {
			return this.showAllLangs ? this.getFunctionNames : [];
		},
		buttonText: function () {
			if ( this.showAllLangs ) {
				return this.$i18n( 'wikilambda-function-viewer-aliases-hide-language-button' ).text();
			}
			return this.$i18n( 'wikilambda-function-viewer-names-show-languages-button' ).text();
		},
		buttonWeight: function () {
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
