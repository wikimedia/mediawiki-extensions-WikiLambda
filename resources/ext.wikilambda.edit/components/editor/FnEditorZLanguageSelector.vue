<template>
	<!--
		WikiLambda Vue component for the selection of a ZNaturalLanguage object inside the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-language-selector">
		<div class="ext-wikilambda-language-selector__label">
			<label for="ext-wikilambda-language-selector__add-language" class="ext-wikilambda-app__text-regular">
				{{ $i18n( 'wikilambda-languagelabel' ).text() }}
			</label>
		</div>
		<z-object-selector
			ref="languageSelector"
			class="ext-wikilambda-language-selector__add-language"
			:used-languages="currentZObjectLanguages"
			:type="Constants.Z_NATURAL_LANGUAGE"
			:selected-id="zLanguage"
			:initial-selection-label="getZkeyLabels[ zLanguage ]"
			@input="addNewLang"
			@focus-out="clearLookupToFallback"
		></z-object-selector>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	mapMutations = require( 'vuex' ).mapMutations;

// @vue/component
module.exports = exports = {
	components: {
		'z-object-selector': ZObjectSelector
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
		'getZkeyLabels',
		'getAllItemsFromListById'
	] ), {
		Constants: function () {
			return Constants;
		}
	} ),
	methods: $.extend( {}, mapActions( [
		'addZMonolingualString',
		'removeZObject',
		'removeZObjectChildren',
		'recalculateZListIndex'
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

			var lang = zId,
				zLabelParentId = this.getNestedZObjectById( 0, [
					Constants.Z_PERSISTENTOBJECT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				] ).id,
				payload = {
					lang: lang,
					parentId: zLabelParentId
				};

			this.addZMonolingualString( payload );
			this.setLocalZLanguage( zId );
		},
		isSelectedLang: function ( zId ) {
			return this.currentZObjectLanguages.some( ( zObjLang ) =>
				zObjLang[ Constants.Z_REFERENCE_ID ] === zId );
		},
		getLanguageLabelId: function ( language ) {
			var labels = this.getAllItemsFromListById(
					this.getNestedZObjectById( 0, [
						Constants.Z_PERSISTENTOBJECT_LABEL,
						Constants.Z_MULTILINGUALSTRING_VALUE
					] ).id ),
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
						this.removeZObjectChildren( label.id );
						this.removeZObject( label.id );
					}
				}.bind( this ) );

				this.recalculateZListIndex( argumentLabelArrayId );

			}.bind( this ) );
		},
		resetNameLabelForLang: function ( zId ) {
			var labelId = this.getLanguageLabelId( zId );

			this.removeZObjectChildren( labelId );
			this.removeZObject( labelId );

			var zLabelParentId = this.getNestedZObjectById( 0, [
				Constants.Z_PERSISTENTOBJECT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			] ).id;
			this.recalculateZListIndex( zLabelParentId );
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
@import '../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-language-selector {
	&__select {
		min-width: 100px;
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
