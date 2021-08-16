<template>
	<div class="ext-wikilambda-metadata">
		<table>
			<thead>
				<tr>
					<th>Language</th>
					<th>Label</th>
					<!-- <th>Description</th> -->
					<th>Also known as</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="language in selectedLanguages" :key="language.Z9K1">
					<td>
						<button
							v-if="!viewmode"
							@click="removeLang( language.Z9K1 )"
						>
							{{ $i18n( 'wikilambda-editor-removeitem' ) }}
						</button>
						{{ getAllLangs[ language.Z9K1 ] }}
					</td>
					<td>
						<z-string
							:zobject-id="getLanguageLabelStringId( language.Z9K1 )"
						></z-string>
					</td>
					<!-- <td></td> -->
					<td>
						<div v-for="( alias, index ) in getLanguageAliases( language.Z9K1 )" :key="index">
							<button
								v-if="!viewmode"
								@click="removeAlias( alias )"
							>
								{{ $i18n( 'wikilambda-editor-removeitem' ) }}
							</button>
							<z-string
								:zobject-id="alias"
							></z-string>
						</div>
						<div v-if="!viewmode">
							<button
								@click="addAliasForLanguage( language.Z9K1 )"
							>
								{{ $i18n( 'wikilambda-editor-additem' ) }}
							</button> Add Alias
						</div>
					</td>
				</tr>
			</tbody>
		</table>
		<add-language-dropdown
			v-if="!viewmode"
			:used-languages="selectedLanguages"
			@change="addNewLang"
		></add-language-dropdown>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	AddLanguageDropdown = require( '../base/AddLanguageDropdown.vue' ),
	ZString = require( './ZString.vue' );

module.exports = {
	components: {
		'add-language-dropdown': AddLanguageDropdown,
		'z-string': ZString
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
	computed: $.extend( mapGetters( [
		'getZObjectAsJsonById',
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getZkeyLabels',
		'getAllLangs',
		'getNextObjectId'
	] ), {
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
					Z1K1: 'Z9',
					Z9K1: languageCode
				};
			} );
		},
		getZObjectAliases: function () {
			return this.getZObjectChildrenById(
				this.getNestedZObjectById( this.zobjectId, [
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				] ).id );
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
		addNewLang: function ( event ) {
			var lang = event.target.value,
				zLabelParentId = this.findKeyInArray(
					Constants.Z_MULTILINGUALSTRING_VALUE,
					this.getZObjectChildrenById( this.zObjectLabelId )
				).id,
				payload = {
					lang: lang,
					parentId: zLabelParentId
				};
			this.addZMonolingualString( payload );
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
						Z1K1: 'Z31',
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
	} )
};
</script>

<style lang="less">
.ext-wikilambda-metadata {
	table {
		width: 600px;
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
