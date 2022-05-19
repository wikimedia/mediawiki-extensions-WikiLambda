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
			:quiet="true"
			v-model="showMoreLanguages"
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
									@click="removeAlias( alias )"
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
					:quiet="true"
					v-model="showAllSelectedLanguages"
					@update:model-value="onUpdate"
				>
					{{ showAllSelectedLanguagesLabel }}
				</cdx-toggle-button>
			</div>
			<z-object-selector
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
			if ( this.zObjectLabels.Z12K1 ) {
				this.zObjectLabels.Z12K1.forEach( function ( label ) {
					languageList.push( label.Z11K1.Z9K1 );
				} );
			}

			// Don't break if the aliases are set to {}
			if ( this.zObjectAliases.Z32K1 ) {
				this.zObjectAliases.Z32K1.forEach( function ( alias ) {
					var lang = alias.Z31K1.Z9K1;

					if ( languageList.indexOf( lang ) === -1 ) {
						languageList.push( lang );
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
		getZObjectAliases: function () {
			return this.getZObjectChildrenById(
				this.getNestedZObjectById( this.zobjectId, [
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				] ).id );
		},
		userLangAliasString: function () {
			var str = '';

			this.getLanguageAliases( this.getUserZlangZID )
				.forEach( function ( aliasId ) {
					var alias = this.getNestedZObjectById( aliasId, [
						Constants.Z_STRING_VALUE
					] );

					if ( str.length ) {
						str += '  |  ' + alias.value;
					} else {
						str = alias.value;
					}
				}.bind( this ) );

			return str;
		}
	} ),
	methods: $.extend( mapActions( [
		'addZMonolingualString',
		'addZObject',
		'addZString',
		'injectZObject',
		'removeZObjectChildren',
		'removeZObject'
	] ), {
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
		getLanguageLabel: function ( language ) {
			var monolingualString;

			this.zObjectLabels.Z12K1.forEach( function ( label ) {
				if ( label.Z11K1.Z9K1 === language ) {
					monolingualString = label.Z11K2.Z6K1;
				}
			} );

			return monolingualString;
		},
		getLanguageAliasId: function ( language ) {
			var aliasId;

			this.getZObjectAliases.forEach( function ( alias ) {
				var aliasLang = this.getNestedZObjectById( alias.id, [
					Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE,
					Constants.Z_REFERENCE_ID
				] );

				if ( aliasLang.value === language ) {
					aliasId = alias.id;
				}
			}.bind( this ) );

			return aliasId;
		},
		getLanguageAliasStringsetId: function ( language ) {
			var aliasId;

			this.getZObjectAliases.forEach( function ( alias ) {
				var aliasLang = this.getNestedZObjectById( alias.id, [
					Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE,
					Constants.Z_REFERENCE_ID
				] );

				if ( aliasLang.value === language ) {
					aliasId = this.getNestedZObjectById( alias.id, [
						Constants.Z_MONOLINGUALSTRINGSET_VALUE
					] ).id;
				}
			}.bind( this ) );

			return aliasId;
		},
		getLanguageAliases: function ( language ) {
			return this.getZObjectChildrenById( this.getLanguageAliasStringsetId( language ) ).map( function ( alias ) {
				return alias.id;
			} );
		},
		addNewLang: function ( zId ) {
			if ( !zId ) {
				return;
			}

			var lang = zId,
				zLabelParentId = this.findKeyInArray(
					Constants.Z_MULTILINGUALSTRING_VALUE,
					this.getZObjectChildrenById( this.zObjectLabelId )
				).id,
				payload = {
					lang: lang,
					parentId: zLabelParentId
				};
			this.addZMonolingualString( payload );

			this.showAllSelectedLanguages = true;

			this.selectedLang = zId;
		},
		removeLang: function ( language ) {
			var labelId = this.getLanguageLabelId( language ),
				aliasId = this.getLanguageAliasId( language );

			this.removeZObjectChildren( labelId );
			this.removeZObject( labelId );

			if ( aliasId ) {
				this.removeZObjectChildren( aliasId );
				this.removeZObject( aliasId );
			}
		},
		removeAlias: function ( alias ) {
			this.removeZObjectChildren( alias );
			this.removeZObject( alias );
		},
		addAliasForLanguage: function ( language ) {
			var existingAliasId = this.getLanguageAliasStringsetId( language ),
				nextId = this.getNextObjectId,
				payload;

			if ( existingAliasId ) {
				payload = {
					key: this.getLanguageAliases( language ).length,
					value: 'object',
					parent: existingAliasId
				};

				this.addZObject( payload );
				this.addZString( {
					id: nextId
				} );
			} else {
				var key = this.getZObjectAliases.length.toString();
				payload = {
					key: key,
					value: 'object',
					parent: this.getNestedZObjectById( this.zObjectAliasId, [
						Constants.Z_MULTILINGUALSTRINGSET_VALUE
					] ).id
				};

				this.addZObject( payload );
				this.injectZObject( {
					zobject: {
						Z1K1: Constants.Z_MONOLINGUALSTRINGSET,
						Z31K1: language,
						Z31K2: [
							''
						]
					},
					key: key,
					id: nextId,
					parent: this.getNestedZObjectById( this.zObjectAliasId, [
						Constants.Z_MULTILINGUALSTRINGSET_VALUE
					] ).id
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
