<template>
	<!--
		WikiLambda Vue component for the collection of labels of ZPersistent objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-labelsblock">
		<div class="ext-wikilambda-labelsblock--alias-string">
			{{ userLangAliasString }}
		</div>
		<cdx-toggle-button
			v-model="showMoreLanguages"
			:quiet="true"
			@update:model-value="onUpdate"
		>
			{{ showMoreLanguagesLabel }}
		</cdx-toggle-button>
		<template v-if="showMoreLanguages">
			<table>
				<thead>
					<tr>
						<th scope="col">
							{{ $i18n( 'wikilambda-metadata-language-column' ).text() }}
						</th>
						<th scope="col">
							{{ $i18n( 'wikilambda-metadata-label-column' ).text() }}
						</th>
						<th scope="col">
							{{ $i18n( 'wikilambda-metadata-aka-column' ).text() }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="language in displayedSelectedLanguages" :key="language.Z9K1">
						<td>
							<cdx-button
								v-if="!viewmode"
								:destructive="true"
								@click="removeLang( language.Z9K1 )"
							>
								{{ $i18n( 'wikilambda-editor-removeitem' ).text() }}
							</cdx-button>
							{{ getZkeyLabels[ language.Z9K1 ] }}
						</td>
						<td>
							<z-string
								:zobject-id="getLanguageLabelStringId( language.Z9K1 )"
							></z-string>
						</td>
						<td>
							<div v-for="( alias, index ) in getLanguageAliases( language.Z9K1 )" :key="index">
								<cdx-button
									v-if="!viewmode"
									:destructive="true"
									@click="removeAlias( alias, language.Z9K1 )"
								>
									{{ $i18n( 'wikilambda-editor-removeitem' ).text() }}
								</cdx-button>
								<z-string
									:zobject-id="alias"
								></z-string>
							</div>
							<div v-if="!viewmode">
								<cdx-button
									@click="addAliasForLanguage( language.Z9K1 )"
								>
									{{ $i18n( 'wikilambda-editor-additem' ).text() }}
								</cdx-button> {{ $i18n( 'wikilambda-metadata-add-alias' ).text() }}
							</div>
						</td>
					</tr>
				</tbody>
			</table>
			<div v-if="selectedLanguages.length > defaultMaxLanguages">
				<cdx-toggle-button
					v-model="showAllSelectedLanguages"
					:quiet="true"
					@update:model-value="onUpdate"
				>
					{{ showAllSelectedLanguagesLabel }}
				</cdx-toggle-button>
			</div>
			<z-object-selector
				ref="languageSelector"
				:used-languages="selectedLanguages"
				:type="Constants.Z_NATURAL_LANGUAGE"
				:selected-id="selectedLang"
				@input="addNewLang"
			></z-object-selector>
		</template>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxToggleButton = require( '@wikimedia/codex' ).CdxToggleButton,
	ZString = require( './ZString.vue' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' );

// @vue/component
module.exports = exports = {
	components: {
		'cdx-button': CdxButton,
		'cdx-toggle-button': CdxToggleButton,
		'z-string': ZString,
		'z-object-selector': ZObjectSelector
	},
	mixins: [ typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
		}
	},
	data: function () {
		return {
			defaultMaxLanguages: 4,
			showMoreLanguages: !mw.storage.get( 'aw-showMoreLanguages' ) || mw.storage.get( 'aw-showMoreLanguages' ) === 'true',
			showAllSelectedLanguages: false,
			selectedLang: ''
		};
	},
	computed: $.extend( mapGetters( [
		'getAllItemsFromListById',
		'getZObjectAsJsonById',
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getZkeyLabels',
		'getNextObjectId',
		'getUserZlangZID'
	] ), {
		Constants: function () {
			return Constants;
		},
		showAllSelectedLanguagesLabel: function () {
			if ( this.showAllSelectedLanguages ) {
				return this.$i18n( 'wikilambda-metadata-fewer-languages' ).text();
			}
			return this.$i18n( 'wikilambda-metadata-all-languages' ).text();
		},
		showMoreLanguagesLabel: function () {
			if ( this.showMoreLanguages ) {
				return this.$i18n( 'wikilambda-metadata-hide-languages' ).text();
			}
			return this.$i18n( 'wikilambda-metadata-show-languages' ).text();
		},
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		zObjectLabelId: function () {
			return this.findKeyInArray( Constants.Z_PERSISTENTOBJECT_LABEL, this.zobject ).id;
		},
		zObjectAliasId: function () {
			return this.findKeyInArray( Constants.Z_PERSISTENTOBJECT_ALIASES, this.zobject ).id;
		},
		zObjectLabels: function () {
			return this.getZObjectAsJsonById( this.zObjectLabelId );
		},
		zObjectAliases: function () {
			return this.getZObjectAsJsonById( this.zObjectAliasId );
		},
		selectedLanguages: function () {
			var languageList = [];

			// Don't break if the labels are set to {}
			if ( this.zObjectLabels[ Constants.Z_MULTILINGUALSTRING_VALUE ] ) {
				this.zObjectLabels[ Constants.Z_MULTILINGUALSTRING_VALUE ].forEach( function ( label ) {
					if ( label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] ) {
						languageList.push(
							label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_REFERENCE_ID ]
						);
					}
				} );
			}

			// Don't break if the aliases are set to {}
			if ( this.zObjectAliases[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ] ) {
				this.zObjectAliases[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ].forEach( function ( alias ) {
					if ( alias[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ] ) {
						var lang = alias[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ][ Constants.Z_REFERENCE_ID ];
						if ( languageList.indexOf( lang ) === -1 ) {
							languageList.push( lang );
						}
					}
				} );
			}

			return languageList.map( function ( languageCode ) {
				return {
					Z1K1: Constants.Z_REFERENCE,
					Z9K1: languageCode
				};
			} );
		},
		displayedSelectedLanguages: function () {
			if ( this.showAllSelectedLanguages ) {
				return this.selectedLanguages;
			} else {
				return this.selectedLanguages.slice( 0, this.defaultMaxLanguages );
			}
		},
		/**
		 * Returns a list of MonolingualStringSet objects.
		 *
		 * @return {Array}
		 */
		getZObjectAliases: function () {
			return this.getAllItemsFromListById(
				this.getNestedZObjectById( this.zobjectId, [
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				] ).id );
		},
		/**
		 * Returns a string with all the user language aliases (if any)
		 * separated by a pipe (|)
		 *
		 * @return {string}
		 */
		userLangAliasString: function () {
			return this.getLanguageAliases( this.getUserZlangZID )
				.map( function ( aliasId ) {
					var alias = this.getNestedZObjectById( aliasId, [
						Constants.Z_STRING_VALUE
					] );

					return alias.value;
				}.bind( this ) )
				.filter( ( value ) => !!value )
				.join( ' | ' );
		}
	} ),
	methods: $.extend( mapActions( [
		'addZMonolingualString',
		'addZObject',
		'addZString',
		'injectZObject',
		'removeZObjectChildren',
		'removeZObject',
		'recalculateZListIndex'
	] ), {
		/**
		 * Returns the internal Id that identifies the
		 * Monolingual String object for a given language Zid
		 *
		 * @param {string} language
		 * @return {string}
		 */
		getLanguageLabelId: function ( language ) {
			var labels = this.getZObjectChildrenById(
					this.getNestedZObjectById( this.zobjectId, [
						Constants.Z_PERSISTENTOBJECT_LABEL,
						Constants.Z_MULTILINGUALSTRING_VALUE
					] ).id
				),
				labelId;

			labels.forEach( function ( label ) {
				var labelLang = this.getNestedZObjectById( label.id, [
					Constants.Z_MONOLINGUALSTRING_LANGUAGE,
					Constants.Z_REFERENCE_ID
				] );

				if ( labelLang.value === language ) {
					labelId = label.id;
				}
			}.bind( this ) );

			return labelId;
		},
		/**
		 * Returns the internal Id that identifies the string
		 * object with the label value for a given language Zid.
		 *
		 * @param {string} language
		 * @return {string}
		 */
		getLanguageLabelStringId: function ( language ) {
			var labels = this.getZObjectChildrenById(
					this.getNestedZObjectById( this.zobjectId, [
						Constants.Z_PERSISTENTOBJECT_LABEL,
						Constants.Z_MULTILINGUALSTRING_VALUE
					] ).id
				),
				labelStringId;

			labels.forEach( function ( label ) {
				var labelLang = this.getNestedZObjectById( label.id, [
					Constants.Z_MONOLINGUALSTRING_LANGUAGE,
					Constants.Z_REFERENCE_ID
				] );

				if ( labelLang.value === language ) {
					labelStringId = this.getNestedZObjectById( label.id, [
						Constants.Z_MONOLINGUALSTRING_VALUE
					] ).id;
				}
			}.bind( this ) );

			return labelStringId;
		},
		/**
		 * Returns the table ID of the MonolingualStringSet
		 * containing the list of aliases for a given language
		 *
		 * @param {string} language
		 * @return {string}
		 */
		getLanguageAliasId: function ( language ) {
			const aliasForLang = this.getZObjectAliases.find( function ( alias ) {
				const aliasLang = this.getNestedZObjectById( alias.id, [
					Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE,
					Constants.Z_REFERENCE_ID
				] );
				return ( aliasLang.value === language );
			}.bind( this ) );

			return aliasForLang ? aliasForLang.id : null;
		},
		/**
		 * Returns the table ID of the MonolingualStringSet Value
		 * containing the list of aliases for a given language
		 *
		 * @param {string} language
		 * @return {string}
		 */
		getLanguageAliasStringsetId: function ( language ) {
			const aliasForLangId = this.getLanguageAliasId( language );
			return aliasForLangId ?
				this.getNestedZObjectById( aliasForLangId, [ Constants.Z_MONOLINGUALSTRINGSET_VALUE ] ).id :
				null;
		},
		/**
		 * Returns the list of elements contained in the
		 * MonolingualStringSet value typed list of strings
		 * for a given language.
		 *
		 * @param {string} language
		 * @return {Array}
		 */
		getLanguageAliases: function ( language ) {
			const aliases = this.getAllItemsFromListById( this.getLanguageAliasStringsetId( language ) );
			return aliases.map( function ( alias ) {
				return alias.id;
			} );
		},
		/**
		 * Add a new row to the Label Block, consisting
		 * on a new label for a given language Zid and a new
		 * list of aliases for that language.
		 *
		 * @param {string} langZid
		 */
		addNewLang: function ( langZid ) {
			if ( !langZid ) {
				return;
			}

			var zLabelParentId = this.findKeyInArray(
					Constants.Z_MULTILINGUALSTRING_VALUE,
					this.getZObjectChildrenById( this.zObjectLabelId )
				).id,
				payload = {
					lang: langZid,
					parentId: zLabelParentId
				};

			this.addZMonolingualString( payload );
			this.showAllSelectedLanguages = true;
			this.selectedLang = langZid;
			// this is necessary because it is an anti-pattern
			// the cdx-lookup block should hold the selected value, but we
			// are autoclearing it to make way for the next one
			this.$refs.languageSelector.clearResults();
		},
		/**
		 * Remove the row from the Label Block corresponding
		 * to a given language Zid. This includes removing
		 * the label as well as all the aliases for this
		 * language
		 *
		 * @param {string} language
		 */
		removeLang: function ( language ) {
			var labelId = this.getLanguageLabelId( language ),
				aliasId = this.getLanguageAliasId( language );

			this.removeZObjectChildren( labelId );
			this.removeZObject( labelId );

			var zLabelParentId = this.findKeyInArray(
				Constants.Z_MULTILINGUALSTRING_VALUE,
				this.getZObjectChildrenById( this.zObjectLabelId )
			).id;
			this.recalculateZListIndex( zLabelParentId );

			if ( aliasId ) {
				this.removeZObjectChildren( aliasId );
				this.removeZObject( aliasId );
			}
		},
		/**
		 * Remove one alias from the alias list of a given language
		 * by providing its ZObject internal table id
		 *
		 * @param {number} alias
		 * @param {string} language
		 */
		removeAlias: function ( alias, language ) {
			this.removeZObjectChildren( alias );
			this.removeZObject( alias );

			const aliasListId = this.getLanguageAliasStringsetId( language );
			this.recalculateZListIndex( aliasListId );
		},
		/**
		 * Add an alias in a language. The language already exists for
		 * labels, but there might or might not already exists aliases or
		 * even an alias block for this language.
		 *
		 * @param {string} language
		 */
		addAliasForLanguage: function ( language ) {
			const existingAliasId = this.getLanguageAliasStringsetId( language ),
				nextId = this.getNextObjectId;

			if ( existingAliasId ) {
				// If the monolingualStringSet for the given language exists,
				// add one more string to the list.
				const nextIndexLanguageAliases = this.getLanguageAliases( language ).length + 1;

				const payload = {
					key: nextIndexLanguageAliases.toString(),
					value: 'object',
					parent: existingAliasId
				};

				this.addZObject( payload );
				this.addZString( { id: nextId } );

			} else {
				// If the monolingualStringSet for the given language does not exist,
				// create a monolingualStringSet object with an empty array of strings
				// and add it to the list.
				const nextIndexAliases = this.getZObjectAliases.length + 1;
				const multilingualAliasesId = this.getNestedZObjectById( this.zObjectAliasId, [
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				] ).id;

				const payload = {
					key: nextIndexAliases.toString(),
					value: 'object',
					parent: multilingualAliasesId
				};

				this.addZObject( payload );
				this.injectZObject( {
					zobject: {
						Z1K1: Constants.Z_MONOLINGUALSTRINGSET,
						Z31K1: language,
						Z31K2: [ Constants.Z_STRING, '' ]
					},
					key: nextIndexAliases.toString(),
					id: nextId,
					parent: multilingualAliasesId
				} );
			}
		}
	} ),
	watch: {
		showMoreLanguages: {
			immediate: true,
			handler: function () {
				mw.storage.set( 'aw-showMoreLanguages', this.showMoreLanguages );
			}
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-labelsblock {
	.ext-wikilambda-labelsblock--alias-string {
		color: #888;
		margin: 10px 0;
	}

	table {
		width: 100%;
		margin: 0;
		padding: 0;
		border: 1px solid #aaa;
		background: #fbfbfb;

		th {
			background: #eaecf0;
		}

		td {
			padding: 4px;
			vertical-align: top;
		}

		tr:nth-child( even ) {
			background: #f0f0f0;
		}

		td,
		td * {
			word-wrap: none;
			overflow: elipsis;
		}
	}
}
</style>
