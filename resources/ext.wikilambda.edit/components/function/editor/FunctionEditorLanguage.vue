<template>
	<!--
		WikiLambda Vue component for the selection of a ZNaturalLanguage object inside the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div
		class="ext-wikilambda-language-selector"
		data-testid="function-editor-language-selector">
		<div class="ext-wikilambda-language-selector__label">
			<label
				id="ext-wikilambda-language-selector__add-language-label"
				class="ext-wikilambda-app__text-regular">
				{{ $i18n( 'wikilambda-languagelabel' ).text() }}
			</label>
		</div>
		<wl-z-object-selector
			ref="languageSelector"
			class="ext-wikilambda-language-selector__add-language"
			aria-labelledby="ext-wikilambda-language-selector__add-language-label"
			:exclude-zids="currentZObjectLanguages"
			:selected-zid="zLanguage"
			:type="Constants.Z_NATURAL_LANGUAGE"
			@input="addNewLang"
			@focus-out="clearLookupToFallback"
		></wl-z-object-selector>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	ZObjectSelector = require( '../../ZObjectSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	mapMutations = require( 'vuex' ).mapMutations;

// @vue/component
module.exports = exports = {
	name: 'wl-function-editor-language',
	components: {
		'wl-z-object-selector': ZObjectSelector
	},
	props: {
		zLanguage: {
			type: String,
			default: ''
		}
	},
	emits: [ 'change' ],
	computed: $.extend( mapGetters( [
		'currentZObjectLanguages',
		'getNestedZObjectById',
		'getAllItemsFromListById'
	] ), {
		Constants: function () {
			return Constants;
		}
	} ),
	methods: $.extend( {}, mapActions( [
		'changeType',
		'removeItemFromTypedList'
	] ),
	mapMutations( [
		'setActiveLangSelection'
	] ),
	{
		setLocalZLanguage: function ( lang ) {
			this.resetPreviousLangForSelection( this.zLanguage );
			this.setActiveLangSelection( lang );
			this.$emit( 'change', lang );
		},
		addNewLang: function ( zId ) {
			if ( !zId || this.isSelectedLang( zId ) ) {
				return;
			}

			const zLabelParentId = this.getNestedZObjectById( 0, [
				Constants.Z_PERSISTENTOBJECT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			] ).id;

			this.changeType( {
				type: Constants.Z_MONOLINGUALSTRING,
				lang: zId,
				id: zLabelParentId,
				append: true
			} );

			this.setLocalZLanguage( zId );
		},
		isSelectedLang: function ( zId ) {
			return this.currentZObjectLanguages.some( ( zObjLang ) =>
				zObjLang[ Constants.Z_REFERENCE_ID ] === zId );
		},
		/**
		 * Returns the internal Id that identifies the
		 * Monolingual String object for a given language Zid
		 *
		 * @param {string} language
		 * @return {string}
		 */
		getLanguageLabelId: function ( language ) {
			const labels = this.getAllItemsFromListById(
				this.getNestedZObjectById( 0, [
					Constants.Z_PERSISTENTOBJECT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				] ).id
			);

			const labelFound = labels.find( ( label ) => {
				var labelLang = this.getNestedZObjectById( label.id, [
					Constants.Z_MONOLINGUALSTRING_LANGUAGE,
					Constants.Z_REFERENCE_ID
				] );

				return labelLang.value === language;
			} );
			return labelFound && labelFound.id;
		},
		resetArgumentListLabelsForLang: function ( language ) {
			var argumentsList = this.getAllItemsFromListById(
				this.getNestedZObjectById( 0, [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_ARGUMENTS
				] ).id );

			argumentsList.forEach( function ( argument ) {
				var argumentLabelArrayId = this.getNestedZObjectById( argument.id, [
					Constants.Z_ARGUMENT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE ] ).id;
				var argumentLabelArray = this.getAllItemsFromListById( argumentLabelArrayId );

				argumentLabelArray.forEach( function ( label ) {
					var labelLang = this.getNestedZObjectById( label.id, [
						Constants.Z_MONOLINGUALSTRING_LANGUAGE,
						Constants.Z_REFERENCE_ID
					] );

					if ( labelLang.value === language ) {
						this.removeItemFromTypedList( { rowId: label.id } );
					}
				}.bind( this ) );
			}.bind( this ) );
		},
		resetNameLabelForLang: function ( zId ) {
			var labelId = this.getLanguageLabelId( zId );
			this.removeItemFromTypedList( { rowId: labelId } );
		},
		resetPreviousLangForSelection: function ( zId ) {
			this.resetArgumentListLabelsForLang( zId );
			this.resetNameLabelForLang( zId );
		},
		clearLookupToFallback: function () {
			this.$refs.languageSelector.clearResults();
		}
	}, {
		isSelectedLang: function ( zId ) {
			return this.currentZObjectLanguages.some( ( zObjLang ) => zObjLang[ Constants.Z_REFERENCE_ID ] === zId );
		}
	} )
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-language-selector {
	display: flex;

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

	@media screen and ( max-width: @width-breakpoint-tablet ) {
		& {
			flex-direction: column;
		}

		&__label {
			& > label {
				line-height: inherit;
			}
		}
	}
}
</style>
