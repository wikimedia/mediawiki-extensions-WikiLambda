<template>
	<!--
		WikiLambda Vue component for viewing function aliases in different languages.

		@copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div
		v-if="langAliasString.length > 0"
		class="ext-wikilambda-function-viewer-aliases"
	>
		<div class="ext-wikilambda-function-viewer-aliases__header">
			{{ $i18n( 'wikilambda-function-viewer-aliases-header' ) }}
		</div>
		<wl-function-viewer-sidebar
			:list="getSelectedAliases( getUserZlangZID )"
			:z-lang="getUserZlangZID"
			:button-type="buttonType"
			:button-text="buttonText"
			:button-icon="buttonIcon"
			:should-show-button="multipleAliasLang"
			@change-show-langs="showAllLangs = !showAllLangs"
		></wl-function-viewer-sidebar>
	</div>
</template>

<script>
var Constants = require( '../../../../Constants.js' ),
	typeUtils = require( '../../../../mixins/typeUtils.js' ),
	icons = require( '../../../../../lib/icons.json' ),
	mapGetters = require( 'vuex' ).mapGetters,
	FunctionViewerSidebar = require( '../FunctionViewerSidebar.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-function-viewer-about-aliases',
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
			showAllLangs: false,
			// if aliases exist in another language
			// (another refers to a language that is not the users)
			multipleAliasLang: false
		};
	},
	computed: $.extend( mapGetters( [
		'getAllItemsFromListById',
		'getZObjectAsJsonById',
		'getZkeys',
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getUserZlangZID',
		'getZkeyLabels'
	] ), {
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		zObjectAliasId: function () {
			return this.findKeyInArray( Constants.Z_PERSISTENTOBJECT_ALIASES, this.zobject ).id;
		},
		zObjectAliases: function () {
			return this.getZObjectAsJsonById( this.zObjectAliasId );
		},
		selectedLanguages: function () {
			var languageList = [];

			if ( this.zObjectAliases[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ] ) {
				const aliases = this.zObjectAliases[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ].slice( 1 );
				aliases.forEach( function ( alias ) {
					var lang = alias[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ][ Constants.Z_REFERENCE_ID ];
					if ( languageList.indexOf( lang ) === -1 ) {
						languageList.push( lang );
					}
				} );
			}

			return languageList;
		},
		getZObjectAliases: function () {
			return this.getZObjectChildrenById(
				this.getNestedZObjectById( this.zobjectId, [
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				] ).id );
		},
		langAliasString: function () {
			var languageAliases = this.getLanguageAliases( this.selectedLanguages );
			return languageAliases.map( function ( alias ) {
				if ( this.getZkeys[ alias.language ] && this.getZkeys[ alias.language ][
					Constants.Z_PERSISTENTOBJECT_VALUE
				] ) {
					var isoCode = this.getZkeys[ alias.language ][
						Constants.Z_PERSISTENTOBJECT_VALUE
					][
						Constants.Z_NATURAL_LANGUAGE_ISO_CODE
					];

					return {
						label: alias.languageString.value,
						language: alias.language,
						languageLabel: this.getZkeyLabels[ alias.language ],
						isoCode
					};
				}
			}.bind( this ) );
		},
		buttonText: function () {
			if ( this.showAllLangs ) {
				return this.$i18n( 'wikilambda-function-viewer-aliases-hide-language-button' ).text();
			}
			return this.$i18n( 'wikilambda-function-viewer-aliases-show-language-button' ).text();
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
	} ),
	methods: {
		getSelectedAliases: function ( userLanguage ) {
			if ( this.showAllLangs ) {
				return this.langAliasString;
			}
			return this.langAliasString.filter( function ( alias ) {
				return alias && alias.language === userLanguage;
			} );
		},
		getLanguageAliases: function ( allLanguages ) {
			var allAliases = [];
			for ( var item in allLanguages ) {
				var language = allLanguages[ item ];

				// if this language is not the users AND
				// it is the first time we have encountered a language that is not the users
				if ( language !== this.getUserZlangZID && !this.multipleAliasLang ) {
					this.multipleAliasLang = true;
				}

				var nextAliasGroup = this.getLanguageAliasStringsetId( language );

				allAliases = allAliases.concat( nextAliasGroup );
			}

			return allAliases;
		},
		getLanguageAliasStringsetId: function ( language ) {
			var allAliases = [];
			this.getZObjectAliases.forEach( function ( alias ) {

				var aliasLang = this.getNestedZObjectById( alias.id, [
					Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE,
					Constants.Z_REFERENCE_ID
				] );

				if ( aliasLang.value === language ) {
					alias = this.getNestedZObjectById( alias.id, [
						Constants.Z_MONOLINGUALSTRINGSET_VALUE
					] );

					var aliasString = this.getAllItemsFromListById( alias.id, language );
					allAliases = allAliases.concat( aliasString );
				}
			}.bind( this ) );

			return allAliases;
		}
	}
};

</script>

<style lang="less">
@import '../../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-viewer-aliases {
	&__header {
		color: @color-base;
		font-size: 1em;
		font-weight: @font-weight-bold;
	}

	&__item {
		line-height: @line-height-medium;
		margin-top: 1em;
		margin-bottom: 1em;
	}
}

</style>
