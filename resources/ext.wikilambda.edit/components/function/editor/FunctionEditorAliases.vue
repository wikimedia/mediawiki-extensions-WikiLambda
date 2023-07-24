<!--
	WikiLambda Vue component for setting the aliases of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-definition-aliases">
		<div class="ext-wikilambda-function-definition-aliases__label">
			<label
				id="ext-wikilambda-function-definition-aliases__inputs-label"
				class="ext-wikilambda-app__text-regular"
			>
				<!-- TODO: Instead fetch this from the Z2 via `getLabel( Constants.Z_PERSISTENTOBJECT_ALIASES )` -->
				{{ $i18n( 'wikilambda-function-definition-alias-label' ).text() }}
				<span>{{ $i18n( 'parentheses', [ $i18n( 'wikilambda-optional' ).text() ] ).text() }}</span>
			</label>
			<span class="ext-wikilambda-function-definition-aliases__description">
				{{ $i18n( 'wikilambda-function-definition-alias-description' ).text() }}
			</span>
		</div>
		<div
			class="ext-wikilambda-function-definition-aliases__inputs"
			aria-labelledby="ext-wikilambda-function-definition-aliases__inputs-label">
			<wl-chips-container
				:chips="getCurrentLanguageAliases"
				:input-placeholder="functionDefinitionAliasPlaceholder"
				:input-aria-label="$i18n( 'wikilambda-function-definition-alias-label-new' )"
				@add-chip="addAliasForLanguage"
				@edit-chip="updateAlias"
				@remove-chip="removeAlias"
			></wl-chips-container>
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
	name: 'wl-function-editor-aliases',
	components: {
		// TODO: replace with codex filter chip when available
		'wl-chips-container': ChipContainer
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			default: 0
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
			'getRowById',
			'getParentRowId'
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
			'changeType',
			'setZObjectValue',
			'removeItemFromTypedList'
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
				var existingAliasId = this.getLanguageAliasStringsetId( language );

				if ( existingAliasId ) {
					// If monolingual string set for the given language exists,
					// add new string to the list.
					this.changeType( {
						type: Constants.Z_STRING,
						id: existingAliasId,
						value: newAlias,
						append: true
					} );
				} else {
					// If the monolingualStringSet for the given language does not exist,
					// create a monolingualStringSet object with an empty array of strings
					// and add it to the list.
					this.changeType( {
						type: Constants.Z_MONOLINGUALSTRINGSET,
						id: this.zMultilingualStringsetValueId,
						value: [ newAlias ],
						lang: language,
						append: true
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
				const aliasStringObject = this.getRowById( this.getParentRowId( aliasStringValueId ) );
				this.removeItemFromTypedList( { rowId: aliasStringObject.id } );
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
	margin-bottom: @spacing-150;

	&__error {
		color: @color-error;
	}

	&__label {
		display: flex;
		flex-direction: column;
		width: @wl-field-label-width;
		margin-right: @spacing-150;

		& > label {
			line-height: @size-200;
			font-weight: @font-weight-bold;

			& > span {
				font-weight: @font-weight-normal;
			}
		}
	}

	&__description {
		opacity: 0.8;
		color: @color-subtle;
		font-size: @wl-font-size-description;
		line-height: @wl-line-height-description;
		display: inline-block;
	}

	/* MOBILE styles */
	@media screen and ( max-width: @width-breakpoint-tablet ) {
		& {
			flex-direction: column;

			&__inputs {
				width: 100%;
			}

			&__label {
				width: auto;

				& > label {
					line-height: inherit;
				}
			}

			&__description {
				font-size: @wl-font-size-description-mobile;
				line-height: @wl-line-height-description-mobile;
				letter-spacing: @wl-letter-spacing-description-mobile;
				margin-bottom: @spacing-50;
			}
		}
	}
}
</style>
