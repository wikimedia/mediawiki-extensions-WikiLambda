<template>
	<!--
		WikiLambda Vue component for setting the aliases of a ZFunction in the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-aliases">
		<div class="ext-wikilambda-function-definition-aliases__label">
			<label
				for="ext-wikilambda-function-definition-aliases__input"
				class="ext-wikilambda-app__text-regular"
			>
				{{ functionAliasLabel }}
			</label>
			<!-- TODO (T298479): replace href with correct URL -->
			<a href="#" class="ext-wikilambda-app__text-smaller">
				{{ $i18n( "wikilambda-function-definition-alias-example" ) }}
			</a>
		</div>

		<div class="ext-wikilambda-function-definition-aliases__inputs">
			<chips
				:chips="getFilteredCurrentLanguageAliases"
				:input-placeholder="functionDefinitionAliasPlaceholder"
				:input-aria-label="$i18n( 'wikilambda-function-definition-alias-label' )"
				@add-chip="addAliasForLanguage"
				@edit-chip="updateAlias"
				@remove-chip="removeAlias"
			>
			</chips>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	mapActions = require( 'vuex' ).mapActions,
	ChipContainer = require( '../../base/ChipContainer.vue' );

// @vue/component
module.exports = exports = {
	name: 'function-definition-aliases',
	components: {
		chips: ChipContainer
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			default: 0
		},
		zLang: {
			type: String,
			required: true
		}
	},
	computed: $.extend(
		mapGetters( [
			'getZObjectChildrenById',
			'getNestedZObjectById',
			'getNextObjectId',
			'getCurrentZLanguage'
		] ),
		{
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zObjectAliasId: function () {
				return this.findKeyInArray( Constants.Z_PERSISTENTOBJECT_ALIASES, this.zobject ).id;
			},
			getZObjectAliases: function () {
				return this.getZObjectChildrenById(
					this.getNestedZObjectById( this.zobjectId, [
						Constants.Z_PERSISTENTOBJECT_ALIASES,
						Constants.Z_MULTILINGUALSTRINGSET_VALUE
					] ).id
				);
			},
			getZObjectAliasObject: function () {
				return this.getZObjectChildrenById(
					this.getNestedZObjectById( this.zobjectId, [
						Constants.Z_PERSISTENTOBJECT_ALIASES,
						Constants.Z_MULTILINGUALSTRINGSET_VALUE
					] ).id ).map(
					function ( alias ) {
						return this.getZObjectChildrenById( alias.id );
					}.bind( this )
				);
			},
			/* this function is necessary because 'getCurrentLanguageAliases' returns a list
			that contains the value 'false' for aliases that have been removed. Better pratice
			would likely be to not return any value in this case and we will no longer have to filter */
			getFilteredCurrentLanguageAliases: function () {
				// this will be false before any data is loaded
				if ( Array.isArray( this.getCurrentLanguageAliases ) ) {
					return this.getCurrentLanguageAliases.filter( function ( alias ) {
						return alias.value !== undefined;
					} );
				}
				return [];
			},
			getCurrentLanguageAliases: function () {
				var lang = this.zLang || this.getCurrentZLanguage;
				for ( var index in this.getZObjectAliasObject ) {
					var alias = this.getZObjectAliasObject[ index ],
						language = this.getNestedZObjectById(
							this.findKeyInArray( Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE, alias ).id,
							[ Constants.Z_REFERENCE_ID ]
						);
					if ( language.value === lang ) {
						return this.getZObjectChildrenById(
							this.findKeyInArray( Constants.Z_MONOLINGUALSTRINGSET_VALUE, alias ).id
						).map( function ( aliasString ) {
							return this.getNestedZObjectById( aliasString.id, [
								Constants.Z_STRING_VALUE
							] );
						}.bind( this ) );
					}
				}
				return false;
			},
			functionAliasLabel: function () {
				return (
					this.$i18n( 'wikilambda-function-definition-alias-label' ) +
					' ( ' +
					this.$i18n( 'wikilambda-optional' ) +
					' ) '
				);
			},
			functionDefinitionAliasPlaceholder: function () {
				if (
					this.getCurrentLanguageAliases.length > 0 &&
					!this.getCurrentLanguageAliases[ 0 ] === false
				) {
					return null;
				}
				return this.$i18n( 'wikilambda-function-definition-alias-placeholder' ).text();
			}
		}
	),
	methods: $.extend(
		mapActions( [
			'setZObjectValue',
			'addZObject',
			'addZString',
			'injectZObject',
			'removeZObjectChildren',
			'removeZObject'
		] ),
		{
			getLanguageAliasStringsetId: function ( language ) {
				var aliasId;
				this.getZObjectAliases.forEach(
					function ( alias ) {
						var aliasLang = this.getNestedZObjectById( alias.id, [
							Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE,
							Constants.Z_REFERENCE_ID
						] );
						if ( aliasLang.value === language ) {
							aliasId = this.getNestedZObjectById( alias.id, [
								Constants.Z_MONOLINGUALSTRINGSET_VALUE
							] ).id;
						}
					}.bind( this )
				);
				return aliasId;
			},
			getLanguageAliases: function ( language ) {
				return this.getZObjectChildrenById(
					this.getLanguageAliasStringsetId( language ) ).map( function ( alias ) {
					return alias.id;
				} );
			},
			addAliasForLanguage: function ( newAlias ) {
				var language = this.zLang || this.getCurrentZLanguage;
				var existingAliasId = this.getLanguageAliasStringsetId( language ),
					nextId = this.getNextObjectId,
					payload;

				if ( existingAliasId ) {
					payload = {
						key: this.getLanguageAliases( language ).length,
						value: newAlias,
						parent: existingAliasId
					};

					this.addZObject( payload );
					this.addZString( {
						id: nextId,
						value: newAlias
					} );
				} else {
					var key = this.getZObjectAliases.length.toString();
					payload = {
						key: key,
						value: newAlias,
						parent: this.getNestedZObjectById( this.zObjectAliasId, [
							Constants.Z_MULTILINGUALSTRINGSET_VALUE
						] ).id
					};

					this.addZObject( payload );
					this.injectZObject( {
						zobject: {
							Z1K1: Constants.Z_MONOLINGUALSTRINGSET,
							Z31K1: language,
							Z31K2: [ newAlias ]
						},
						key: key,
						id: nextId,
						parent: this.getNestedZObjectById( this.zObjectAliasId, [
							Constants.Z_MULTILINGUALSTRINGSET_VALUE
						] ).id
					} );
				}
			},
			updateAlias: function ( aliasId, value ) {
				var payload = {
					id: aliasId,
					value: value
				};
				this.setZObjectValue( payload );
			},
			removeAlias: function ( index ) {
				this.removeZObjectChildren( index );
				this.removeZObject( index );
			}
		}
	)
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-definition-aliases {
	display: flex;
	margin-bottom: 26px;

	&__inputs {
		width: 300px;
		border: 1px solid @wmui-color-base30;
		border-radius: 2px;
		display: flex;
		padding: 4px 6px;
		overflow: auto;
		// TODO: check with @aishwarya - this is a significantly bigger height than the other
		// inputs but is much easier ot read the chips
		height: 35px;
	}

	&__label {
		display: flex;
		flex-direction: column;
		width: 153px;
	}
}
</style>
