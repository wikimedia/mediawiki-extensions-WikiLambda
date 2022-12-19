<template>
	<!--
		WikiLambda Vue component for setting the aliases of a ZFunction in the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-aliases">
		<div class="ext-wikilambda-function-definition-aliases__label">
			<label
				id="ext-wikilambda-function-definition-aliases__inputs-label"
				class="ext-wikilambda-app__text-regular"
			>
				{{ functionAliasLabel }}
			</label>
			<!-- TODO (T298479): replace href with correct URL -->
			<a
				v-if="isMainZObject"
				href="#"
				class="ext-wikilambda-app__text-smaller"
			>
				{{ $i18n( "wikilambda-function-definition-alias-example" ) }}
			</a>
		</div>
		<div
			class="ext-wikilambda-function-definition-aliases__inputs"
			aria-labelledby="ext-wikilambda-function-definition-aliases__inputs-label">
			<chips
				:chips="getCurrentLanguageAliases"
				:input-placeholder="functionDefinitionAliasPlaceholder"
				:input-aria-label="$i18n( 'wikilambda-function-definition-alias-label-new' )"
				@add-chip="addAliasForLanguage"
				@edit-chip="updateAlias"
				@remove-chip="removeAlias"
			>
			</chips>
			<p
				v-if="repeatAlias"
				class="ext-wikilambda-function-definition-aliases__error"
			>
				{{ $i18n( "wikilambda-metadata-duplicate-alias-error", repeatAlias ) }}
			</p>
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
		isMainZObject: {
			type: Boolean
		},
		/**
		 * zID of item label language
		 *
		 * @example Z1014
		 */
		zLang: {
			type: String,
			required: true
		}
	},
	data: function () {
		return {
			repeatAlias: null
		};
	},
	computed: $.extend(
		mapGetters( [
			'getAllItemsFromListById',
			'getZObjectChildrenById',
			'getNestedZObjectById',
			'getNextObjectId',
			'getCurrentZLanguage',
			'getZObjectById'
		] ),
		{
			zMultilingualStringsetValueId: function () {
				return this.getNestedZObjectById( this.zobjectId, [
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				] ).id;
			},
			getZObjectAliases: function () {
				return this.getAllItemsFromListById( this.zMultilingualStringsetValueId );
			},
			getZObjectAliasObject: function () {
				return this.getZObjectAliases.map(
					function ( alias ) {
						return this.getZObjectChildrenById( alias.id );
					}.bind( this )
				);
			},
			getCurrentLanguageAliases: function () {
				var lang = this.zLang;
				for ( var index in this.getZObjectAliasObject ) {
					var alias = this.getZObjectAliasObject[ index ],
						language = this.getNestedZObjectById(
							this.findKeyInArray( Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE, alias ).id,
							[ Constants.Z_REFERENCE_ID ]
						);

					if ( language.value === lang ) {
						return this.getAllItemsFromListById(
							this.findKeyInArray( Constants.Z_MONOLINGUALSTRINGSET_VALUE, alias ).id
						).map( function ( aliasString ) {
							return this.getNestedZObjectById( aliasString.id, [
								Constants.Z_STRING_VALUE
							] );
						}.bind( this ) );
					}
				}
				return [];
			},
			functionAliasLabel: function () {
				return (
					this.$i18n( 'wikilambda-function-definition-alias-label' ) +
					' (' +
					this.$i18n( 'wikilambda-optional' ) +
					') '
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
			'removeZObject',
			'recalculateZListIndex'
		] ),
		{
			getLanguageAliasStringsetId: function ( language ) {
				const aliasFound = this.getZObjectAliases.find( ( alias ) => {
					const aliasLang = this.getNestedZObjectById( alias.id, [
						Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE,
						Constants.Z_REFERENCE_ID
					] );
					return aliasLang.value === language;
				} );

				return aliasFound && ( this.getNestedZObjectById( aliasFound.id, [
					Constants.Z_MONOLINGUALSTRINGSET_VALUE
				] ).id );
			},
			addAliasForLanguage: function ( newAlias ) {
				// show an error message if a user enters a duplicate alias
				// TODO (T317990): should duplication be case sensitive?
				if ( this.getCurrentLanguageAliases.some( ( alias ) => alias.value === newAlias ) ) {
					this.repeatAlias = newAlias;
					return;
				}
				// clear the error message
				this.clearAliasError();

				var language = this.zLang;

				var existingAliasId = this.getLanguageAliasStringsetId( language ),
					nextId = this.getNextObjectId,
					payload;

				if ( existingAliasId ) {
					payload = {
						key: ( this.getAllItemsFromListById( existingAliasId ).length + 1 ).toString(),
						value: newAlias,
						parent: existingAliasId
					};

					this.addZObject( payload );
					this.addZString( {
						id: nextId,
						value: newAlias
					} );
				} else {
					// If the monolingualStringSet for the given language does not exist,
					// create a monolingualStringSet object with an empty array of strings
					// and add it to the list.
					const nextIndexAliases = this.getZObjectAliases.length + 1;

					payload = {
						key: nextIndexAliases.toString(),
						value: 'object',
						parent: this.zMultilingualStringsetValueId
					};

					this.addZObject( payload );
					this.injectZObject( {
						zobject: {
							Z1K1: Constants.Z_MONOLINGUALSTRINGSET,
							Z31K1: language,
							Z31K2: [ Constants.Z_STRING, newAlias ]
						},
						key: nextIndexAliases.toString(),
						id: nextId,
						parent: this.zMultilingualStringsetValueId
					} );
				}
				this.$emit( 'updated-alias' );
			},
			updateAlias: function ( aliasStringValueId, value ) {
				this.clearAliasError();
				var payload = {
					id: aliasStringValueId,
					value: value
				};
				this.setZObjectValue( payload );
				this.$emit( 'updated-alias' );
			},
			removeAlias: function ( aliasStringValueId ) {
				this.clearAliasError();
				const aliasStringObject = this.getZObjectById( this.getZObjectById( aliasStringValueId ).parent );
				const aliasStringSetId = aliasStringObject.parent;
				this.removeZObjectChildren( aliasStringObject.id );
				this.removeZObject( aliasStringObject.id );
				this.recalculateZListIndex( aliasStringSetId );
				this.$emit( 'updated-alias' );
			},
			clearAliasError: function () {
				this.repeatAlias = null;
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
	}

	&__error {
		color: @wmui-color-red50;
	}

	&__label {
		display: flex;
		flex-direction: column;
		width: 153px;
	}

	@media screen and ( max-width: @width-breakpoint-tablet ) {
		& {
			flex-direction: column;
		}
	}
}
</style>
