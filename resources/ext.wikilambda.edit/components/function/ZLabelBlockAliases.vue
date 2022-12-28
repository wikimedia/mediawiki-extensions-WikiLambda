<template>
	<!--
		WikiLambda Vue component for the collection of label aliases of ZPersistent objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<div v-for="( alias, index ) in languageAliases" :key="index">
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
				@click="addAliasForLanguage"
			>
				{{ $i18n( 'wikilambda-editor-additem' ).text() }}
			</cdx-button> {{ $i18n( 'wikilambda-metadata-add-alias' ).text() }}
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	ZString = require( '../types/ZString.vue' );

// @vue/component
module.exports = exports = {
	components: {
		'cdx-button': CdxButton,
		'z-string': ZString
	},
	inject: {
		viewmode: { default: false }
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		zObjectAliasId: {
			type: Number,
			required: true
		},
		language: {
			type: Object,
			required: true
		},
		languageAliases: {
			type: Array,
			required: true
		}
	},
	computed: $.extend( mapGetters( [
		'getAllItemsFromListById',
		'getNestedZObjectById',
		'getNextObjectId'
	] ), {
		Constants: function () {
			return Constants;
		},
		/**
		 * Returns the table ID of the MonolingualStringSet Value
		 * containing the list of aliases for a given language
		 *
		 * @return {string}
		 */
		getLanguageAliasStringsetId: function () {
			const aliasForLang = this.getZObjectAliases.find( function ( alias ) {
				const aliasLang = this.getNestedZObjectById( alias.id, [
					Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE,
					Constants.Z_REFERENCE_ID
				] );
				return ( aliasLang.value === this.getLanguageWithReference );
			}.bind( this ) );

			return aliasForLang && aliasForLang.id ?
				this.getNestedZObjectById( aliasForLang.id, [ Constants.Z_MONOLINGUALSTRINGSET_VALUE ] ).id :
				null;
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
		getLanguageWithReference: function () {
			return this.language[ Constants.Z_REFERENCE_ID ];
		}
	} ),
	methods: $.extend( mapActions( [
		'addZObject',
		'addZString',
		'injectZObject',
		'removeZObjectChildren',
		'removeZObject',
		'recalculateZListIndex'
	] ), {
		/**
		 * Returns the list of elements contained in the
		 * MonolingualStringSet value typed list of strings
		 * for a given language.
		 *
		 * @return {Array}
		 */
		getLanguageAliases: function () {
			const aliases = this.getAllItemsFromListById( this.getLanguageAliasStringsetId );
			return aliases.map( function ( alias ) {
				return alias.id;
			} );
		},
		/**
		 * Remove one alias from the alias list of a given language
		 * by providing its ZObject internal table id
		 *
		 * @param {number} alias
		 */
		removeAlias: function ( alias ) {
			this.removeZObjectChildren( alias );
			this.removeZObject( alias );

			this.recalculateZListIndex( this.getLanguageAliasStringsetId );

			// If we removed the last alias, delete the Z31 empty alias block.
			if ( this.languageAliases.length === 1 ) {
				var monoLingualStringSetId = this.getAllItemsFromListById(
					this.getNestedZObjectById( this.zobjectId, [
						Constants.Z_PERSISTENTOBJECT_ALIASES,
						Constants.Z_MULTILINGUALSTRINGSET_VALUE
					] ).id )[ 0 ].id;
				this.removeZObject( monoLingualStringSetId );
			}
		},
		/**
		 * Add an alias in a language. The language already exists for
		 * labels, but there might or might not already exists aliases or
		 * even an alias block for this language.
		 *
		 */
		addAliasForLanguage: function () {
			const nextId = this.getNextObjectId;

			if ( this.languageAliases.length > 0 && this.getLanguageAliasStringsetId ) {
				// If the monolingualStringSet for the given language exists,
				// add one more string to the list.
				const nextIndexLanguageAliases = this.getLanguageAliases( this.getLanguageWithReference ).length + 1;

				const payload = {
					key: nextIndexLanguageAliases.toString(),
					value: 'object',
					parent: this.getLanguageAliasStringsetId
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
						Z31K1: this.getLanguageWithReference,
						Z31K2: [ Constants.Z_STRING, '' ]
					},
					key: nextIndexAliases.toString(),
					id: nextId,
					parent: multilingualAliasesId
				} );
			}
		}
	} )
};
</script>
