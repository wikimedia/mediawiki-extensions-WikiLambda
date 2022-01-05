<template>
	<!--
		WikiLambda Vue component for the selection of a ZNaturalLanguage object inside the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-language-selector">
		<select v-model="zLanguage">
			<option
				v-for="language in currentZObjectLanguages"
				:key="language.Z9K1"
				:value="language.Z9K1"
			>
				{{ getZkeyLabels[ language.Z9K1 ] }}
			</option>
		</select>

		<template v-if="showAddLanguage">
			<z-natural-language-selector
				:used-languages="currentZObjectLanguages"
				@input="addNewLang"
			></z-natural-language-selector>
		</template>
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
	props: {
		showAddLanguage: {
			type: Boolean,
			default: true
		}
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

<style lang="less">
.ext-wikilambda-language-selector {
	select {
		background: #f8f9fa;
		border: 1px solid #72777d;
		box-sizing: border-box;
		border-radius: 2px;
		height: 32px;
		padding: 6px 12px 6px 8px;
		font-size: 1em;
		line-height: 1.4em;
	}
}
</style>
