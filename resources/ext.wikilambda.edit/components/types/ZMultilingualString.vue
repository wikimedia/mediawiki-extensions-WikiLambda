<template>
	<!--
		WikiLambda Vue component for multilingual text

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-multilingual">
		<z-monolingual-string
			v-for="(z11Object) in monolingualStrings"
			:key="z11Object.id"
			:zobject-id="z11Object.id"
			class="ext-wikilambda-monolingual"
			:readonly="readonly"
		></z-monolingual-string>
		<div class="ext-wikilambda-monolingual">
			<select v-if="!(viewmode || readonly)"
				:value="selectedLang"
				@change="addNewLang"
			>
				<option
					selected
					disabled
					value="None"
				>
					{{ $i18n( 'wikilambda-editor-label-addlanguage-label' ) }}
				</option>
				<option
					v-for="(langName, langId) in unusedLangList"
					:key="langId"
					:value="langId"
				>
					{{ langName }}
				</option>
			</select>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( './../../mixins/typeUtils.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	ZMonolingualString = require( './ZMonolingualString.vue' );

module.exports = {
	name: 'ZMultilingualString',
	components: {
		'z-monolingual-string': ZMonolingualString
	},
	inject: {
		viewmode: { default: false }
	},
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
	mixins: [ typeUtils ],
	data: function () {
		return {
			Constants: Constants
		};
	},
	computed: $.extend( {},
		mapGetters( {
			getZObjectChildrenById: 'getZObjectChildrenById',
			getZObjectAsJsonById: 'getZObjectAsJsonById',
			allLangs: 'getAllLangs'
		} ),
		{
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			monolingualStringsParentId: function () {
				var monolingualStringItem = this.findKeyInArray( Constants.Z_MULTILINGUALSTRING_VALUE, this.zobject );

				return monolingualStringItem.id;
			},
			monolingualStrings: function () {
				if ( this.monolingualStringsParentId ) {
					return this.getZObjectChildrenById( this.monolingualStringsParentId );
				}
			},
			usedLanguages: function () {
				var languageJson = this.getZObjectAsJsonById( this.monolingualStringsParentId, true );
				return languageJson.map( function ( language ) {
					return language[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ];
				} );
			},
			tooltipRemoveLang: function () {
				return this.$i18n( 'wikilambda-editor-label-removelanguage-tooltip' );
			},
			selectedLang: function () {
				return 'None';
			},
			unusedLangList: function () {
				return Object.keys( this.allLangs )
					.filter( this.isLangCodeAvailable )
					.reduce( function ( unusedLangList, lang ) {
						unusedLangList[ lang ] = this.allLangs[ lang ];
						return unusedLangList;
					}.bind( this ), {} );
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'fetchAllLangs', 'addZMonolingualString' ] ),
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
			 * @param {Event} event
			 */
			addNewLang: function ( event ) {
				var lang = event.target.value,
					payload = {
						lang: lang,
						parentId: this.monolingualStringsParentId
					};
				this.addZMonolingualString( payload );
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
	),
	created: function () {
		this.fetchAllLangs();
	}
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
