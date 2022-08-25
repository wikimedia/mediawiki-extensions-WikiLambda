<template>
	<!--
		WikiLambda Vue component for the selection of a ZNaturalLanguage object inside the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-language-selector">
		<template>
			<div class="ext-wikilambda-language-selector__label">
				<label for="ext-wikilambda-language-selector__add-language" class="ext-wikilambda-app__text-regular">
					{{ $i18n( 'wikilambda-languagelabel' ).text() }}
				</label>
			</div>
			<z-object-selector
				class="ext-wikilambda-language-selector__add-language"
				:used-languages="currentZObjectLanguages"
				:type="Constants.Z_NATURAL_LANGUAGE"
				:selected-id="zLanguage"
				:initial-selection-label="getZkeyLabels[ zLanguage ]"
				@input="addNewLang"
			></z-object-selector>
		</template>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

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
	computed: $.extend( mapGetters( [
		'currentZObjectLanguages',
		'getNestedZObjectById',
		'getZkeyLabels'
	] ), {
		Constants: function () {
			return Constants;
		}
	} ),
	methods: $.extend( mapActions( [
		'addZMonolingualString'
	] ), {
		setLocalZLanguage: function ( lang ) {
			this.$emit( 'change', lang );
		},
		addNewLang: function ( zId ) {
			if ( !zId ) {
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
		}
	} )
};
</script>

<style lang="less">
.ext-wikilambda-language-selector {
	&__select {
		min-width: 100px;
	}

	&__label {
		display: flex;
		flex-direction: column;
		width: 153px;
	}
}
</style>
