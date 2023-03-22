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
			<table :aria-label="$i18n( 'wikilambda-metadata-labels-table-label' ).text()">
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
					<tr v-for="language in displayedSelectedLanguages" :key="language[ Constants.Z_REFERENCE_ID ]">
						<td>
							<cdx-button
								v-if="!viewmode"
								action="destructive"
								@click="removeLang( language[ Constants.Z_REFERENCE_ID ] )"
							>
								{{ $i18n( 'wikilambda-editor-removeitem' ).text() }}
							</cdx-button>
							{{ getZkeyLabels[ language[ Constants.Z_REFERENCE_ID ] ] }}
						</td>
						<td>
							<wl-z-string
								:zobject-id="getLanguageLabelStringId( language[ Constants.Z_REFERENCE_ID ] )"
							></wl-z-string>
						</td>
						<td>
							<wl-z-label-block-aliases
								:zobject-id="zobjectId"
								:language="language"
								:language-aliases="getLanguageAliases( language[ Constants.Z_REFERENCE_ID ] )"
								:z-object-alias-id="zObjectAliasId"
							></wl-z-label-block-aliases>
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
			<wl-z-object-selector
				v-if="!viewmode"
				ref="languageSelector"
				:used-languages="selectedLanguages"
				:type="Constants.Z_NATURAL_LANGUAGE"
				:selected-id="selectedLang"
				@input="addNewLang"
			></wl-z-object-selector>
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
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	ZLabelBlockAliases = require( '../function/ZLabelBlockAliases.vue' );

// @vue/component
module.exports = exports = {
	components: {
		'cdx-button': CdxButton,
		'cdx-toggle-button': CdxToggleButton,
		'wl-z-string': ZString,
		'wl-z-object-selector': ZObjectSelector,
		'wl-z-label-block-aliases': ZLabelBlockAliases
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
		'changeType',
		'removeZObjectChildren',
		'removeZObject',
		'recalculateZListIndex',
		'setIsZObjectDirty'
	] ), {
		/**
		 * Returns the internal Id that identifies the
		 * Monolingual String object for a given language Zid
		 *
		 * @param {string} language
		 * @return {string}
		 */
		getLanguageLabelId: function ( language ) {
			const labels = this.getZObjectChildrenById(
				this.getNestedZObjectById( this.zobjectId, [
					Constants.Z_PERSISTENTOBJECT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				] ).id
			);

			const labelFound = labels.find( function ( label ) {
				const labelLang = this.getNestedZObjectById( label.id, [
					Constants.Z_MONOLINGUALSTRING_LANGUAGE,
					Constants.Z_REFERENCE_ID
				] );

				return labelLang.value === language;
			}.bind( this ) );
			return labelFound && labelFound.id;
		},
		/**
		 * Returns the internal Id that identifies the string
		 * object with the label value for a given language Zid.
		 *
		 * @param {string} language
		 * @return {string}
		 */
		getLanguageLabelStringId: function ( language ) {
			const labelId = this.getLanguageLabelId( language );
			if ( !labelId ) {
				return null;
			}
			return this.getNestedZObjectById( labelId, [
				Constants.Z_MONOLINGUALSTRING_VALUE
			] ).id;
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

			const zLabelParentId = this.findKeyInArray(
				Constants.Z_MULTILINGUALSTRING_VALUE,
				this.getZObjectChildrenById( this.zObjectLabelId )
			).id;

			this.changeType( {
				type: Constants.Z_MONOLINGUALSTRING,
				lang: langZid,
				id: zLabelParentId,
				append: true
			} );
			this.setIsZObjectDirty( true );
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
			this.setIsZObjectDirty( true );
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
