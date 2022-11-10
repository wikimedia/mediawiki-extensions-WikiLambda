<template>
	<!--
		WikiLambda Vue component for multilingual text

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-multilingual">
		<z-monolingual-string
			v-for="( z11Object ) in monolingualStrings"
			:key="z11Object.id"
			:zobject-id="z11Object.id"
			class="ext-wikilambda-monolingual"
			:readonly="readonly || getViewMode"
		></z-monolingual-string>
		<div class="ext-wikilambda-monolingual">
			<z-object-selector
				v-if="!( readonly || getViewMode )"
				ref="langSelector"
				:used-languages="usedLanguages"
				:type="Constants.Z_NATURAL_LANGUAGE"
				@input="addNewLang"
			></z-object-selector>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( './../../mixins/typeUtils.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	ZMonolingualString = require( './ZMonolingualString.vue' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' );

// @vue/component
module.exports = exports = {
	name: 'z-multilingual-string',
	components: {
		'z-monolingual-string': ZMonolingualString,
		'z-object-selector': ZObjectSelector
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	computed: $.extend( {},
		mapGetters( {
			getZObjectChildrenById: 'getZObjectChildrenById',
			getAllItemsFromListById: 'getAllItemsFromListById',
			getZObjectAsJsonById: 'getZObjectAsJsonById',
			getViewMode: 'getViewMode'
		} ),
		{
			Constants: function () {
				return Constants;
			},
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			monolingualStringsParentId: function () {
				var monolingualStringItem = this.findKeyInArray( Constants.Z_MULTILINGUALSTRING_VALUE, this.zobject );

				return monolingualStringItem.id;
			},
			monolingualStrings: function () {
				if ( this.monolingualStringsParentId ) {
					return this.getAllItemsFromListById( this.monolingualStringsParentId );
				}
			},
			usedLanguages: function () {
				var languageJson = this.getZObjectAsJsonById( this.monolingualStringsParentId, true );
				return languageJson.reduce( function ( result, language ) {
					const languageString = language[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ];
					if ( languageString ) {
						result.push( languageString );
					}
					return result;
				}, [] );
			},
			tooltipRemoveLang: function () {
				return this.$i18n( 'wikilambda-editor-label-removelanguage-tooltip' ).text();
			},
			selectedLang: function () {
				return 'None';
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'addZMonolingualString', 'setIsZObjectDirty' ] ),
		{
			/**
			 * Fires a `change` event with the index of a Monolingual String
			 * and its new string value.
			 *
			 * @param {Event} event
			 * @param {number} index
			 */
			updateLangString: function ( event, index ) {
				this.$emit( 'change', {
					index: index,
					value: event.target.value
				} );
			},

			/**
			 * Triggers a `addZMonolingualString` action with the language code of the new
			 * Monolingual String to add to the Multilingual String.
			 *
			 * @param {string} zId
			 */
			addNewLang: function ( zId ) {
				if ( !zId ) {
					return;
				}

				var lang = zId,
					payload = {
						lang: lang,
						parentId: this.monolingualStringsParentId
					};
				this.addZMonolingualString( payload );
				this.setIsZObjectDirty( true );
				this.$refs.langSelector.clearResults();
			},

			/**
			 * Fires a `delete-lang` event with the index of the Monolingual String
			 * to be removed.
			 *
			 * @param {number} index
			 * @fires delete-lang
			 */
			removeLang: function ( index ) {
				this.$emit( 'delete-lang', index );
			},
			isLangCodeAvailable: function ( langCode ) {
				var usedLangIndex;
				for ( usedLangIndex in this.usedLanguages ) {
					if ( this.usedLanguages[ usedLangIndex ][ Constants.Z_REFERENCE_ID ] === langCode ) {
						return false;
					}
				}

				return true;
			}
		}
	)
};
</script>

<style lang="less">
.ext-wikilambda-multilingual {
	display: block;
	padding: 1em;
	background: #efe;
	outline: 1px dashed #888;
}

.ext-wikilambda-monolingual {
	clear: both;
}
</style>
