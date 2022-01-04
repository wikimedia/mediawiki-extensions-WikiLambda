<template>
	<!--
		WikiLambda Vue component for the selection of a ZNaturalLanguage object inside the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<select v-model="zLanguage">
			<option
				v-for="language in currentZObjectLanguages"
				:key="language.Z9K1"
				:value="language.Z9K1"
			>
				{{ getZkeyLabels[ language.Z9K1 ] }}
			</option>
		</select>

		<z-natural-language-selector
			:used-languages="currentZObjectLanguages"
			@input="addNewLang"
		></z-natural-language-selector>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZNaturalLanguageSelector = require( '../ZNaturalLanguageSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

module.exports = {
	components: {
		'z-natural-language-selector': ZNaturalLanguageSelector
	},
	computed: $.extend( mapGetters( [
		'currentZObjectLanguages',
		'getCurrentZLanguage',
		'getNestedZObjectById',
		'getUserZlangZID',
		'getZkeyLabels'
	] ), {
		zLanguage: {
			get: function () {
				return this.getCurrentZLanguage;
			},
			set: function ( value ) {
				this.setCurrentZLanguage( value );
			}
		}
	} ),
	methods: $.extend( mapActions( [
		'addZMonolingualString',
		'setCurrentZLanguage'
	] ), {
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
			this.zLanguage = zId;
		}
	} ),
	mounted: function () {
		if ( !this.zLanguage ) {
			this.zLanguage = this.getUserZlangZID;
		}
	}
};
</script>
